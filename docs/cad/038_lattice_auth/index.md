# CAD038: Lattice Authentication

## Overview

Lattice Authentication defines how the [Lattice](/docs/cad/data_lattice) validates ownership and authenticity of incoming values during merge operations. Since lattice merges combine data from untrusted sources, every incoming signed value must be verified before it is accepted into the local state.

The authentication model is built into the `OwnerLattice` merge path, operates at O(delta) cost (only verifying entries that differ), and is safe by default: incoming data that cannot be positively verified is rejected.

## Scope

This CAD defines **authorisation semantics**, independently of a particular
component or lattice class hierarchy. [CAD024](/docs/cad/data_lattice) defines
value and merge semantics. [CAD045](/docs/cad/lattice_apps) specifies the normal
implementation through components that bind an owner rule and delegate to reusable
owner and signed lattices. [CAD035](/docs/cad/cursors) supplies storage and signing
view mechanisms; merely navigating a cursor grants no authority.

An abstract Owner Lattice describes per-owner merge semantics. It does not
require map keys to be public keys or require applications to subclass a lattice.
DID interpretation belongs to [CAD043](/docs/cad/did), and account keys and
controllers to [CAD004](/docs/cad/accounts).

## Motivation

The Lattice is a decentralised, multi-writer system. Any node can produce signed values and propagate them to peers. Without authentication, an attacker could:

- **Impersonate an owner** by placing forged data under another owner's key
- **Inject unauthorised data** into an organisation's namespace
- **Corrupt replicated state** by submitting values signed with unrelated keys

Traditional systems solve this with access control at the network boundary. The lattice instead validates at the **merge boundary** — every incoming value is checked against the owner key it claims to belong to, regardless of how it arrived.

This is a fundamental property of the lattice: **merge is the security boundary**.

### Design Principles

1. **Verify on merge** — authentication happens inside the merge operation, not at the transport layer
2. **O(delta) verification** — only changed entries are verified, via the keyed `MergeFunction` in `mergeDifferences`
3. **Safe by default** — an unknown or unresolved owner is rejected. Direct public-key ownership uses equality; indirect ownership requires an explicit authorisation rule
4. **Flexible ownership** — the same lattice structure supports multiple owner identity types without changes to the merge infrastructure

## Specification

### Owner Identity Types

The OwnerLattice maps owner identities to signed values. The owner key determines the verification scheme. Three owner types SHOULD be supported:

| Owner Type | Key Format | Verification | State Required |
|-----------|------------|-------------|----------------|
| Public Key | 32-byte Ed25519 public key | Direct equality with signer | No |
| Convex Address | Address (#0, #1337, etc.) | Account lookup for authorised keys | Yes (CVM State) |
| DID Identifier | String ("did:key:...", "did:convex:...") | DID resolution | Depends on method |

All three types ultimately verify against the Ed25519 public key embedded in the signed data.

Applications MAY add additional methods.

### Verification Flow

For each changed incoming entry, the merge boundary MUST establish:

1. The entry is a signed envelope with an acceptable payload representation.
2. Its signature is valid for that payload and signing public key.
3. That key is authorised for the identity in the map key.

Only then may the value participate in that owner's merge. Implementations may
order these checks for efficiency. Rejected entries leave the established owner
slot unchanged. A malformed containing value may abort the atomic merge.

Whole-map delivery and direct delivery to an owner slot MUST apply the same rule.
An incoming path MUST NOT cross into an unsigned envelope interior. Payload
validation follows the value lattice; Java type parameters do not validate
received cells.

### Keyed Merge

Verification requires access to the map key during merge. The merge infrastructure provides a keyed merge method that receives `(key, ownValue, otherValue)` for each entry that differs between the two maps. This ensures:

- **O(delta) cost** — identical entries are skipped entirely
- **Key availability** — the owner key is passed to the merge function
- **Backward compatibility** — callers not using keyed merge are unaffected

### Owner Verifier

An ownership boundary binds a verifier: a predicate taking `(ownerIdentity, signerKey)` and returning whether that key is authorised for the owner. In the component implementation, the component supplies the rule and binds it to its owner lattice; context supplies signing capabilities rather than replacing the rule. This supports:

- **Single-key owners** — one public key per owner
- **Multi-key owners** — organisations with multiple authorised signers
- **Key rotation** — verification against current state, not historical keys
- **Revocation** — removed keys fail subsequent incoming verification and local authoring under the updated policy; previously accepted state is not automatically deleted

#### Public Key Owners

For 32-byte public key owners, verification is a direct equality check:

```
ownerKey == signerKey
```

This is handled inline without consulting the verifier, as it requires no external state.

#### Address Owners

For Convex Address owners, the verifier looks up the account in CVM state. An account may have multiple authorised keys (e.g. an organisation with several administrators). Any authorised key can sign data for that address.

#### DID Owners

For string owners containing DID identifiers, the verifier resolves the DID:

| DID Method | Resolution |
|-----------|-----------|
| `did:key:z6Mk...` | Extract Ed25519 public key from multibase encoding |
| `did:convex:1337` | Resolve account identity and authorised keys under CAD043 and CAD004 |
| `did:web:example.com` | Fetch DID document, extract verification methods |

The `did:key:` method is a pure computation. Stateful methods may require network or state lookups; resolve and refresh that information outside atomic merge callbacks. Verifiers used by shared components MUST be thread-safe and use the available authority view. These examples do not replace the method and verification-relationship rules in CAD043.

### Safety Properties

The authentication model is safe by default:

1. **No verifier, blob owner** — direct equality check, always deterministic
2. **No verifier, indirect owner** — reject; the normal owned-map components require an explicit verifier
3. **Verifier present, verification fails** — merge rejected, own value preserved
4. **Verifier present, verification passes** — proceed to signature check
5. **Signature invalid** — merge rejected by SignedLattice
6. **Authorisation, signature and payload validation pass** — value may participate in its owner-slot merge

The two-layer check (owner authorisation + signature validity) means:
- A valid signature alone is not sufficient — it must be from an authorised signer
- Owner authorisation alone is not sufficient — the data must actually be signed

### Merge Direction

Only **incoming** (foreign) values are verified. The local node's own values are trusted:

```
merge(ownValue, otherValue)
       ↑              ↑
    trusted      verified
```

This is consistent with the lattice merge model where `ownValue` represents the node's current state and `otherValue` is received from the network.

### Authoring and synthesised values

Standard local authoring MUST use the same owner rule as incoming verification.
Signing capability alone is not authorisation. An existing envelope selected by
merge retains its signature. A merge that synthesises a different payload MUST
produce a new authorised signature before storing it as that owner's value. If
the implementation cannot author the result, it retains its established value;
convergence requiring synthesis is then for an authorised participant to complete.

## Lattice Composition

The abstract composition is an owner map whose entries are signed values governed
by a payload lattice. It describes semantics independently of storage wrappers.
The usual Java implementation is an `OwnedMap` or `OwnedIndex` component using an
instance-bound owner lattice. `KeyOwnedIndex` supplies public-key equality.

Owned-map components merge and reconcile publication conflicts using public
information only. They MUST NOT resolve private signing capabilities. If merging
would require a newly signed payload, they retain the established envelope until
an authorised component authors a result. Components which re-sign MUST define
an explicit key-resolution strategy; the containing map supplies no implicit
signer. This is separate from the public verifier which determines which keys
are authorised for an owner.

Signed domain components and independent `SignedComponent` drafts
are specified in CAD045. CAD038 governs authorisation for both. They take an
explicit signer function, which may resolve keys when called, without requiring
a signing context. Its returned envelope MUST contain exactly the requested
payload, a valid signature and an authorised signer. The public owner verifier
remains authoritative regardless of the signing capability supplied. A draft may
remain unsigned while private; publication into a signed slot requires an
authorised envelope.

The older Java `OwnerLattice` API resolves its owner rule from the merge context
rather than binding it to the lattice instance. Without a context verifier it
applies the same fail-closed default: an owner that directly denotes an account
key, such as a public key or `did:key` DID, must be the signer, and any other
owner is refused. New applications SHOULD use the owned-map components, which
require a verifier at construction.

## UCAN Capability Tokens

Lattice Authentication provides the foundation for **UCAN (User Controlled Authorisation Network)** tokens — signed JWTs that encode delegated capabilities from an issuer to an audience.

### Token Structure

A UCAN token is a JWT with the following claims:

| Claim | Description |
|-------|-------------|
| `iss` | Issuer DID (who is delegating) |
| `aud` | Audience DID (who receives the delegation) |
| `exp` | Expiry timestamp (token invalid once `exp <= now`); required, `null` for a token that never expires |
| `nbf` | Not-before timestamp (token inactive until `nbf <= now`); optional |
| `att` | Attenuations — vector of capabilities |
| `prf` | Proof chain — vector of parent UCAN tokens |
| `nnc` | Nonce for uniqueness; optional |

### JWT Encoding

UCAN tokens can be encoded as standard JWTs with EdDSA signatures:

```
Header:  {"alg": "EdDSA", "typ": "JWT"}
Payload: {"ucv": "0.10.0", "iss": "did:key:z6Mk...", "aud": "did:key:z6Mk...", "exp": 1718000000, "att": [...], "prf": [...]}
Signature: Ed25519 signature over header.payload
```

The `ucv` claim names the Convex UCAN profile version and must be exactly `0.10.0`.

The `toJWT()` and `fromJWT()` methods convert between UCAN objects and JWT strings.

The signature is **always verified against the Ed25519 public key bound in the `iss` DID** — the `did:key` in the payload encodes the issuer's key directly, so the key that must validate a token is fixed by the token's own issuer claim. The sender-controlled JWT `kid` header MUST NOT be used to select the verification key: trusting `kid` would let an attacker sign with their own key, name any issuer in `kid`, and thereby forge that issuer's identity.

### Capabilities

Each attenuation in the `att` array is a capability with two fields:

```json
{ "with": "did:key:z6Mk.../kv/mydb/", "can": "crud/read" }
```

- **`with`** — a DID-scoped resource path (see below)
- **`can`** — an ability in a slash-delimited hierarchy

Per [UCAN], `with` is a resource pointer in URI form and the scheme set is **open** — a validator MUST NOT reject a token merely because it cannot interpret a resource. Convex **profiles** this rather than restricting it: resources that Convex itself anchors and delegates are named as **DID-scoped paths** (§[Resource Ownership](#resource-ownership-and-root-authority)). Utility code tolerates any UCAN-legal `with`; the profile governs which resources Convex can anchor to a trusted root, not which tokens are well-formed. A resource whose scheme yields no derivable owner is not rejected — it simply grants nothing, fail-closed at the capability rather than the token.

A capability covers a request only if **both** its `with` covers the request's resource **and** its `can` covers the request's ability.

**Resource matching (`with`)** is path-prefix matching at path-segment boundaries — never a raw string prefix:

- **Exact match** — `w/decisions` covers `w/decisions`
- **Prefix at a segment boundary** — `w/decisions` covers `w/decisions/INV-123`, because the match ends on a `/` boundary. It does **not** cover the sibling `w/decisions-secret`, even though that shares the textual prefix
- **Trailing slash** — `w/decisions/` covers both its children and the bare parent `w/decisions`

**Fail-closed:** a null or empty `with` (or an empty request resource) covers **nothing**. Absence is never a resource wildcard — a resource wildcard must be stated explicitly, never inferred from a missing or truncated capability.

**Ability matching (`can`)** follows the same segment-boundary rule: the wildcard ability `*` covers any ability; otherwise the grant matches on an exact ability, or a prefix that ends on a `/` boundary (`crud` covers `crud/read`, but not a hypothetical `crudX`).

### Standard Abilities

```
crud                (any CRUD operation)
├── crud/read
├── crud/write
└── crud/delete

convex              (Convex-specific)
├── convex/transfer
├── convex/call
└── convex/deploy

*                   (wildcard — covers any ability)
```

### Attenuation Rule

Delegated capabilities can only narrow the grantor's authority — the delegate's resource MUST be covered by the grantor's under the segment-boundary rule above (a genuine sub-path, not merely a textual prefix), and the delegate's ability MUST be a sub-ability. This ensures capability chains are monotonically decreasing in scope.

### Validation

UCAN tokens are validated by checking:

1. **Signature** — the EdDSA signature is valid against the public key bound in the token's `iss` DID (never the `kid` header). Signatures are verified once, at the transport boundary.
2. **Temporal bounds** — the token is within its validity window: `exp` is `null` or `exp > now` (not expired) and, if present, `nbf <= now` (already active). Temporal bounds are re-checked at the point of use, after the boundary signature check, so a token that expires in flight is rejected on use.
3. **Capabilities** — each capability in `att` is covered by the issuer's own authority, under the resource and ability matching rules above.
4. **Proof chain** — every parent token in `prf` is validated recursively, including its temporal bounds at the point of use, and each link is well-formed: `proof.aud == token.iss` (the parent delegated to this issuer).

Temporal validity follows UCAN 1.0 execution-time semantics: links in a chain may carry different validity periods, but every link must be valid when the authority is exercised, so a chain is usable from its latest `nbf` to its earliest non-null `exp`. A child's window need not lie within its parent's. This deliberately departs from the UCAN 0.10.0 containment rule, despite the `0.10.0` profile version.

Audience and issuer matching (e.g. `aud == caller DID`) is an **application policy** decision layered on top of these mandatory cryptographic, temporal, and chain-linkage checks — the core validator enforces proof-chain linkage but leaves audience acceptance to the caller.

### Resource Ownership and Root Authority

Resource URIs use DID paths for cross-user scoping. The **DID prefix names the resource owner**; the path scopes within it:

```
did:key:z6MkAlice.../dlfs/docs/specs     ← owned by did:key:z6MkAlice...
did:key:z6MkAlice.../w/vendor-records
```

This enables fine-grained delegation across user boundaries while maintaining the lattice's per-owner signing model.

**Why a DID-scoped profile.** A delegation chain is only trustworthy if its *root* is signed by an authority entitled to grant the resource. Establishing that authority requires knowing who owns the resource — which an opaque URI (`https:`, `mailto:`, application-custom) does not reveal. Naming the owner *inside* the resource lets any verifier check the root without a shared registry: offline for self-sovereign owners, and via a pluggable trust policy for custodial ones. Schemes that do not name an owner remain UCAN-legal and are not rejected, but Convex cannot anchor them to a root on its own.

**How ownership is anchored.** For a DID-scoped `with`, the owner is the DID part of the resource (path and fragment stripped; DIDs compared canonically, not by raw string). The **root** of any chain granting that resource (the token with an empty `prf`) MUST be signed by the owner's controlling authority:

- **self-sovereign owner** (`did:key`, self-certifying; `did:web`, domain-resolved) — the owner signs their own root, so the root issuer's DID equals the owner's DID. Verifiable offline; no policy required.
- **custodial owner** (an identity a hosting node or venue controls) — the controlling authority signs an attestation on the owner's behalf, accepted only if the verifier's trust policy accepts that authority for that owner.

The verifier resolves the root issuer's key through a DID resolver (`did:key` computed inline; other methods pluggable and expected to return only cryptographically-authenticated keys) and checks the root signature against it. The **mechanism** — chain walk, signature verification, key resolution, and the self-sovereign base case (root issuer == owner) — is fixed and shared. The **policy** — owner-derivation for non-`did:` schemes, and which custodial authorities are trusted — is supplied by the caller. No application re-implements chain-walking, signature verification, or resolution.

**Fail-closed granularity.** A capability whose resource cannot be anchored to an accepted root grants nothing. This is per-capability: the token stays valid and its other, anchorable capabilities remain usable — satisfying the UCAN requirement not to reject uninterpretable resources while never conferring unanchored authority.

## Security Considerations

The two-layer verification model defends against several attack vectors:

| Attack | Defence |
|--------|---------|
| **Impersonation** — attacker signs data and places under victim's owner key | Owner verification rejects: signer not authorised for owner |
| **Replay** — attacker replays victim's signed data under attacker's owner key | Owner verification rejects: victim's key not authorised for attacker's owner |
| **Signature forgery** — attacker creates data with invalid signature | SignedLattice rejects: Ed25519 signature check fails |
| **Key confusion** — valid signature but embedded key differs from owner | Owner verification rejects: embedded signer key != owner key (for public key owners) |
| **Issuer spoofing** — attacker signs a UCAN with their own key and names a victim in the `kid` header | Verification key is bound to the `iss` DID's embedded public key; the `kid` header is ignored, so a token only validates for the key that actually signed it |
| **Capability prefix escape** — a grant on `w/notes` is abused to reach the sibling `w/notesSECRET` | Resource matching is path-segment-boundary aware; a shared textual prefix does not cover a sibling resource |
| **Fail-open delegation** — a truncated or empty `with` is treated as an implicit wildcard | Empty or absent resources fail closed and cover nothing; wildcards must be explicit |
| **Rogue root** — attacker roots a delegation chain over a victim's resource, signed with their own key | Root authority: the root issuer MUST be the resource owner (self-sovereign) or an authority the trust policy accepts for that owner (custodial); a resource that cannot be anchored to an accepted root grants nothing |

Production deployments SHOULD always configure an owner verifier for Address and DID owners. Without a verifier, these owner types fall back to lenient mode (accept all), which is suitable only for development and testing.

## Reference Implementation

The reference implementation is in the Convex `convex-core` module (Java).

### Classes

| Concept | Class | Package |
|---------|-------|---------|
| Keyed merge function | `MergeFunction` | `convex.core.util` |
| Owned-map components | `OwnedMap`, `OwnedIndex`, `KeyOwnedIndex` | `convex.lattice` |
| Component capabilities | `LatticeContext` | `convex.lattice` |
| Instance-bound owner rules | `OwnerMapLattice`, `OwnerIndexLattice`, `OwnerKeyLattice` | `convex.lattice.generic` |
| Legacy context-verified owner map | `OwnerLattice` | `convex.lattice.generic` |
| Signed value merge | `SignedLattice` | `convex.lattice.generic` |
| O(delta) map merge | `AHashMap.mergeDifferences` | `convex.core.data` |
| UCAN capability & resource/ability matching | `Capability` | `convex.auth.ucan` |
| UCAN token (JWT encode/decode, `iss`-bound signature) | `UCAN` | `convex.auth.ucan` |
| UCAN validation (temporal bounds, proof chain) | `UCANValidator` | `convex.auth.ucan` |

The `OwnerLatticeTest` class provides comprehensive test coverage including adversarial scenarios (impersonation, replay attacks, signature forgery).

### Example: Setting Up Owner Verification

This complete local example supplies a verifier to a component. The example DID
and authority predicate are test fixtures, not an implementation of a DID method.
A deployed resolver follows CAD043 and supplies its authority view here.

```java
import convex.core.crypto.AKeyPair;
import convex.core.data.AString;
import convex.core.data.AccountKey;
import convex.core.data.Strings;
import convex.core.data.prim.AInteger;
import convex.core.data.prim.CVMLong;
import convex.lattice.OwnedIndex;
import convex.lattice.cursor.Root;
import convex.lattice.generic.MaxLattice;

public class OwnerExample {
    public static void main(String[] args) {
        var key = AKeyPair.createSeeded(4101);
        AString owner = Strings.create("did:example:team");
        var scores = new OwnedIndex<AString, AInteger>(
            new Root<>(), MaxLattice.INSTANCE,
            (AString identity, AccountKey signer) ->
                owner.equals(identity) && key.getAccountKey().equals(signer));
        var incoming = key.signData(CVMLong.ONE);
        scores.mergeAt(incoming, owner);
        if (!incoming.equals(scores.get(owner))) throw new AssertionError();
        scores.sync();
    }
}
```

## See Also

- [CAD002: CVM Values](/docs/cad/values) — Value types including AccountKey and Address
- [CAD024: Lattice](/docs/cad/data_lattice) — Lattice merge foundations
- [CAD035: Lattice Cursors](/docs/cad/cursors) — Cursor system and LatticeContext
- [CAD036: Lattice Node](/docs/cad/lattice_node) — Network replication where authentication is applied
- [CAD037: KV Database](/docs/cad/kv_database) — KV store using OwnerLattice authentication
