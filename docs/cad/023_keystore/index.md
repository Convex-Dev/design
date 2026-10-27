# CAD023: Keystore

## Overview

Strong security of private keys is essential to many decentralised systems, including Convex

In many circumstances, it is useful for users to keep a local keystore for their hot / warm wallets on their device. Common usage scenarios include:
- Generating and using keys on the CLI
- Providing a persistent store of keys for running a peer
- Making keys available to local applications (e.g. the Convex GUI)

This CAD outlines standards and principles for the use of such key stores.

## Design Objectives

### Use of existing standards

We avoid creating new standards for key storage and security, and prefer to use existing, proven methods.

Key reasons for this include:
- Security / reliability of well designed existing standards
- Compatibility with external tools
- Minimise risk that important key stores may be unreadable or inaccessible in the future
- No point wasting effort reinventing wheels

### Convenient use

Cryptographic keys need to be easy to use for users, while providing sufficient security. 

In particular, key security should not be hard for users to do correctly. We do not want users to compromise security for "convenience".

### Sensible defaults

Default security should be strong, and certainly "good enough" for most plausible use cases.

Any user decision that weakens security should come with clear warnings and require explicit decision on the part of the user. 

### Multiple levels of security

As far as possible, security should include multiple levels of protection so that a mistake or vulnerability in one level does not immediately lead to a major security compromise. Levels of security anticipated include:
- Key stores should be private files inaccessible to unauthorised users
- Key stores should be encrypted, so that obtaining the file does not provide access to the key
- Decryption passwords should not be stored anywhere on the machine
- After decryption, private keys are only kept in memory for immediate use

## Specification

### Peer Usage

Peers SHOULD obtain a key from a secure key store at startup, and use this key for the duration of live operations where signatures using the peer's private key are required (for example signing their latest CPoS ordering).

Peers SHOULD NOT persist or otherwise export the obtained key in any way to external files or storage. Any unencrypted copies of the private key should be considered as a major security risk.

### PKCS #12

A key store for Convex MAY use the PKCS #12 standard for key storage. This standard is well established, is supported by many tools, and provides effective security if used correctly.

Assuming that PKCS #12 is chosen as a key store:

Implementations SHOULD use the hex string representation of the public key as an alias to each key in the store, to enable easy user identification and automatic lookup as required.

Implementations SHOULD store the 32-byte Ed25519 seed as a secret key entry, rather than an encoded private key entry. The seed is sufficient to reconstruct the key pair, and avoids depending on how a given provider chooses to encode Ed25519 private keys.

Implementations SHOULD require both a key store password and a password for each private key.

Users SHOULD be advised to use strong passwords.

Users SHOULD be warned if they use an empty or blank password. Implementations MAY prohibit this for extra security.

### Password-based key derivation

Every entry protected by a password derives its encryption key from that password. The parameters of that derivation decide what an attacker holding a copy of the key store must spend to test one candidate password, so they are specified here rather than left to a provider default.

Implementations MUST generate a fresh random salt for each protected entry, from a cryptographically secure random source, of at least 16 bytes. A fixed salt — including the all-zero salt that some providers default to — lets one precomputed table attack every key store that implementation has ever written.

Implementations SHOULD derive keys with at least 210,000 iterations of PBKDF2-HMAC-SHA512, following current [OWASP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), and SHOULD keep the figure under review as that guidance changes.

Both the salt and the iteration count MUST be recorded alongside the entry, so an entry written under earlier parameters stays readable. Implementations SHOULD rewrite an entry with current parameters the next time it is written.

Users pay for this in unlock latency. Implementations SHOULD NOT trade that cost away for responsiveness.

The reference implementation stores each key as a secret key entry protected with `PBEWithHmacSHA512AndAES_128`, using a 20-byte random salt and 220,000 iterations (`convex.core.Constants.PBE_ITERATIONS`).

### Password input

Password input SHOULD be via appropriate mechanisms that protect password privacy, for example a secure password TTY prompt that disables echoing.

Implementations SHOULD clear memory for any passwords immediately after they are used, for example by zeroing a character array.

### PEM export

Convex implementations SHOULD support Ed25519 private key export in encrypted PEM format, so a key can move between key stores and be read by standard tooling.

Exported PEM keys MUST be encrypted. Implementations MUST NOT write an unencrypted `PRIVATE KEY` PEM block for an Ed25519 signing key.

Implementations SHOULD encrypt with PKCS #5 PBES2, using AES-256-CBC and PBKDF2-HMAC-SHA512 with a fresh random salt and the iteration count specified above. The scheme, salt and iteration count are recorded in the PEM structure itself, so a file exported under earlier parameters still imports.

Implementations SHOULD NOT export with PKCS #5 v1.5 or the PKCS #12 password-based schemes. Those schemes commonly select RC2 or 3DES at a low iteration count, and a stock OpenSSL 3 will not read RC2 without its legacy provider — so the weaker choice is also the less portable one.

The encrypted format in ASN.1 form SHOULD resemble the following:

```
U.P.SEQUENCE {
   U.P.SEQUENCE {
      U.P.OBJECTIDENTIFIER 1.2.840.113549.1.5.13 (PBES2)
      U.P.SEQUENCE {
         U.P.SEQUENCE {
            U.P.OBJECTIDENTIFIER 1.2.840.113549.1.5.12 (PBKDF2)
            U.P.SEQUENCE {
               U.P.OCTETSTRING <random salt>
               U.P.INTEGER 0x035B60 (220000 decimal)
               U.P.SEQUENCE {
                  U.P.OBJECTIDENTIFIER 1.2.840.113549.2.11 (hmacWithSHA512)
               }
            }
         }
         U.P.SEQUENCE {
            U.P.OBJECTIDENTIFIER 2.16.840.1.101.3.4.1.42 (AES-256-CBC)
            U.P.OCTETSTRING <initialisation vector>
         }
      }
   }
   U.P.OCTETSTRING <encrypted PKCS #8 PrivateKeyInfo>
}
```

### PEM import

Implementations MUST parse the decrypted PKCS #8 `PrivateKeyInfo` structure to recover the seed, and MUST reject an encoding whose algorithm identifier is not Ed25519.

Implementations MUST NOT recover the seed by taking the trailing 32 bytes of the decrypted structure. [RFC 8410](https://www.rfc-editor.org/rfc/rfc8410) permits an optional public key field after the private key, and an encoding carrying one would be imported as a silently different key pair — surfacing later as an unexplained bad signature rather than as an import error.

### Encrypting data to a key

A key store holds signing keys. Where a protocol also needs to encrypt data *to* the holder of an account key, see [CAD052](../052_encryption/index.md), which specifies how an Ed25519 account key is used as an encryption recipient. Protocols that can assign separate long-term signing and encryption keys SHOULD do so.
