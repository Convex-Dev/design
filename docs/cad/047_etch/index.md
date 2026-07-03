# CAD047: Etch Storage Format

## Overview

Etch is the embedded, append-only, content-addressable store that persists Convex cells — the immutable Merkle-tree nodes that make up CVM state, lattice data and every other value in the system. It is described in its own source as "a stupid, fast database for immutable data you want carved in stone": once a value is written for a key it is never changed, which eliminates cache-invalidation concerns entirely.

This CAD specifies the **on-disk file format** (Etch format version 1). Higher-level *store management* — the store abstraction, in-memory caching, garbage collection and pinning — is a separate concern and is not specified here.

Keys are fixed 32-byte identifiers, normally the SHA3-256 [Value ID](../003_encoding/index.md) of the cell being stored. Values are the canonical cell [encodings](../003_encoding/index.md). Etch is indifferent to the meaning of keys, but assumes they are pseudo-random hashes so that data distributes evenly across the index.

## Motivation

A decentralised system persists enormous quantities of immutable, content-addressed data. A store purpose-built for that workload can make strong simplifying assumptions that a general-purpose database cannot:

- **Immutability removes invalidation** — because a key's value can never change, there is no cache-coherence problem and no need for update-in-place of stored content.
- **Hash keys index cleanly** — pseudo-random 32-byte keys distribute uniformly, so a radix tree over the key bytes gives shallow, balanced lookups without rebalancing.
- **Lazy loading** — cells reference their children by Value ID, so a reader can traverse and load only the parts of a structure it needs.
- **Single file, memory-mapped** — the whole store is one file, mapped into memory for fast random access, with data appended as it is written.

## Design Principles

- **Write-once data** — the content of a record (key, length and encoding) is fixed once written.
- **Content addressing** — every key is a 32-byte identifier of the value it locates.
- **Append-only growth** — new records and index blocks are appended; existing content is not relocated.
- **Single writer, many readers** — one writer appends and updates the root; readers map the file concurrently.
- **One mutable field** — a record's persistence-status label may be upgraded in place (see [Immutability](#immutability-and-in-place-label-updates)); nothing else changes.

## Specification

All multi-byte integers are stored **big-endian**. Offsets in pointers are absolute byte positions within the file.

### File Layout

An Etch file consists of a fixed-size **header**, followed by a region of **index blocks** and **data records** that grows as values are written. The first (root) index block begins immediately after the header.

### Header

The header is **44 bytes**:

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | Magic number | Always `0xE7C6` |
| 2 | 2 | Version | Format version (currently `1`) |
| 4 | 8 | Database length | Logical length in bytes of database content (the append position); the file MAY be slightly longer owing to the write margin |
| 12 | 32 | Root hash | Value ID of the current root cell, or a zero marker when no root is set |

The root index block starts at offset **44**.

The **root hash** is the store's single durable entry point. After the cells for a new root have been appended, the writer updates the database length and root hash in the header; on open, a store recovers the last committed root by reading the header. This is the on-disk basis for the synchronous-commit durability guarantee described in [CAD036](../036_lattice_node/index.md).

### Keys and Content Addressing

Every key is exactly **32 bytes (256 bits)**. In normal use a key is the SHA3-256 Value ID of the stored cell's encoding, so a value is located by its own content hash. Etch does not interpret keys beyond using their bytes to navigate the index, and relies on their pseudo-random distribution for balance.

### Index Blocks

The store is indexed by a **radix tree** over the key bytes. Each index block is a contiguous array of 8-byte **slots** (pointers). The number of slots — the radix — depends on the level in the tree, so that the most significant bytes fan out widely near the root and narrowly deeper down:

| Level | Slots | Key material used |
|-------|-------|-------------------|
| 0 | 65536 | Bytes 0–1 (16 bits) |
| 1 | 256 | Byte 2 (8 bits) |
| 2–59 | 16 | Successive hex nibbles of bytes 3–31 (level 2 = high nibble of byte 3, level 3 = low nibble of byte 3, and so on) |

The root index block (level 0) sits at offset 44. To locate a key, a reader extracts the digit for the current level, reads that slot, and follows the pointer according to its type. The maximum depth is 60 levels, which exhausts all 32 key bytes.

### Slot and Pointer Encoding

Each slot is a big-endian **64-bit** value. A slot value of `0` means **empty**. Otherwise the top two bits give the pointer **type** and the low 62 bits give the absolute file offset of the target:

| Top 2 bits | Type | Target |
|------------|------|--------|
| `00` | Data pointer | A data record |
| `01` | Index pointer | A child index block (next level) |
| `10` | Chain start | A data record that begins a chained entry list |
| `11` | Chain continuation | A data record continuing a chained entry list |

### Data Records

A data record stores one cell:

| Size | Field | Description |
|------|-------|-------------|
| 32 | Key | The cell's Value ID |
| 1 | Flags | Reference flags, including the persistence **status** |
| 8 | Memory size | The cell's memory footprint ([CAD006](../006_memory/index.md)); `0` until the cell reaches PERSISTED status |
| 2 | Length | Length `N` of the encoding, as a big-endian short (always non-zero) |
| N | Encoding | The canonical [CAD003](../003_encoding/index.md) encoding of the cell |

The 1-byte flags field together with the 8-byte memory size form the record's mutable **label**; the key, length and encoding are fixed.

### Collision Handling and Chaining

When two distinct keys resolve to the same slot at some level, Etch first tries to store the newcomer in an **adjacent empty slot**, forming a short **chain**: the original slot is marked as a chain start (`10`) and each continuation is marked as a chain continuation (`11`). A lookup that lands on a chain start scans forward through the continuation slots, comparing keys.

When a chain cannot be extended — because the neighbouring slots are occupied by unrelated data — it is **collapsed** into a new child index block at the next level: the colliding records are re-inserted one level deeper, and the slot becomes an index pointer (`01`). This keeps index-block allocation lazy (deeper blocks are created only when genuinely needed) while bounding the length of any chain scan.

### Immutability and In-Place Label Updates

Once a record is written, its **key, length and encoding never change** — this is what makes the store content-addressable and safe for concurrent, lock-free reads.

The single exception is the **label**. A cell's persistence status may be upgraded in place — for example from STORED to PERSISTED — by rewriting the 1-byte flags field via an idempotent, monotonic merge, and the 8-byte memory size is filled in the first time a cell reaches PERSISTED. Because these updates are monotonic and never touch the encoding, a reader always observes a consistent record regardless of concurrent status upgrades.

### Memory-Mapped Regions

For access, the file is memory-mapped in **regions of up to 1 GiB** (with a small margin to accommodate writes near a region boundary), reflecting platform limits on individual mappings. This is a runtime access strategy only: it does not affect the logical byte layout, and all pointer offsets are absolute within the single file.

## Reference Implementation

The reference implementation lives in the Convex `convex-core` module (Java), package `convex.etch`.

| Concept | Class |
|---------|-------|
| File format, index navigation, read/write | `Etch` |
| Store binding and durable root data | `EtchStore` |
| Integrity-failure signal | `EtchCorruptionError` |
| Index traversal callback | `IEtchIndexVisitor` |
| Format utilities | `EtchUtils` |

The store abstraction that wraps Etch (caching layers, garbage collection and pinning) is a separate concern, intended for its own CAD.

## See Also

- [CAD002: CVM Values](../002_values/index.md) — Cells and references stored by Etch
- [CAD003: Encoding Format](../003_encoding/index.md) — Value IDs and the cell encodings stored in data records
- [CAD006: Memory Accounting](../006_memory/index.md) — The memory size recorded in each data record
- [CAD024: Data Lattice](../024_data_lattice/index.md) — Lattice data persisted through Etch
- [CAD036: Lattice Node](../036_lattice_node/index.md) — Durable-root commit built on the Etch root pointer
