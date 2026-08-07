---
slug: account-dids
title: "Every account gets a DID"
authors: [mikera, claude]
tags: [convex, security, ucan]
---

Decentralised Identifiers (DIDs) are the W3C's answer to "who are you?" without a central registry — and Convex accounts turn out to be unusually good DID subjects: stable, cryptographically controlled, with key rotation and recovery already built into the account model. The [CAD043](/docs/cad/did) specification makes that identity story official, and a wave of implementation is landing across the peer, GUI and MCP tools for the next release. Here's where it stands.

<!-- truncate -->

## Three methods, one identity model

**`did:convex` — the native method.** Any account is a DID by number: `did:convex:13` is account `#13`, stable for the account's lifetime, with authentication by its Ed25519 key and rotation under the account's own authority. Human-readable **named DIDs** resolve through the [Convex Name System](/docs/cad/cns): `did:convex:id.foo` or `did:convex:user.mike`. The two forms coexist without ambiguity because purely numeric top-level CNS names cannot be created — a permanent governance invariant, so a number is always an address and a name is always a name.

Named DIDs are honest about what they are: **mutable aliases**. The controller of the name can repoint it — that mutability is exactly what makes recovery and delegation work — so the resolved DID document lists the stable account DID in `alsoKnownAs`, and verifiers needing a fixed subject pin that.

**`did:key` — the bridge.** A `did:key` identifier is derived from a bare Ed25519 public key, no on-chain registration required — and the same key can *be* a Convex account key. An agent can mint an off-chain identity in microseconds, receive delegations against it, and later attach the very same key to an on-chain account. This is the identity shape our [UCAN authorisation](/blog/hardening-ucan) layer ([CAD038](/docs/cad/lattice_auth)) delegates to.

**`did:web` — the compatibility layer.** When a `did:web` identifier points at a Convex peer — `did:web:peer.convex.live:user.mike` — the peer resolves it against on-chain state and returns a standard DID document over plain HTTPS. Any DID-aware system can resolve Convex identities with no Convex tooling at all.

## Shipped and shipping

Some of this is already in your hands: 0.8.9 shipped pluggable DID chain verification for UCAN delegations (`DIDVerifier`, with per-hop attenuation and self-sovereign root-authority checks) and delegated drive references addressed by DID URL (`did:key:zOwner.../drive`).

On the develop branch for the next release:

- Named `did:web` documents resolve CNS account aliases and scoped `convex.did` registry records; deactivated records answer with HTTP `410` and DID document metadata, per the W3C deactivation model.
- UCAN payload builders and the MCP `signingDelegate` tool accept audiences in **any** valid DID method, while keeping `did:key` and raw-hex compatibility.
- Convex Desktop surfaces identity where you work with keys: generated keys, keyring entries and account overviews show their canonical `did:key` identifier with one-click copy, and the Hacker Tools include a keyring-backed JWT/UCAN builder for issuing EdDSA tokens and Convex UCAN delegations to any valid DID, with decoded output inspection.

## Why it matters

Identity is the missing half of the agent story. Payments ([x402](/blog/x402-preview)) let a machine *spend*; DIDs and UCAN delegation let a machine *be someone* — hold an identity, receive narrowly-scoped authority, and prove both to third parties using open W3C standards rather than platform accounts. The full method semantics, document formats and security analysis (including why named DIDs must not be treated as stable subjects) are in [CAD043](/docs/cad/did).
