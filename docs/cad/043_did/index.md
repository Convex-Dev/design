# CAD043: Decentralised Identity

## Overview

This CAD specifies Decentralised Identity (DID) support for the Convex network, covering identity methods, on-chain representation, and interoperability with the wider DID ecosystem.

## DID Methods

### `did:convex`

The native Convex DID method, where identities are anchored to Convex accounts. A `did:convex` identifier is either a numeric account address or a CNS name:

```
did:convex:13
did:convex:user.mike
```

The method-specific identifier is self-describing: purely numeric identifiers resolve to account addresses (`#13`), while non-numeric identifiers resolve as Convex Name System names. No prefix is needed to distinguish the two forms.

Convex models a single universal global state, so `did:convex` identifiers contain no network qualifier. Resolvers are configured to point at the appropriate network — by default the Convex mainnet. For testing, a resolver can be pointed at a testnet or local peer without changing the identifiers themselves.

Key properties:

- Cryptographic authentication via Ed25519 account keys
- On-chain resolution through the CVM
- Controller-based delegation and recovery
- Human-readable identifiers via the Convex Name System (CNS)

### `did:key`

Support for the `did:key` method, enabling self-certifying identifiers derived from public keys without requiring on-chain registration. `did:key` identifiers in the Convex ecosystem SHOULD use Ed25519 keys for maximum compatibility with Convex account authentication:

```
did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP
```

The Ed25519 public key in a `did:key` identifier can be used directly as a Convex account key, enabling seamless bridging between off-chain `did:key` identities and on-chain accounts. Useful for:

- Ephemeral agent identities
- Off-chain verification prior to on-chain account creation
- Interoperability with external DID ecosystems

See the [did:key Method Specification](https://w3c-ccg.github.io/did-method-key/) for the full method definition.

### `did:web`

Clients in the Convex ecosystem SHOULD support the `did:web` method for resolving identities hosted at web domains. When a `did:web` identifier points to a Convex peer, it works equivalently to `did:convex` — the peer resolves the identity against on-chain state and returns a standard DID document.

```
did:web:peer.convex.live:13
did:web:peer.convex.live:user.mike
```

This enables:

- Domain-anchored identities with human-readable names
- Resolution via standard HTTPS without specialised Convex tooling
- Equivalent semantics to `did:convex` when the host is a Convex peer
- Compatibility with the broader `did:web` ecosystem for non-Convex hosts

Convex peers SHOULD serve DID documents at the standard `did:web` resolution paths:

- `GET /.well-known/did.json` — the peer's own DID document
- `GET /{identifier}/did.json` — DID document for a specific account

See the [did:web Method Specification](https://w3c-ccg.github.io/did-method-web/) for the full method definition.

## DID Documents

A Convex DID document follows the [W3C DID Core](https://www.w3.org/TR/did-core/) structure. For user accounts with an Ed25519 key, the document includes a verification method and authentication relationship:

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:web:peer.convex.live:13",
  "controller": "did:web:peer.convex.live:13",
  "verificationMethod": [{
    "id": "did:web:peer.convex.live:13#key-1",
    "type": "Ed25519VerificationMethod2020",
    "controller": "did:web:peer.convex.live:13",
    "publicKeyMultibase": "z6Mkf5rGMoatrSj1..."
  }],
  "authentication": ["did:web:peer.convex.live:13#key-1"],
  "alsoKnownAs": [
    "did:convex:13",
    "did:key:z6Mkf5rGMoatrSj1..."
  ]
}
```

### `alsoKnownAs`

DID documents SHOULD include an [`alsoKnownAs`](https://www.w3.org/TR/did-core/#also-known-as) property linking equivalent identifiers across methods:

- **`did:convex`** — always included, mapping to the canonical on-chain account address
- **`did:key`** — included when the account has an Ed25519 public key, using the [multicodec](https://github.com/multiformats/multicodec) prefix `0xed01` for Ed25519

This enables verifiers to confirm that a `did:web`, `did:convex`, and `did:key` identifier all refer to the same subject.

### Actor Accounts

Actor accounts (smart contracts) do not have public keys. Their DID documents contain `id`, `controller`, and `alsoKnownAs` (with `did:convex`) but omit `verificationMethod` and `authentication`.

## On-Chain Representation

DID documents and verification methods stored on-chain using Convex data structures, enabling:

- Decentralised resolution without external registries
- Atomic updates via CVM transactions
- Verifiable credential anchoring
- Integration with CAD019 assets and CAD014 CNS names

:::note
This CAD is currently under development. The specification will be extended to cover DID document storage on-chain, resolution algorithms for `did:convex`, authentication flows, and verifiable credential anchoring.
:::

## References

- [W3C DID Core Specification](https://www.w3.org/TR/did-core/)
- [did:key Method](https://w3c-ccg.github.io/did-method-key/)
- [did:web Method](https://w3c-ccg.github.io/did-method-web/)
- [CAD004: Accounts](/docs/cad/accounts)
- [CAD014: Convex Name System](/docs/cad/cns)
