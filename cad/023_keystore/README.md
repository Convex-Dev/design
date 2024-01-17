# Keystore

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
- Minimise risk that important key stores may be unreadable opr inaccessible in the future
- No point wasting effort reinventing wheels

### Convenient use

Cryptographic keys need to be easy to use for users, while providing sufficient security. 

In particular, key security should not be hard for users to do correctly. We do not want users to compromise security for "convenience".

### Sensible defaults

Default security should be strong, and certainly "good enough" for most plausible use cases.

Any user decision that weakens security should come with clear warnings and require explicit decision on the part of the user. 

### Multiple levels of security

As far as possible, security should include multiple levels of protection so that a mistake or vulnerability in one level does not immediately lead to a major security compromise. Levels of security anticipated include:
- Key stores should be private files inaccessible to aunauthorised users
- Key stores should be encrypted, so that obtaining the file does not provide access to the key
- Decryption passwords should not be stored anywhere on the machine
- After decryption, private keys are only kept in memory for immediate use

## Specification

### PKS #12

A key store for Convex MAY use the PKS #12 standard for key storage. This standard is well established, is supported by many tools, and provides effective security if used correctly.

Assuming that PKS #12 is chosen as a key store:

Implementations SHOULD use the hex string representation of the public key as an alias to each key in the store, to enable easy user identification and automatic lookup as required.

Implementations SHOULD require both a key store password and a password for each private key

Users SHOULD be advised to use strong passwords

Users SHOULD be warned if they use an empty / blank passwords. Implementations MAY prohibit this for extra security.

### Password input

Password input SHOULD be via appropriate mechanisms that protect password privacy , e.g. via a secure password TTY prompt that disables echoing.

Implementations SHOULD clear memory for any passwords immediately after they are used. For example, zeroing memory in a character array.
