# CAD025: Convex HD Wallets

## Overview 

Convex requires Ed25519 key pairs for users to sign transactions and provide account security.

Any valid Ed25519 key pair will work with Convex, however it is helpful for wallets to generate key pairs in a way that is:
- Able to produce a large number of hierarchical, deterministic key pairs from a single root key
- Easy for users to understand and manage
- Compatible with existing wallet standards

## Seed Phrases

Wallets SHOULD allow for seed generation accounting to the [BIP39 standard](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)

As such, wallets can be restored completely using the combination of:
- A mnemonic seed phrase such as `share resource quantum rely train chicken they plug amazing`
- A passphrase (considered optional, if not provided acts as the empty string `""`)

A BIP39 seed, consisting of 64 bytes, SHOULD be created from the seed phase and passphrase according to BIP39 

## Heirarchical Key Organisation (BIP44 compatibility)

There is no strict requirement for HD wallets to organise keys in any particular way, however compatibility with the BIP44 standard is strongly recommended.

### Option 1: Deterministic from Convex Accounts 

Wallets MAY generate Ed25519 key pairs in accordance with the BIP43 / BIP44 standard, in the format:

`m/44/888/<convex-address>/0/<sequence-number>`

Where:
 - `<convex-address>` is the address of the Convex account for which the key is specified
 - `<sequence-number>` is the sequence number of the transaction used to set the public key
 - `888` is a placeholder coin type for the Convex Coin until confirmed in SLIP-0044

If the address is not known at the time of key generation, wallets SHOULD generate a temporary key pair, and rotate the public key of the account to the above once the address is known.

The advantage of this method is that if the user knows their Convex address, it is possible to attempt a relatively small number of lookups to find the correct keypair from the wallet (possibly just one, if the sequence number of the last key rotation is known).

### Option 2: Conventional BIP44

Alternatively wallets MAY generate Ed25519 key pairs using the conventional BIP44 approach:

`m/44/888/<account-index-from-zero>/0/<key-index>`

In this case, wallets / apps bear a greater responsibility for handing the mapping from wallet accounts to Convex accounts / addresses.

## Key Derivation (SLIP-0010)

Keys SHOULD be derived according to [SLIP-0010](https://github.com/satoshilabs/slips/blob/master/slip-0010.md), which produces Ed25519 key pairs in a manner compatible with BIP32 / BIP39 / BIP43 / BIP44 etc.

Note: Ed25519 key generation with SLIP-0010 is assumed to use hardened key generation by default, as this is the only option supported for Ed25519.

## Key Rotation

Wallets SHOULD periodically rotate the public key to provide security against key compromise

Wallets SHOULD use the sequence number of the transaction used to rotate the key as the `<key index>`. This ensures that:
1. the rotated key can be re-derived by observing transaction / state history
2. there is no risk of re-using the same key because sequence numbers increase monotonically

e.g. assuming the key is rotated in the first transaction for account `#1234`, the derivation path is `m/44/888/1234/0/1`

## Account linkage

An app SHOULD remember the user's addresses and which key pair it is associated with.

An app MAY query the known addresses and attempt to find a compatible key pair from the user's wallet.

## Test Vectors

Seed Phrase: `hold round save brand meat deposit armed idea taste reunion silent pair estate ladder copper`

Passphrase: `test`

BIP39 Seed: `d46c4e60d0137e7ee0acc8b836d76d9a0458705caa128899709f576bade690b3c7cba49ece50a211193b9eb7803be49d02c8ddae02c3b88790ac17fa72f219a6`

Derivation path: `m/44/888/1234/0/1`

Ed25519 Private key seed: `2172bb864deb4f978ad6360beefe205d38a6839c011dc4f37592769007c8321f`
