---
slug: key-security
title: "Encrypting to an account key, and a hardened key store"
authors: [mikera, claude]
tags: [convex, security]
---

An Ed25519 account key proves who wrote something. It says nothing about who may read it, and it is only as safe as the file it is stored in. Convex **0.8.15**, released on 24 August, addressed both halves: a Blob can be encrypted so that only the holder of a given account key can open it, and the key store protects keys to current OWASP guidance. [CAD052](/docs/cad/encryption) specifies the encryption scheme, and [CAD023](/docs/cad/keystore) the key store.

<!-- truncate -->

## Encrypting to an account key

Lattice data is replicated to peers by design, and a peer that stores a value does not need to understand it. Making a value readable by exactly one account used to mean inventing something: a second published key, a key exchange, a registration step, and an account that silently could not be written to until it had all three.

`convex.core.crypto.ECIES` removes that step. You encrypt to an `AccountKey`, and the account holder decrypts with the key pair they already have:

```java
import convex.core.crypto.AKeyPair;
import convex.core.crypto.ECIES;
import convex.core.data.Blob;

public class EncryptExample {
    public static void main(String[] args) throws Exception {
        AKeyPair recipient = AKeyPair.generate();
        Blob secret = Blob.fromHex("cafebabe");

        // Anyone can encrypt to the public account key
        Blob envelope = ECIES.encrypt(recipient.getAccountKey(), secret);

        // Only the holder of the key pair can open it
        Blob plaintext = ECIES.decrypt(recipient, envelope);
        System.out.println(plaintext.equals(secret));
        System.out.println(envelope.count());
    }
}
```

```text
true
52
```

A 4-byte secret becomes a 52-byte envelope. The overhead is a flat 48 bytes, whatever the size of the plaintext.

The construction is [RFC 9180 HPKE](https://www.rfc-editor.org/rfc/rfc9180) in Base mode — DHKEM(X25519, HKDF-SHA256), HKDF-SHA256, AES-128-GCM — with the Ed25519 account key converted to X25519 by the same map libsodium uses. Nothing about the cryptography is ours, which is the point: an independent implementation can be checked against RFC 9180's own test vectors rather than against our code.

An envelope is `enc || ct` and carries no recipient identifier. That cuts both ways, and CAD052 specifies both directions: a reader with several keys has to be told which one to use, or try each, while an observer learns nothing about who an envelope is for. Where a reader scans many envelopes with one key, `ECIES.createDecryptor` derives the X25519 key once and reuses it.

Two honest edges, both written into the CAD rather than left for a reader to discover. Base mode does not authenticate the sender: anyone can encrypt to a public account key, so successful decryption is not evidence of authorship — sign the plaintext, or wrap the envelope in `SignedData`. And the scheme reuses one key pair across two algorithms, which is what makes it work with no setup at all, and is exactly why a protocol that *can* assign a separate encryption key should.

## A key store to current guidance

A PKCS #12 key store protects each entry with a key derived from your passphrase, and the parameters of that derivation are the entire cost of an offline guess. Each entry now gets its own random 20-byte salt and 220,000 iterations of PBKDF2-HMAC-SHA512, the figure the [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2) gives for that function. Before 0.8.15, every entry Convex wrote used the same all-zero salt and 100,000 iterations, so one precomputed table would have applied to every key store the project had produced. Unlocking a key now takes 2.2 times the work, which is the right direction for that number to move.

PEM export uses PBES2 with AES-256-CBC and the same key derivation, in place of PKCS #5 v1.5 with RC2. The new files are also the more portable ones: a stock OpenSSL 3 reads them directly, while RC2 needs its legacy provider. Import parses the PKCS #8 structure rather than taking its trailing bytes. [RFC 8410](https://www.rfc-editor.org/rfc/rfc8410) allows an optional public key after the private key, and an encoding carrying one used to import as a silently different key pair, surfacing much later as an inexplicable bad signature. A non-Ed25519 encoding is now rejected rather than reinterpreted.

Two more changes came out of the same review. The peer signing service derives its lookup hash with HKDF, keyed by a secret the peer holds, so a copy of its store no longer lets anyone attack passphrases offline. And locking a wallet entry blocks signing as well as key access.

Files written by earlier versions still open, because the salt, iteration count and scheme are recorded in each one. An existing key store entry keeps its original protection until the key is stored again; new entries and PEM exports use the current parameters. Signing service entries convert on their first successful load, the only moment the passphrase is available.
