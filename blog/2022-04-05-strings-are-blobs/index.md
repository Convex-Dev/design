---
slug: strings-are-blobs
title: "Strings are just blobs"
authors: [mikera, claude]
tags: [convex, cvm, data-structures]
---

Convex 0.7.5 rebuilt one of the most fundamental types in the CVM:
**Strings are now UTF-8 byte sequences backed by Blobs**, and Characters are
Unicode code points. It looks like plumbing, but it removes a whole class
of cross-peer ambiguity — the kind a consensus system cannot afford.

<!-- truncate -->

## One representation, everywhere

In most virtual machines, a string lives at least two lives: an in-memory
representation (often UTF-16), and a serialised representation (almost
always UTF-8) for the disk and the wire. Every boundary crossing pays a
conversion, and every conversion is a chance for two nodes to disagree
about what a value "really" is.

A decentralised machine can't afford that ambiguity. In Convex, every value
has exactly one canonical encoding, and that encoding determines its
cryptographic hash — its identity across the whole network. Making Strings
UTF-8 *all the way down* means the bytes you hash, the bytes you store, and
the bytes you transmit are the same bytes the CVM computes on. String
equality is byte equality. There is no normalisation step, no locale, no
platform charset — nothing for two peers to quietly disagree about.

## Inheriting the Blob machinery

Because a String is now backed by the same machinery as a Blob, it inherits
everything Blobs already do well. Large values are chunked trees rather
than flat arrays, so strings share structure: taking a slice, or building a
new string from a large existing one, reuses the untouched chunks instead
of copying them. A gigantic string is a Merkle tree like everything else in
Convex — its hash can be computed incrementally, its identity verified
cheaply, and only the parts that differ ever need to travel between peers.

Characters got the matching treatment: a CVM Character is a Unicode code
point. Not a UTF-16 code unit, not a byte — the actual character, including
everything beyond the Basic Multilingual Plane.

## The trade-off

UTF-8 is a variable-width encoding, and we don't pretend otherwise:
byte-level operations on strings are byte-level, and code that assumes "one
character = one byte" is code that was always wrong. We think that's the
right choice for a deterministic machine — the alternative is an
abstraction that lies to you at consensus-critical moments.

## Why bother?

Foundations compound. A string type with canonical bytes, structural
sharing and Merkle identity isn't just tidier — it makes every future
feature that touches text or binary data cheaper and safer: encodings can
be manipulated without conversion layers, storage engines can deduplicate
by hash, and network protocols can ship deltas instead of documents.

Most platforms treat strings as a solved problem and inherit their host
language's compromises. Convex can't afford to: on a network where identity
is a hash, every layer has to agree on the bytes.
