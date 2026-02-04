# CAD038: Lattice Authentication

## Overview

Lattice Authentication defines how the [Data Lattice](../024_data_lattice/README.md) validates ownership and authenticity of incoming values during merge operations. Since lattice merges combine data from untrusted sources, every incoming signed value must be verified before it is accepted into the local state.

The authentication model is built into the `OwnerLattice` merge path, operates at O(delta) cost (only verifying entries that differ), and is safe by default: if ownership cannot be verified, the merge is rejected.

## Motivation

The Data Lattice is a decentralised, multi-writer system. Any node can produce signed values and propagate them to peers. Without authentication, an attacker could:

- **Impersonate an owner** by placing forged data under another owner's key
- **Inject unauthorised data** into an organisation's namespace
- **Corrupt replicated state** by submitting values signed with unrelated keys

Traditional systems solve this with access control at the network boundary. The lattice instead validates at the **merge boundary** — every incoming value is checked against the owner key it claims to belong to, regardless of how it arrived.

This is a fundamental property of the lattice: **merge is the security boundary**.

### Design Principles

1. **Verify on merge** — authentication happens inside the merge operation, not at the transport layer
2. **O(delta) verification** — only changed entries are verified, via the keyed `MergeFunction` in `mergeDifferences`
3. **Safe by default** — if verification is not possible (no verifier, unknown owner type), the merge is rejected for typed owners, and lenient only for raw public key owners where equality is self-evident
4. **Flexible ownership** — the same lattice structure supports multiple owner identity types without changes to the merge infrastructure

## Specification

### Owner Identity Types

The OwnerLattice maps owner identities to signed values:

```
OwnerLattice: AHashMap<ACell, SignedData<V>>
```

The owner key (`ACell`) determines the verification scheme. Three owner types are supported:

| Owner Type | Key Format | Verification | State Required |
|-----------|------------|-------------|----------------|
| Public Key | `AccountKey` / 32-byte `ABlob` | Direct equality with signer | No |
| Convex Address | `Address` (#0, #1337, etc.) | Account lookup for authorised keys | Yes (CVM State) |
| DID Identifier | `AString` ("did:key:...", "did:convex:...") | DID resolution | Depends on method |

All three types ultimately verify against the `AccountKey` embedded in `SignedData`, which is always an Ed25519 public key.

### Verification Flow

For each incoming entry during merge:

```
1. Extract owner key (map key) and signer key (SignedData.getAccountKey())
2. Verify signer is authorised for this owner:
   - AccountKey/Blob: signer == owner (identity check)
   - Address: delegate to owner verifier (state lookup)
   - DID string: delegate to owner verifier (DID resolution)
3. If verification fails → reject (keep own value)
4. If verification passes → proceed with SignedLattice merge
5. SignedLattice validates Ed25519 signature on the data
```

Both checks must pass: the signer must be authorised for the owner **and** the cryptographic signature must be valid.

### Keyed Merge

Verification requires access to the map key during merge. The `MergeFunction` interface provides this via a keyed merge method:

```java
public interface MergeFunction<V> {
    V merge(V a, V b);
    default V merge(Object key, V a, V b) { return merge(a, b); }
}
```

The `mergeDifferences` operation on maps calls `merge(key, ownValue, otherValue)` for each entry that differs between the two maps. This ensures:

- **O(delta) cost** — identical entries are skipped entirely
- **Key availability** — the owner key is passed to the merge function
- **Backward compatibility** — the default method delegates to `merge(a, b)`, so existing callers are unaffected

### Owner Verifier

The `LatticeContext` carries an optional owner verifier:

```java
BiPredicate<ACell, AccountKey> ownerVerifier
```

The verifier takes `(ownerKey, signerKey)` and returns `true` if the signer is authorised for that owner. This supports:

- **Single-key owners** — one public key per owner
- **Multi-key owners** — organisations with multiple authorised signers
- **Key rotation** — verification against current state, not historical keys
- **Revocation** — removed keys immediately fail verification

#### Public Key Owners

For `AccountKey` or 32-byte `ABlob` owners, verification is a direct equality check:

```
ownerKey == signerKey
```

This is handled inline without consulting the verifier, as it requires no external state.

#### Address Owners

For Convex `Address` owners, the verifier looks up the account in CVM state:

```java
(owner, signerKey) -> {
    AccountStatus account = state.getAccount((Address) owner);
    return account != null && account.isAuthorised(signerKey);
}
```

An account may have multiple authorised keys (e.g. an organisation with several administrators). Any authorised key can sign data for that address.

#### DID Owners

For `AString` owners containing DID identifiers, the verifier resolves the DID:

| DID Method | Resolution |
|-----------|-----------|
| `did:key:z6Mk...` | Extract Ed25519 public key from multibase encoding |
| `did:convex:#1337` | Resolve to Convex address, then lookup account key |
| `did:web:example.com` | Fetch DID document, extract verification methods |

The `did:key:` method is a pure computation (no external state). Other methods may require network access or state lookups.

### Safety Properties

The authentication model is safe by default:

1. **No verifier, blob owner** — direct equality check, always deterministic
2. **No verifier, non-blob owner** — lenient mode accepts (for backward compatibility); production deployments SHOULD always set a verifier
3. **Verifier present, verification fails** — merge rejected, own value preserved
4. **Verifier present, verification passes** — proceed to signature check
5. **Signature invalid** — merge rejected by `SignedLattice.checkForeign()`
6. **Both pass** — value accepted into lattice merge

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

## Lattice Composition

The authentication layer sits within the standard lattice composition:

```
KeyedLattice (ROOT)
  └── :kv → OwnerLattice              ← owner key verification here
               └── SignedLattice       ← Ed25519 signature verification here
                     └── MapLattice
                           └── KVStoreLattice
```

The same pattern applies to any lattice path using `OwnerLattice`:

```
:fs → OwnerLattice → SignedLattice → MapLattice → DLFSLattice
```

## Reference Implementation

The reference implementation is in the Convex `convex-core` module (Java).

### Classes

| Concept | Class | Package |
|---------|-------|---------|
| Keyed merge function | `MergeFunction` | `convex.core.util` |
| Merge context with verifier | `LatticeContext` | `convex.lattice` |
| Owner-based signed map | `OwnerLattice` | `convex.lattice.generic` |
| Signed value merge | `SignedLattice` | `convex.lattice.generic` |
| O(delta) map merge | `AHashMap.mergeDifferences` | `convex.core.data` |

### Example: Setting Up Owner Verification

```java
// Create a verifier that checks Address owners against CVM state
// and supports multiple authorised keys per account
BiPredicate<ACell, AccountKey> verifier = (owner, signerKey) -> {
    if (owner instanceof Address addr) {
        AccountStatus as = state.getAccount(addr);
        return as != null && as.isAuthorised(signerKey);
    }
    if (owner instanceof AString s) {
        return verifyDID(s.toString(), signerKey);
    }
    return false;
};

// Create context with verifier
LatticeContext ctx = LatticeContext.create(timestamp, signingKey, verifier);

// Merge with verification
AHashMap<ACell, SignedData<V>> result = ownerLattice.merge(ctx, ownMap, incomingMap);
```

## See Also

- [CAD002: CVM Values](../002_values/README.md) — Value types including AccountKey and Address
- [CAD024: Data Lattice](../024_data_lattice/README.md) — Lattice merge foundations
- [CAD035: Lattice Cursors](../035_cursors/README.md) — Cursor system and LatticeContext
- [CAD036: Lattice Node](../036_lattice_node/README.md) — Network replication where authentication is applied
- [CAD037: KV Database](../037_kv_database/README.md) — KV store using OwnerLattice authentication
