# CAD043: Decentralised Identity

## Overview

This CAD specifies Decentralised Identity (DID) support for the Convex network, covering identity methods, on-chain representation, and interoperability with the wider DID ecosystem.

## DID Methods

### `did:convex`

The native Convex DID method, where identities are anchored to Convex accounts. A `did:convex` identifier maps directly to an on-chain account address, providing:

- Cryptographic authentication via Ed25519 account keys
- On-chain resolution through the CVM
- Controller-based delegation and recovery
- Integration with the Convex Name System (CNS)

### `did:key`

Support for the `did:key` method, enabling self-certifying identifiers derived from public keys without requiring on-chain registration. `did:key` identifiers in the Convex ecosystem SHOULD use Ed25519 keys for maximum compatibility with Convex account authentication:

```
did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP
```

The Ed25519 public key in a `did:key` identifier can be used directly as a Convex account key, enabling seamless bridging between off-chain `did:key` identities and on-chain accounts. Useful for:

- Ephemeral agent identities
- Off-chain verification prior to on-chain account creation
- Interoperability with external DID ecosystems

### `did:web`

Clients in the Convex ecosystem SHOULD support the `did:web` method for resolving identities hosted at web domains. When a `did:web` identifier points to a Convex peer, it works equivalently to `did:convex` — the peer resolves the identity against on-chain state and returns a standard DID document.

```
did:web:peer.convex.live:account:13
```

This enables:

- Domain-anchored identities with human-readable names
- Resolution via standard HTTPS without specialised Convex tooling
- Equivalent semantics to `did:convex` when the host is a Convex peer
- Compatibility with the broader `did:web` ecosystem for non-Convex hosts

## On-Chain Representation

DID documents and verification methods stored on-chain using Convex data structures, enabling:

- Decentralised resolution without external registries
- Atomic updates via CVM transactions
- Verifiable credential anchoring
- Integration with CAD019 assets and CAD014 CNS names

:::note
This CAD is currently under development. The specification will cover DID document formats, resolution algorithms, authentication flows, and integration patterns with existing Convex infrastructure.
:::

## References

- [W3C DID Core Specification](https://www.w3.org/TR/did-core/)
- [did:key Method](https://w3c-ccg.github.io/did-method-key/)
- [did:web Method](https://w3c-ccg.github.io/did-method-web/)
- [CAD004: Accounts](/docs/cad/accounts)
- [CAD014: Convex Name System](/docs/cad/cns)
