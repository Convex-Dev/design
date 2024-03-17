# Convex Wallet

## Overview 

Convex requires Ed25519 key pairs to sign transactions and provide account security.

Any valid Ed25519 key pauir will work with Convex, however it is helpful to generate key pairs in a way that is:
- Easy for users to understand and manage
- Compatible with existing wallet standards

## Generation

Wallets SHOULD generate Ed25519 key pairs in accordance with the BIP43 / BIP44 standard, in the format:

`m/44/888/<convex address>/0/<key index>`

Note: `888` is a placeholder coin type for the Convex Coin until confirmed in SLIP-0044

If the address is not known at the time of key generation, wallets SHOULD generate a temporary key pair, and rotate the public key of the account to the above once the address is known.

Keys SHOULD be derived according to [SLIP-0010](https://github.com/satoshilabs/slips/blob/master/slip-0010.md), which produces Ed25519 key pairs in a manner compatible with BIP32 / BIP32 

Note: Ed25519 key generation with SLIP-0010 is assumed to use hardened key generation by default, as this is the only option supported for Ed25519.

## Key Rotation

Wallets SHOULD periodically rotate the public key to provide security against key compromise

Wallets SHOULD use the sequence number of the transaction used to rotate the key as the `<key index>`. This ensures that:
1. the rotated key can be re-derived by observing transaction / state history
2. there is no risk of re-using the same key because sequence numbers increase monotonically

e.g. assuming the key is rotated in the first transaction for account `#1234`, the derivation path is `m/44/888/1234/0/1`

## Test Vectors

Seed Phrase: `hold round save brand meat deposit armed idea taste reunion silent pair estate ladder copper`
BIP39 Seed: `d46c4e60d0137e7ee0acc8b836d76d9a0458705caa128899709f576bade690b3c7cba49ece50a211193b9eb7803be49d02c8ddae02c3b88790ac17fa72f219a6`
Derivation path: `m/44/888/1234/0/1`
Ed25519 Private key seed: `2172bb864deb4f978ad6360beefe205d38a6839c011dc4f37592769007c8321f`