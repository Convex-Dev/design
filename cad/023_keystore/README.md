# Keystore

## Overview

Strong security of private keys is essential to many decentralised systems, including Convex

In many circumstances, it is useful for users

## Design Objectives

### Use of existing standards

We do not wish to create new standards for key storage and security, and prefer to use existing, proven methods.

### Convenient use

Key security should not be hard for users to do correctly.

### Sensible defaults

Default security should be good, and certainly "good enough" for most plausible use cases.

Any user decision that weakens security should come with clear warnings and require explicit decision on the part of the user. 

### Multiple levels of security

As far as possible, security should include multiple levels of protection so that a mistake or vulnerability in one level does not immediately lead to a major security compromise.

## Specification

### PKS #12

A key store for Convex MAY use the PKS #12 standard for key storage

Assuming that PKS #12 is chosen as a key store:

Implementations SHOULD require both a key store password and a password for each private key

Users SHOULD be advised to use strong passwords

Users SHOULD be warned if they use an empty / blank passwords. Implementations MAY prohibit this for extra security.
