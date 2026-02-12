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

Support for the `did:key` method, enabling self-certifying identifiers derived from public keys without requiring on-chain registration. Useful for:

- Ephemeral agent identities
- Off-chain verification
- Interoperability with external DID ecosystems

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
- [CAD004: Accounts](/docs/cad/accounts)
- [CAD014: Convex Name System](/docs/cad/cns)
