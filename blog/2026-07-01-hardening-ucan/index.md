---
slug: hardening-ucan
title: "Hardening UCAN: closing an issuer spoof and a capability escape"
authors: [mikera, claude]
tags: [convex, security, ucan, did, lattice]
---

Convex 0.8.6 closes three authentication and merge-path weaknesses in the
lattice's capability layer. Two of them were genuine bypasses in how UCAN
tokens are verified and how capabilities are matched; the third turns a
merge over untrusted data from a potential denial of service into a safe
no-op. None of them are exotic — they are the kind of boundary bugs that
hide in any authorisation system — and the fixes are worth writing down
because the *shape* of each mistake is instructive.

<!-- truncate -->

Convex uses [UCAN](/docs/cad/lattice_auth) (User Controlled
Authorisation Networks) for delegated, capability-based access to lattice
resources. A UCAN is a signed token that says "the holder of this key may
perform these abilities on these resources", and tokens can be chained so
that authority is delegated and *attenuated* — narrowed — at each hop. Two
things have to be watertight for that to mean anything: **who signed the
token**, and **exactly which resources a capability covers**. Both had a
gap.

## Bug 1: trusting the `kid` header (issuer spoofing)

A UCAN can be encoded as a JWT. A JWT has a header, a payload and a
signature, and the header conventionally carries a `kid` ("key id") field
naming the key that signed it. The payload carries the UCAN's `iss`
(issuer) claim — a `did:key` DID that *embeds* the issuer's Ed25519 public
key directly in the identifier.

The bug was subtle: verification was keyed off the `kid` header. But the
header is attacker-controlled — it is just data the sender chose. So an
attacker could:

1. Generate their own key pair.
2. Sign a token with *their* key.
3. Set `iss` to a victim's DID and point `kid` at their own key.

If the verifier resolves the signing key from `kid`, the signature checks
out — against the attacker's key — and the token is accepted as though the
victim issued it. That is a total issuer-spoofing bypass: any issuer could
be forged.

The fix is to ignore `kid` entirely and derive the verification key from
the token's own `iss` DID:

```java
public boolean verifySignature() {
    AccountKey issKey = getIssuerKey();   // decoded from the iss did:key
    if (issKey == null) return false;
    return signature.verify(message, issKey);
}
```

Because a `did:key` *is* the public key (multibase-encoded), the key that
must validate a token is fixed by the token's issuer claim and nothing
else. There is no longer any sender-controlled input in the choice of
verification key. A token now only validates for the key that actually
signed it — name whoever you like in `kid`, it is never consulted.

The lesson is an old one: **never let the untrusted side of a boundary
choose which key verifies it.** The identifier and the key must be bound
together, and here the binding already existed in `iss` — we were just
reading the wrong field.

## Bug 2: string prefixes are not path prefixes (capability escape)

Capabilities scope authority to a resource path, for example
`w/decisions` for a workspace's decisions. Delegation attenuates: a child
token may only cover a sub-path of its parent. So the core question a
verifier asks constantly is *"does grant `w/decisions` cover request
`R`?"*

The original rule was a plain string prefix test. And a string prefix is
**not** a path prefix. `w/decisions` is a textual prefix of both:

- `w/decisions/INV-123` — a genuine child, which *should* be covered, and
- `w/decisionsSECRET` — an unrelated sibling, which absolutely should not.

A grant on `w/decisions` therefore leaked authority over
`w/decisionsSECRET`. Same class of bug as a naive `startsWith` check on a
URL path or a filesystem prefix — the boundary between path segments got
lost.

The fix makes resource matching aware of segment boundaries. A grant
covers a request when they are equal, or when the grant is a prefix that
lands on a `/` boundary:

```java
public static boolean resourceCovers(AString grant, AString request) {
    // Fail-closed: a missing/empty resource pointer grants nothing.
    if (grant == null || request == null) return false;
    long gLen = grant.count(), rLen = request.count();
    if (gLen == 0 || rLen == 0) return false;

    if (grant.equals(request)) return true;                 // exact

    // "w/records/" also covers the bare parent "w/records"
    if (grant.charAt(gLen - 1) == '/' && rLen == gLen - 1
            && request.equals(grant.slice(0, gLen - 1))) return true;

    // Prefix, but only at a segment boundary: "w/notes" covers "w/notes/x"
    // but NOT the sibling "w/notesSECRET".
    if (rLen > gLen && request.startsWith(grant)
            && (grant.charAt(gLen - 1) == '/' || request.charAt(gLen) == '/'))
        return true;

    return false;
}
```

Ability matching (`can`) got the same treatment — `crud` covers
`crud/read` but not a hypothetical `crudX`, and the explicit wildcard `*`
still covers everything.

### The fail-open half

There was a second, quieter half to this. What should an *empty or absent*
`with` resource cover? The safe answer is **nothing** — absence is not a
wildcard. Previously a truncated or missing resource pointer could be
treated permissively, which is exactly backwards for a security check.
Matching now fails closed:

```java
// A grant with no resource pointer (null/empty `with`) covers nothing —
// absence is NOT a resource wildcard. Wildcards must be explicit.
if (!resourceCovers(grantWith, requestWith)) return false;
```

A capability now has to *say* it grants a wildcard; you can never reach one
by leaving a field blank or letting a value get truncated.

## Bug 3: a merge that trusts its inputs (fail-closed DLFS)

The third fix is not about tokens but about the same principle applied to
data. The [Decentralised Lattice File System](/docs/cad/dlfs) merges
directory trees received from other peers. Merge is the lattice's security
boundary — it is where untrusted data from the network meets local state —
so it has to cope with values that are not just wrong but *malformed*.

A hostile or corrupt peer could send a node that isn't a well-formed DLFS
node at all. If the merge simply assumed structure and threw, a single bad
value could abort the merge — a denial of service on the sync path.

The merge now validates incoming foreign nodes (a vector, the required
elements, a `Long` timestamp, and — if present — a non-empty tombstone
index) and, crucially, **fails closed** to the local value if anything is
wrong:

```java
// Merge combines data from untrusted peers. A malformed foreign node
// falls back to the local ("own") value rather than throwing.
try {
    return DLFSNode.merge(context, own, other);
} catch (Exception e) {
    return own;   // ignore the bad value; never crash, never corrupt
}
```

A malformed value can now neither crash the merge nor corrupt merged
state. It is simply ignored, and convergence continues from good data.

## The common thread

Three bugs, one boundary principle. Authentication and merge are both
places where the untrusted side of a boundary hands you data, and in each
case the fix was to stop trusting something the attacker controls:

- Don't let the sender pick the verification key (`kid` → `iss`).
- Don't let a textual prefix stand in for a path prefix, and don't let an
  empty field mean "everything" (segment-aware, fail-closed matching).
- Don't let a malformed foreign value do anything worse than be discarded
  (fail-closed merge).

The public capability specification — [CAD038: Lattice
Authentication](/docs/cad/lattice_auth) — now describes the secure
semantics directly, so the spec and the implementation say the same thing.
If you are building on Convex's UCAN layer, upgrading to 0.8.6 is
recommended.
