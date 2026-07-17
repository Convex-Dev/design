# CAD043: Decentralised Identity

## Overview

This CAD specifies Decentralised Identity (DID) support for the Convex network, covering identity methods, on-chain representation, and interoperability with the wider DID ecosystem.

## DID Methods

### `did:convex`

The native Convex DID method. A `did:convex` identifier is either a numeric account address or a CNS name:

```
did:convex:13
did:convex:id.foo
did:convex:user.mike
```

The method-specific identifier is self-describing:

- **Purely numeric identifiers** resolve to account addresses (`did:convex:13` → account `#13`). These are **account DIDs**: the DID subject is the account itself, stable for the lifetime of the account, with key rotation under the account's own authority.
- **All other identifiers** resolve as Convex Name System names (CAD014). These are **named DIDs**: human-readable identifiers managed through CNS records.

No prefix is needed to distinguish the two forms. This is unambiguous by construction: purely numeric top-level CNS names MUST NOT be created (a permanent governance invariant, stated in CAD014), so no valid CNS name can be mistaken for an account address.

The `id` root namespace is the primary home for named DIDs: open access, with names obtainable for a small Convex Coin cost per CAD014. Names in other namespaces (e.g. `user.mike`) are equally valid `did:convex` identifiers.

Convex models a single universal global state, so `did:convex` identifiers contain no network qualifier. Resolvers are configured to point at the appropriate network — by default the Convex main network. For testing, a resolver can be pointed at a testnet or local peer without changing the identifiers themselves.

Key properties:

- Cryptographic authentication via Ed25519 account keys
- On-chain resolution through the CVM
- Controller-based delegation and recovery
- Human-readable identifiers via the Convex Name System (CNS)

#### Resolution of named DIDs

A named DID is resolved by looking up its CNS record. The record's **value** determines the DID subject:

- An **account address** — the DID document is derived from that account (see DID Documents below), with the account DID listed in `alsoKnownAs` as the canonical stable identifier.
- A **scoped reference to a DID registry record** (e.g. `[<registry-actor> <id>]`) — the DID document is constructed from the on-chain registry record (see On-Chain Representation below), including any stored DID document content and authorised accounts.

Resolvers MUST return `deactivated` metadata where the underlying registry record is deactivated, and SHOULD fail resolution (not found) where the CNS name does not exist or its value is not resolvable to a DID subject.

Named DIDs are **mutable aliases**: the controller of the CNS record (or the owner of a parent CNS node — see the CAD014 authority model) can repoint the name, changing the resolved subject, keys and controller. This is intended behaviour — it is what makes recovery and delegation possible — but verifiers requiring a stable subject MUST pin the canonical account DID from `alsoKnownAs` rather than the name.

### `did:key`

Support for the `did:key` method, enabling self-certifying identifiers derived from public keys without requiring on-chain registration. `did:key` identifiers in the Convex ecosystem SHOULD use Ed25519 keys for maximum compatibility with Convex account authentication:

```
did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP
```

The Ed25519 public key in a `did:key` identifier can be used directly as a Convex account key, enabling direct bridging between off-chain `did:key` identities and on-chain accounts. Useful for:

- Ephemeral agent identities
- Off-chain verification prior to on-chain account creation
- Interoperability with external DID ecosystems

See the [did:key Method Specification](https://w3c-ccg.github.io/did-method-key/) for the full method definition.

### `did:web`

Clients in the Convex ecosystem SHOULD support the `did:web` method for resolving identities hosted at web domains. When a `did:web` identifier points to a Convex peer, it works equivalently to `did:convex` — the peer resolves the identity against on-chain state and returns a standard DID document. The path component carries the same self-describing identifier as `did:convex`:

```
did:web:peer.convex.live:13
did:web:peer.convex.live:id.foo
did:web:peer.convex.live:user.mike
```

This enables:

- Domain-anchored identities with human-readable names
- Resolution via standard HTTPS without specialised Convex tooling
- Equivalent semantics to `did:convex` when the host is a Convex peer
- Compatibility with the broader `did:web` ecosystem for non-Convex hosts

Convex peers SHOULD serve DID documents at the standard `did:web` resolution paths:

- `GET /.well-known/did.json` — the peer's own DID document
- `GET /{identifier}/did.json` — DID document for an account or CNS name

Per the [did:web method specification](https://w3c-ccg.github.io/did-method-web/), colons in the method-specific identifier map to `/` in the resolution URL, and a non-default port MUST be percent-encoded (`did:web:example.com%3A8080:13`). Peers serving on non-default ports MUST construct document `id` values accordingly, so that the served `id` matches the DID being dereferenced.

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

### Named DID documents

For a named DID (e.g. `did:convex:id.foo`):

- `id` is the named form (`did:convex:id.foo`, or the `did:web` equivalent)
- `alsoKnownAs` MUST include the canonical account DID currently resolved to (e.g. `did:convex:13`), plus `did:key` where an Ed25519 key exists
- `controller` SHOULD reflect the party able to change the resolution — the CNS record controller — expressed as a `did:convex` account DID where the controller is a plain account. Where the controller is a complex trust monitor, `controller` MAY default to the document's own `id`.
- Where the CNS record resolves to a DID registry record, document content (services, additional verification methods) is drawn from the stored record, and resolution metadata includes `created`, `updated` and `deactivated` from the record.

### Actor Accounts

Actor accounts (smart contracts) do not have public keys. Their DID documents contain `id`, `controller`, and `alsoKnownAs` (with `did:convex`) but omit `verificationMethod` and `authentication`.

## On-Chain Representation

On-chain DID state uses two complementary mechanisms:

1. **Accounts** — every account is implicitly a DID subject (`did:convex:<address>`), with its DID document derived from account state (public key, controller). No registration is required.
2. **The DID registry actor** (`convex.did` in CNS) — an on-chain registry storing DID records for named identities that need more than account-derived documents: stored DID document content, authorised account sets, controller-based management and deactivation.

A registry record logically contains:

- **document** — stored DID document content (or `nil` when deactivated)
- **controller** — trust monitor authorising updates (`:update`) and control transfer (`:control`)
- **created** / **updated** — timestamps maintained by the registry
- **authorised accounts** — a set of accounts entitled to act on behalf of the identity

Registry records implement the W3C required operations: Create, Read, Update and Deactivate. Deactivation is terminal: a deactivated DID MUST NOT be reactivated, and resolvers MUST report `deactivated: true` for it.

Registry records also function as trust monitors: a scoped reference `[<registry-actor> <id>]` is trusted for a subject when the subject is in the record's authorised account set and the record is active. This allows a DID to be used directly wherever a CAD022 trust monitor is expected.

Registry record identifiers are internal. Human-readable naming is provided by CNS: a name in the `id` namespace holds a scoped registry reference as its CNS record value, per the resolution rules above.

This enables:

- Decentralised resolution without external registries
- Atomic updates via CVM transactions
- Verifiable credential anchoring
- Integration with CAD019 assets and CAD014 CNS names

## Security Considerations

### Named DIDs are mutable aliases

The resolution of a named DID can change whenever its CNS record is updated — by the record controller, or by the owner of any parent CNS node (see CAD014 authority model and its security considerations). Verifiers MUST pin the canonical account DID from `alsoKnownAs` where a stable subject is required, and SHOULD assess the trustworthiness of the CNS path's controllers and node owners as part of accepting a named DID.

### Deactivation

Deactivation of a registry-backed DID is permanent. Loss of a controller does not deactivate a DID, but renders it immutable in practice; controllers SHOULD be recoverable trust monitors (e.g. with a backup controller) for long-lived identities.

### Controller validity

Registry operations MUST validate that a new controller is a plausible trust monitor (an existing account or scoped reference). In particular, setting a controller to a non-existent account address is dangerous: account addresses are allocated sequentially, so control would silently pass to whoever later creates that account.

:::note
This CAD is under development. The specification will be extended to cover authentication flows and verifiable credential anchoring. The current DID registry implementation (`convex/lab/did.cvx`) predates parts of this specification and is being upgraded to match (controller validation, terminal deactivation, resolver metadata).
:::

## References

- [W3C DID Core Specification](https://www.w3.org/TR/did-core/)
- [did:key Method](https://w3c-ccg.github.io/did-method-key/)
- [did:web Method](https://w3c-ccg.github.io/did-method-web/)
- [CAD004: Accounts](/docs/cad/accounts)
- [CAD014: Convex Name System](/docs/cad/cns)
- [CAD022: Trust Monitors](/docs/cad/trustmon)
