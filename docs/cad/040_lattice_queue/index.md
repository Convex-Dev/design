# CAD040: Lattice Queue

## Overview

The Lattice Queue is a replicated append-only log built on the [Data Lattice](../024_data_lattice/index.md). It provides Kafka-style streaming semantics — ordered records, offset-based access, independent consumer positions, and log truncation — with CRDT merge for automatic replication via [Lattice Nodes](../036_lattice_node/index.md).

Where the [KV Database](../037_kv_database/index.md) models shared mutable state, the Lattice Queue models an ordered stream of events. Together they cover the two fundamental patterns of distributed data: state and logs.

## Motivation

Distributed systems frequently need ordered, durable message streams between producers and consumers. Common requirements include:

- **Task queues** where work items are dispatched to processing agents
- **Event logs** recording actions for audit, replay, or downstream consumption
- **Message channels** enabling asynchronous communication between services
- **Change feeds** propagating updates across organisational or network boundaries

Traditional message brokers (Kafka, RabbitMQ, NATS) solve these problems with centralised infrastructure. The Lattice Queue instead uses lattice merge to provide convergent replication without brokers, enabling offline-capable, peer-to-peer streaming.

### Design Goals

- Provide a familiar offset-based log abstraction (append, read-by-offset, range queries)
- Support Kafka-compatible record structures (key, value, timestamp, headers)
- Enable log truncation while preserving offset continuity
- Maintain queue-level metadata for naming, configuration, and provenance
- Integrate with the [Lattice Cursor](../035_cursors/index.md) system for atomic state access
- Support lattice fork/sync for conflict-free distributed replication

## Key Concepts

### Append-Only Log

A Lattice Queue is an ordered sequence of records, each assigned a monotonically increasing **offset** — an integer starting from zero. Records are appended at the tail and are never modified in place. This is the same fundamental abstraction as a Kafka partition or a database write-ahead log.

The append-only property maps naturally to lattice semantics: the log only grows, making it monotonic by construction. Merging two copies of the same log produces the longer (more complete) version.

### Offsets

Every record in the queue has an **absolute offset** — its permanent position in the log's history. Offsets are stable: once a record is assigned offset `n`, that assignment never changes, even after truncation or replication.

```
offset:   0     1     2     3     4     5
        ┌─────┬─────┬─────┬─────┬─────┬─────┐
        │ r0  │ r1  │ r2  │ r3  │ r4  │ r5  │
        └─────┴─────┴─────┴─────┴─────┴─────┘
                            ↑                 ↑
                        startOffset       endOffset
                          (after truncation of 0-2)
```

The queue tracks a **start offset** — the absolute offset of the first physically present record. When leading records are truncated, the start offset advances. The **end offset** is the next offset to be assigned (exclusive). The number of physically present records is always `endOffset - startOffset`.

### Consumer Model

Unlike traditional queues where consuming a message removes it, Lattice Queue records persist until explicitly truncated. Multiple consumers read independently by maintaining their own **consumer offset** — the next offset they wish to read.

This decouples production from consumption. A fast consumer reads records as they arrive; a slow consumer catches up at its own pace; a new consumer can start from any offset. Producers and consumers need not be online at the same time.

Consumer offsets are external to the queue itself. They MAY be stored in a [KV Database](../037_kv_database/index.md), in application state, or in any other persistent store.

### Single-Leader Append

A Lattice Queue follows a **single-leader** model: one writer appends records, and replicas converge by adopting the longer log. This mirrors Kafka's partition model where each partition has exactly one leader that accepts writes.

This design ensures that offset assignment is deterministic and conflict-free. Multiple replicas of the same queue always agree on which record occupies each offset.

Applications requiring multiple independent writers SHOULD use separate queues per writer, or coordinate writes through a single leader node.

### Truncation

Truncation advances the start offset and discards records before it. This reclaims storage for records that all consumers have processed.

Truncation is monotonic: the start offset can only increase. In a lattice merge, the higher start offset wins, ensuring truncation decisions propagate consistently across replicas.

## Specification

### Queue State

The queue state is a positional vector with four slots:

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | entries | Vector | Append-only vector of entry records |
| 1 | metadata | Map | Queue metadata (name, configuration, provenance) |
| 2 | timestamp | Integer | Last update timestamp (epoch milliseconds) |
| 3 | startOffset | Integer | Absolute offset of the first entry in the vector |

The absolute offset of `entries[i]` is `startOffset + i`.

### Queue Entry (Record)

Each record is a positional vector with four slots, designed for Kafka compatibility:

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | key | any / nil | Record key (for partitioning, compaction, or routing) |
| 1 | value | any | Record payload |
| 2 | timestamp | Integer | Producer timestamp (epoch milliseconds) |
| 3 | headers | Map / nil | Arbitrary key-value metadata |

The **key** field is optional. When present, it enables downstream processors to partition, group, or compact records by key — the same role keys play in Kafka.

The **headers** field carries out-of-band metadata (correlation IDs, tracing context, content types) without modifying the payload.

### Merge Semantics

Queue merge follows a single-leader convergence model. Given two copies of the same queue, the merge produces the version with the most information:

1. **Start offset** — take the maximum (truncation is monotonic and irreversible)
2. **Timestamp** — take the maximum (most recent update wins)
3. **Metadata** — map union (include keys from both sides; own entry wins on key conflict)
4. **Entries** — align both vectors to the merged start offset by trimming any prefix that falls below it, then take the longer vector

These rules satisfy the lattice properties:

- **Commutative**: merge(a, b) produces the same result as merge(b, a) for all convergent state
- **Associative**: merge(merge(a, b), c) = merge(a, merge(b, c))
- **Idempotent**: merge(a, a) = a

Under the single-leader model, entries at the same offset are always identical across replicas, so the "take longer vector" rule is sufficient. If entries were to differ (a violation of the single-leader assumption), the merge is still well-defined: the first operand's entries take precedence.

### Metadata

The metadata map carries queue-level configuration and identity information. Metadata keys SHOULD be keywords. Example keys:

| Key | Description |
|-----|-------------|
| `:name` | Human-readable queue name |
| `:owner` | Owner identity (DID, address, or public key) |
| `:created` | Creation timestamp |
| `:retention` | Retention policy hint (e.g. max age or max records) |

Metadata merges by map union: keys from both sides are included, with the local entry winning on conflict. Applications SHOULD treat metadata as configuration that is set once or updated infrequently.

## Operations

### Producer

| Operation | Description |
|-----------|-------------|
| `offer(value)` | Append a record with the given value; auto-assigns timestamp |
| `offer(key, value)` | Append a keyed record |
| `offer(key, value, headers)` | Append a full record with headers |

All `offer` variants return the absolute offset assigned to the new record.

### Consumer

| Operation | Description |
|-----------|-------------|
| `peek(offset)` | Read the value at an absolute offset (nil if out of range) |
| `peekEntry(offset)` | Read the full record at an absolute offset |
| `peekFirst()` / `peekLast()` | Read the first / last value |
| `peekFirstEntry()` / `peekLastEntry()` | Read the first / last full record |
| `range(from, to)` | Read values in an offset range (inclusive) |

Consumer operations are read-only and do not modify the queue.

### Queue Info

| Operation | Description |
|-----------|-------------|
| `startOffset()` | First valid absolute offset |
| `endOffset()` | Next offset to be written (exclusive) |
| `size()` | Number of records physically present |
| `isEmpty()` | Whether the queue contains any records |

### Metadata

| Operation | Description |
|-----------|-------------|
| `getMeta(key)` | Read a metadata value |
| `setMeta(key, value)` | Write a metadata value |

### Truncation

| Operation | Description |
|-----------|-------------|
| `truncate(newStartOffset)` | Advance start offset and discard earlier records |

Truncation only advances forward. A `newStartOffset` less than or equal to the current start offset is a no-op.

### Lattice Operations

| Operation | Description |
|-----------|-------------|
| `fork()` | Create an independent copy for isolated work |
| `sync()` | Merge a forked copy back to its parent |

Fork and sync follow the standard [Lattice Cursor](../035_cursors/index.md) semantics.

## Reference Implementation

A reference implementation is provided in the Convex `convex-core` module (Java), in the `convex.lattice.queue` package.

| Concept | Class |
|---------|-------|
| Queue state lattice | `QueueLattice` |
| Record structure utilities | `QueueEntry` |
| Queue API | `LatticeQueue` |

## See Also

- [CAD024: Data Lattice](../024_data_lattice/index.md) — Theoretical foundation for lattice data structures
- [CAD035: Lattice Cursors](../035_cursors/index.md) — Cursor system for atomic state access, fork, and sync
- [CAD036: Lattice Node](../036_lattice_node/index.md) — Network replication infrastructure
- [CAD037: KV Database](../037_kv_database/index.md) — Complementary state-oriented lattice data structure
- [CAD038: Lattice Authentication](../038_lattice_auth/index.md) — Owner verification for signed lattice values
