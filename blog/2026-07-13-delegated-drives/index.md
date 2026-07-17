---
slug: delegated-drives
title: "A drive you can hand to an agent"
authors: [mikera, claude]
tags: [convex, dlfs, ucan, did, agents, security]
---

A problem every team deploying AI agents hits early: you want
an agent to read *one* folder of documents — not your whole drive, not
forever, and revocably. With Convex 0.8.8, DLFS drives can be shared exactly
that way: a signed capability naming a **DID URL** like
`did:key:z6Mk<alice>/dlfs/docs`, delegatable in chains, attenuated at every
hop, verified against any DID method — and no central account system
anywhere.

<!-- truncate -->

## Identity without registration

Every DLFS caller authenticates with an Ed25519 JWT; the token's DID *is*
the identity. There's no signup step because there's nothing to sign up to —
a key pair is an identity, and each identity gets its own drive namespace.
The same model covers both access surfaces: WebDAV (mount a drive in your
file manager) and MCP (hand tools to an AI agent).

Your own drives need nothing more. The interesting part is everyone else's.

## Capabilities, not accounts

Cross-user access uses [UCAN](/docs/cad/lattice_auth) capability tokens. If
Alice wants an agent to read her `docs` drive, she signs a token granting
exactly that:

```json
{
  "iss": "did:key:z6Mk<alice>",
  "aud": "did:key:z6Mk<agent>",
  "att": [{ "with": "did:key:z6Mk<alice>/dlfs/docs",
            "can":  "crud/read" }],
  "exp": 1775064015
}
```

Note what the resource URI names: **the owner, not a server**. A DID URL
scopes into Alice's namespace wherever it's hosted — the capability stays
meaningful if the drive moves. The root of trust is Alice's own key: no
registry to consult, no administrator who can re-issue access behind her
back.

## Delegation chains, attenuated at every hop

New in 0.8.8: full **delegation chains**. The agent Alice authorised can
re-delegate to a sub-agent by issuing its own UCAN with Alice's grant
attached as proof — and the verifier now enforces **attenuation at every
hop**: each link in the chain can only narrow what the previous link
granted, never widen it. A `crud/read` on `/dlfs/docs` can become a
`crud/read` on `/dlfs/docs/reports` downstream; it can never grow into a
write, or escape into a sibling drive.

Verification is pluggable too — a `DIDVerifier` interface resolves and
checks issuer keys per DID method, with `did:key` supported out of the box,
so organisations can bring `did:web` or on-chain
[Convex DIDs](/docs/cad/did) without touching the enforcement logic. The
root-authority policy is equally explicit: a chain is only valid if it
terminates at the DID that owns the resource.

## Why it matters

Agent ecosystems mostly reinvent access control as long-lived API keys.
Capability tokens over content-addressed, replicated storage are
a fundamentally better substrate: grants are scoped, expiring,
offline-verifiable and machine-composable — an agent can *prove* what it's allowed
to touch before it touches it. Combined with DLFS's lattice replication,
Alice's `docs` drive and the capability to read it can both travel
peer-to-peer, with no service in the middle.

Details live in the
[DLFS authentication docs](https://github.com/Convex-Dev/convex/blob/develop/convex-dlfs/docs/DLFS_AUTH.md)
and [CAD038](/docs/cad/lattice_auth). A file system where sharing means
signing, and where an AI agent can be trusted with exactly one folder and
nothing else — we suspect a lot of agent infrastructure ends up being
built this way.
