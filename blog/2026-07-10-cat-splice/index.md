---
slug: cat-splice
title: "cat and splice: byte surgery on the CVM"
authors: [mikera, claude]
tags: [convex, cvm, lisp, data-structures]
---

Convex 0.8.8 adds two small core functions with outsized reach: `cat`
concatenates raw bytes, and `splice` overwrites bytes at a position. On
most platforms these would be mundane. On the CVM, values are immutable
Merkle trees with structural sharing — so you can patch a few bytes in the
middle of a multi-megabyte Blob for the cost of the patch, not the Blob.

<!-- truncate -->

## cat: concatenation without casting

```clojure
(cat 0x01 0x0203)        ;; => 0x010203
(cat "foo" "bar")        ;; => "foobar"
(cat :hello "-" :world)  ;; => "hello-world"
(cat "item-" (char 65))  ;; => "item-A"
```

`cat` takes any BlobLike values — Blobs, Strings, Addresses, Hashes,
Keywords, Symbols — plus Characters, and concatenates their **raw bytes**. It
never casts: a String contributes its UTF-8 bytes, a Keyword its name bytes,
a Character its UTF-8 encoding. The result type follows the first non-nil
argument — stringy inputs yield a String, anything else a Blob — and `nil`
arguments are simply skipped.

That "never casts" rule is the point. Convex already has `blob`, which is a
cast: `(blob "cafe")` *parses hex* and gives you two bytes. By contrast
`(cat 0x "cafe")` appends the four raw UTF-8 bytes of the string. One
function interprets, the other assembles. Keeping those separate is what
makes byte-level code auditable.

## splice: positional overwrite

```clojure
(splice 0x0000000000 2 0xffff)      ;; => 0x0000ffff00
(splice "hello world" 6 "there")    ;; => "hello there"
```

`splice` overwrites the bytes of a destination Blob or String at a given
offset with the raw bytes of a source value. Writing at exactly
`(count dst)` appends; a write can extend past the end and grow the result.

The performance characteristics are where the lattice data model shines:
cost is proportional to the *source* size plus one chunk. Large Blobs in
Convex are trees of chunks, so splicing two bytes into the middle of a
gigabyte-scale Blob rebuilds one chunk and the path above it — every
untouched chunk is shared with the original value. This is the same
structural-sharing machinery that let DLFS support
[exabyte sparse files](/blog/exabyte-sparse-files); now it's available to
any CVM program, one function call away.

One caveat: these are *byte* operations, deliberately. Offsets are
byte offsets even into Strings, so a `splice` into a String can split a
multi-byte character. For text formatting use `str`; `splice` is a
byte-level tool.

## Why on-chain byte surgery matters

Smart contracts increasingly need to speak binary: building and parsing
compact encodings, assembling signed payloads, maintaining large on-chain
buffers, patching regions of stored data without rewriting it. With `cat`
and `splice` alongside the existing `slice`, the CVM now has a complete,
efficient toolkit for immutable byte manipulation — assemble, extract,
patch — all with costs that respect the structure of the data rather than
its total size.
