# CAD052: Encryption

## Overview

Convex account keys are Ed25519 signing keys: they prove who authored a value, but say nothing about who may read it. Data on the lattice is replicated to peers by design, and a peer that stores a value does not need to understand it. Some of that data should be readable only by a particular account holder — a message addressed to an agent, a payload in a queue, a file on a shared drive.

This CAD specifies how a Blob is encrypted **to** the holder of an Ed25519 account key, so a value can be replicated freely while remaining readable by exactly one recipient. It is a data-level facility used by protocols and applications; it is not part of CVM execution, and no CVM operation decrypts anything.

## Design objectives

### Use of existing standards

The scheme is [RFC 9180 HPKE](https://www.rfc-editor.org/rfc/rfc9180) in Base mode, with no Convex-specific cryptographic construction. HPKE is analysed, and has published test vectors and independent implementations, so an independent Convex implementation can be verified against something other than our own code.

### No new key material

A user who has an account already holds the only key they should need. Requiring a second published key before an account could receive anything would mean a registration step, a distribution problem, and accounts that silently cannot be written to. The Ed25519 account key is therefore converted to an X25519 key for key agreement, using the conversion libsodium established, so any account is a valid recipient the moment it exists.

This has a real cost, stated plainly in the security properties below: it reuses one key pair across two algorithms. Protocols in a position to assign a separate long-term encryption key SHOULD do so, and use this scheme for the case where they cannot.

### Compact envelopes

Encrypted values are stored and replicated like any other Blob, so per-message overhead is charged in memory ([CAD006](../006_memory/index.md)) and in propagation. The envelope carries only what a recipient cannot derive — the encapsulated key and the authentication tag — for a fixed 48 bytes.

## Specification

### Cipher suite

Implementations MUST use HPKE Base mode with the following suite:

| Component | Choice | RFC 9180 identifier |
|---|---|---|
| KEM | DHKEM(X25519, HKDF-SHA256) | `0x0020` |
| KDF | HKDF-SHA256 | `0x0001` |
| AEAD | AES-128-GCM | `0x0001` |

The `info` and `aad` inputs MUST be empty at this layer. A protocol that needs to bind context into a ciphertext SHOULD do so within the plaintext it encrypts, so that every implementation of this CAD reads the same envelopes.

The suite is **not** encoded in the envelope. It is fixed by this specification, and a future suite MUST be introduced as a distinct format with its own discriminator rather than by reinterpreting these bytes.

### Key conversion

Ed25519 and X25519 use the same underlying curve in different coordinate systems, so an Ed25519 key converts to an X25519 key without loss. Implementations MUST use the conversion defined by libsodium, so keys remain interoperable with existing tooling.

For a public key, an implementation MUST first validate the [`AccountKey`](../004_accounts/index.md) as an Ed25519 public key, and MUST reject one that is not a valid point. It then clears the sign bit of the encoded `y` coordinate and applies the Edwards-to-Montgomery birational map:

```
u = (1 + y) / (1 - y)   (mod 2^255 - 19)
```

For a private key, an implementation takes the SHA-512 hash of the 32-byte Ed25519 seed, keeps the first 32 bytes, and clamps them as an X25519 scalar. The seed is the value already held in a Convex key store ([CAD023](../023_keystore/index.md)); no other private material is required.

Implementations SHOULD zero the intermediate hash and scalar buffers once the X25519 key is constructed.

### Envelope format

The encrypted value is a Blob with the layout:

```
<encapsulated key (32 bytes)> || <ciphertext> || <GCM tag (16 bytes)>
```

RFC 9180 returns `enc` and `ct` separately; this CAD fixes their serialisation as `enc || ct`. `Nenc` is 32 for X25519, so the split is unambiguous and no length prefix is needed. Overhead over the plaintext is exactly 48 bytes.

Implementations MUST reject an envelope shorter than 48 bytes as malformed, without attempting decryption.

### Recipient identification

The envelope carries no recipient identifier. Two consequences follow, and a protocol using this CAD MUST decide how it handles both.

A reader holding several keys cannot tell which key an envelope is for, so it either tries each key or relies on addressing information carried outside the envelope. Where a reader scans many envelopes with one key, implementations SHOULD derive the recipient's X25519 key once and reuse it; a fresh HPKE context is still required per envelope, because each carries its own encapsulated key.

An observer cannot tell who an envelope is for either, which is the more useful half of the same property. A protocol that adds a recipient hint for efficiency SHOULD note that it is trading that property away.

### Security properties

HPKE binds the encapsulated key into its key schedule, so the AEAD provides both confidentiality and integrity of the ciphertext. Decryption of a modified envelope fails; it does not return altered plaintext.

**Base mode does not authenticate the sender.** Anyone holding a recipient's account key — which is public — can produce a well-formed envelope that the recipient decrypts successfully. A recipient MUST NOT infer authorship from successful decryption. Where authorship matters, the plaintext MUST carry a signature, or the envelope MUST be wrapped in a `SignedData` record ([CAD002](../002_values/index.md)).

**Key reuse across algorithms is a real trade-off.** The same key pair signs under Ed25519 and agrees keys under X25519. No practical attack is known against this combination — it is what libsodium's `crypto_sign_ed25519_pk_to_curve25519` exists to support, and what `did:key` DID documents rely on — but joint security is not implied by the security proofs of either algorithm alone. Protocols that can assign distinct long-term signing and encryption keys SHOULD do so, and reserve this conversion for the case where the account key is the only key available.

**Each encryption requires fresh randomness.** HPKE generates an ephemeral key pair per message. An implementation that reuses an ephemeral key across messages, or draws it from a weak source, loses confidentiality. Implementations MUST use a cryptographically secure random source, and MUST NOT expose a caller-supplied ephemeral key through a public API; the reference implementation admits one only for testing against RFC 9180 vectors.

**Metadata is not protected.** Plaintext length is exactly visible, as the envelope length less 48 bytes, as are the time and place a value appears on the lattice. Padding plaintext to a fixed size is a protocol-level decision, not something this scheme does.

### Implementation

The reference implementation is `convex.core.crypto.ECIES` in `convex-core`. It encrypts for an `AccountKey`, decrypts with an `AKeyPair` or a raw 32-byte Ed25519 seed, and exposes a reusable `Decryptor` for scanning many envelopes with one key. The decryptor retains only the derived X25519 key — not the key pair, the seed, or any processed message.

The name "ECIES" is used loosely: the construction is HPKE, the modern successor to the ECIES family, rather than any of the older ECIES variants.

## Related CADs

- [CAD002: Values](../002_values/index.md) — `SignedData`, for the sender authentication this scheme deliberately omits
- [CAD004: Accounts](../004_accounts/index.md) — account keys as recipient identifiers
- [CAD023: Keystore](../023_keystore/index.md) — where the Ed25519 seed a recipient decrypts with is held
- [CAD043: Decentralised Identity](../043_did/index.md) — DID documents that publish account keys
