---
slug: json-native
title: "JSON is a subset of the lattice"
authors: [mikera, claude]
tags: [convex, data-structures, developer-tools]
---

Convex 0.8.1 ships a JSON parser (with a proper ANTLR grammar) for the
lattice. The parser is the small part. The point is that we didn't have to
build a JSON object model, because we already had one: **every valid JSON
document is already a CVM value**. JSON is a strict subset of the data
types Convex has had from the start.

<!-- truncate -->

Line up the two type systems and there's nothing to invent:

| JSON | CVM |
|------|-----|
| number | `Integer` / `Double` |
| string | `String` |
| `true` / `false` | `Boolean` |
| `null` | `nil` |
| array | `Vector` |
| object | `Map` (string or keyword keys) |

Parse a JSON document and out comes a plain CVM data structure — no wrapper
classes, no "JsonNode" object model, no impedance mismatch. It's just data,
in the same shape the rest of the platform speaks natively.

## What falling into the lattice gets you

The moment a JSON document becomes a CVM value, it picks up every property
CVM values have, without anyone writing JSON-specific code:

- **A cryptographic identity.** Every value has a canonical encoding and
  hence a hash. Two parties can agree on exactly which API response they're
  talking about by comparing 32 bytes.
- **Cheap storage and dedup.** Values are content-addressed and share
  structure, so a thousand near-identical JSON documents store their
  common parts once.
- **Big-value handling for free.** A JSON array with a million entries is a
  CVM Vector — a tree with structural sharing, not one giant contiguous
  allocation.
- **On-chain reach.** Data that arrives as JSON can be inspected and
  processed with ordinary Convex Lisp: `get-in`, `assoc`, `map` and
  friends all just work on it.

Mind the direction of the subset, though.
JSON → CVM is total: everything maps, nothing is lost. CVM → JSON is not:
the lattice has plenty of types JSON has never heard of — Blobs, Addresses,
Keywords, Sets, non-string map keys. Round-tripping *JSON-shaped* data is
reliable; rendering arbitrary lattice data as JSON involves choices, and
tooling should make them explicitly rather than pretend the formats are
equivalent.

## Why we care

JSON is the default interchange format of the web: every API, every config
file, every webhook payload. A decentralised platform can either treat that
world as foreign — parse strings in userland, at your own risk — or support
it natively. With the 0.8.1 parser work this becomes properly convenient:
REST endpoints, the web explorer and client libraries can move between JSON
at the edge and lattice values inside without ceremony.

No new machinery was needed — the type system was already general enough to
cover the web's favourite format. The parser just makes it convenient.
