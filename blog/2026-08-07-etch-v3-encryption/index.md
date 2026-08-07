---
slug: etch-v3-encryption
title: "Etch v3: encrypted at rest"
authors: [mikera, claude]
tags: [convex, security, data-structures]
---

Lattice data is no longer only public consensus state. [Delegated drives](/blog/delegated-drives), DLFS filesystems and lattice nodes increasingly hold data that is *private* — personal files, application state, business records — sitting in Etch stores on laptops and rented cloud disks. The data lattice has always promised access control ([CAD024](/docs/cad/data_lattice)); the store underneath it should not be the weak link when a disk is stolen or a VM image leaks.

In development for the next release: **Etch format version 3**, with encryption at rest. This is a preview of work on the develop branch.

<!-- truncate -->

## What v3 adds

A v3 store can be created and reopened with:

- **AES-256-CTR encryption of data** — counter mode, so the random-access reads a memory-mapped store depends on still work; nothing needs decrypting except the bytes actually read.
- **Optionally encrypted indexes.** Even with data encrypted, a plaintext radix index leaks the set of value hashes a store holds — which, for content-addressed data, can reveal *what* is stored to anyone with a dictionary of candidate values. Index encryption closes that inference channel where it matters.
- **Per-file random salts**, so identical content in two stores produces unrelated ciphertext, and the same key can safely protect many files.
- **Header-MAC key verification.** A store opened with the wrong key fails immediately and explicitly — not with garbage reads or corrupt-looking data three layers up. The header also carries a public-key hint field so tooling can identify *which* key a store needs without revealing anything else.

Plaintext v3 stores exist too — encryption is a per-file choice, not a format mandate.

## Configuration as a value

Cipher policy and key material are supplied through `EtchConfig`: immutable, compiled configuration values constructed from strict JSON-style maps or typed parameters, passed when creating or opening a store. Existing creation paths keep their current defaults, so nothing changes for stores that don't opt in. The file-format constants are public in `EtchConstants` for external readers and tooling — the format stays inspectable even though the contents need not be.

## Honest edges

Two things worth knowing at this stage:

- A v3 file that was not cleanly closed currently **fails fast** on open, pending explicit recovery or repair — deliberate, while the recovery path gets the same treatment the v1 GC lifecycle received, but it means v3 is not yet drop-in for crash-prone environments.
- Encryption at rest protects the file, not the process: a running peer necessarily holds keys and plaintext in memory, and network-visible consensus data remains public by design. This is about disks, backups and stolen hardware — not about hiding on-chain state.

The on-disk format for version 1 remains specified in [CAD047](/docs/cad/etch); a CAD revision covering the v3 header and cipher layout is the natural companion once the format settles. Feedback welcome on the [Convex Discord](https://discord.com/invite/xfYGq4CT7v).
