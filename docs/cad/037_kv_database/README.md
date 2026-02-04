# CAD037: KV Database

## Overview

The KV Database is a replicated key-value store built on the [Data Lattice](../024_data_lattice/README.md). It provides Redis-like data structure operations with CRDT merge semantics, cryptographic signing of replicas, and automatic network replication via [Lattice Nodes](../036_lattice_node/README.md).

Each KV Database is a named, multi-writer store where independent nodes maintain signed replicas. Replicas converge through lattice merge without coordination, enabling offline-first distributed applications with rich data types.

## Motivation

Decentralised applications frequently need shared mutable state beyond what a global blockchain provides. Common requirements include:

- **Session data, caches, and configuration** that must be shared across nodes
- **Counters, sets, and sorted sets** that multiple writers update concurrently
- **Per-user or per-organisation databases** with cryptographic ownership
- **Offline-capable writes** that merge when connectivity is restored

Traditional distributed databases solve these problems with consensus protocols, leader election, or conflict resolution callbacks. The KV Database instead uses the mathematical properties of lattice merge to guarantee convergence without coordination.

### Design Goals

- Provide a familiar key-value API (GET, SET, DEL, HSET, SADD, INCR, etc.)
- Support multiple data types with type-appropriate CRDT merge strategies
- Enable per-database, per-node signed replicas for authentication
- Integrate with the standard lattice ROOT structure for network replication
- Maintain compatibility with the [Lattice Cursor](../035_cursors/README.md) system

## Specification

### Lattice Path

The KV Database occupies the `:kv` path in the standard lattice ROOT:

```
KeyedLattice {
    :data → DataLattice
    :fs   → OwnerLattice(MapLattice(DLFSLattice))
    :kv   → MapLattice(OwnerLattice(KVStoreLattice))
}
```

The full path to a specific replica is:

```
:kv / <db-name> / <owner-key> → SignedData(Index<AString, KVEntry>)
```

Where:
- **db-name** (AString) — the database name, a global namespace shared by all nodes
- **owner-key** (AccountKey) — the Ed25519 public key of the node owning this replica
- **SignedData** — the KV store state signed by the owner's key pair

### Lattice Composition

```
KVStoreLattice (singleton)
  └── IndexLattice<AString, AVector<ACell>>
        └── KVEntryLattice (singleton)
              └── per-type merge (LWW, structural, or PN-counter)
```

**MapLattice** at the database-name level merges per-name using OwnerLattice.

**OwnerLattice** at the owner level merges per-owner using SignedLattice, which validates Ed25519 signatures before accepting values.

**KVStoreLattice** merges the KV store contents using IndexLattice with KVEntryLattice for per-key merge.

### KV Entries

Each key in a KV store maps to a **KV Entry**, a positional vector:

```
[value, type, utime, expire]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | value | ACell | The stored value (structure depends on type) |
| 1 | type | CVMLong | Type tag (see Data Types below) |
| 2 | utime | CVMLong | Last modification timestamp (epoch millis) |
| 3 | expire | CVMLong | Expiry timestamp (0 = no expiry) |

#### Tombstones

A tombstone is an entry with `nil` value and `nil` type. The timestamp is preserved.

Tombstones are required for lattice-compatible deletes: since lattice values can only grow monotonically, a delete is represented as a tombstone that wins over older live entries during merge.

Implementations SHOULD support garbage collection of expired entries and old tombstones.

### Data Types

| Type Tag | Name | Value Structure | Merge Strategy |
|----------|------|-----------------|----------------|
| 0 | String | Any ACell | LWW by timestamp |
| 1 | Hash | `Index<AString, [value, timestamp]>` | Per-field LWW |
| 2 | Set | `Index<ABlob, [member, addTime, removeTime]>` | Max timestamps per member |
| 3 | Sorted Set | `Index<ABlob, [member, score, addTime, removeTime]>` | Max timestamps; score from latest add |
| 4 | List | `AVector<ACell>` | LWW by timestamp |
| 5 | Counter | `Index<AString, [positive, negative]>` | PN-Counter (max per replica per column) |

### Merge Semantics

KV entry merge follows these rules, evaluated in order:

1. **Equal entries** — return own (identity)
2. **One side nil** — return the other (with foreign value check)
3. **Same type, mergeable** (hash, set, sorted set, counter) — structural merge with max timestamp
4. **Otherwise** (string, list, or type conflict) — newer timestamp wins (LWW)
5. **Tombstone vs live** — newer timestamp wins

These rules satisfy the lattice properties:
- **Commutative**: merge(a, b) = merge(b, a)
- **Associative**: merge(merge(a, b), c) = merge(a, merge(b, c))
- **Idempotent**: merge(a, a) = a

#### String/List Merge (LWW)

The entry with the greater timestamp wins. Equal timestamps favour the first operand for determinism.

#### Hash Merge

Each field is independently merged by LWW on its per-field timestamp. Fields present in only one side are included. Field tombstones (nil value with timestamp) propagate deletes.

#### Set Merge

Each member is tracked with add and remove timestamps. A member is present when `addTime > removeTime`. Merge takes the maximum of each timestamp independently, ensuring adds and removes from different replicas combine correctly (OR-Set semantics).

#### Counter Merge (PN-Counter)

Each replica maintains independent positive and negative accumulators identified by a replica ID. Merge takes the maximum of each accumulator per replica. The counter value is `sum(positive) - sum(negative)` across all replicas.

```
Replica "node-0": [positive=3, negative=1]
Replica "node-1": [positive=5, negative=0]
Counter value = (3 + 5) - (1 + 0) = 7
```

#### Sorted Set Merge

Combines set membership semantics with scores. Each member tracks add/remove timestamps and a score. The score from the entry with the latest add timestamp is used. Membership follows the same rule as sets.

### TTL and Expiry

Entries MAY have an expiry timestamp at position 3.

- **0** means no expiry
- A positive value is the absolute epoch millis at which the entry expires

Implementations SHOULD check expiry on read and return nil for expired entries. Implementations SHOULD provide a garbage collection operation to remove expired entries.

### Signed Replicas

Each node signs its KV store state with an Ed25519 key pair. The signed state is:

```
SignedData(Index<AString, KVEntry>)
```

This provides:
- **Authentication** — only the key holder can produce valid signatures
- **Integrity** — any tampering invalidates the signature
- **Non-repudiation** — the signer cannot deny authorship

### Replication Model

The KV Database uses a **merge-on-write** replication model:

1. Each node maintains its own signed replica
2. The node publishes its replica into the lattice at `:kv / <db-name>`
3. Lattice Nodes (CAD036) automatically propagate signed replicas to peers
4. On the receiving side, the OwnerLattice merge combines signed entries from all owners
5. The application reads the merged owner map and calls `mergeReplicas()` to absorb remote data into the local KV store

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Node A  │         │  Node B  │         │  Node C  │
│          │         │          │         │          │
│ KVDatabase        │ KVDatabase        │ KVDatabase│
│  key-a   │         │  key-b   │         │  key-c   │
│          │         │          │         │          │
│ export() │         │ export() │         │ export() │
│    ↓     │         │    ↓     │         │    ↓     │
│ :kv/db/A │◄───────►│ :kv/db/B │◄───────►│ :kv/db/C │
│          │  Lattice │          │  Lattice │          │
│          │   Merge  │          │   Merge  │          │
└──────────┘         └──────────┘         └──────────┘
      │                    │                    │
      └────────────────────┼────────────────────┘
                           │
              All converge to same owner map:
              { A→signed(storeA),
                B→signed(storeB),
                C→signed(storeC) }
```

#### Selective Merge

Applications MAY filter which replicas to merge using a predicate on the owner's AccountKey. This enables:
- Trusting only known peers
- Ignoring revoked or untrusted keys
- Implementing access control lists

#### Signature Validation

`mergeReplicas()` MUST validate signatures before merging. Entries with invalid signatures MUST be rejected. After deserialisation, owner keys MAY appear as raw blobs rather than typed AccountKey instances; implementations MUST handle this by resolving the key from its blob representation.

## Operations

### Core KV

| Operation | Description |
|-----------|-------------|
| `get(key)` | Get value for key (nil if absent or expired) |
| `set(key, value)` | Set string value |
| `set(key, value, ttl)` | Set with TTL in milliseconds |
| `del(key)` | Delete key (creates tombstone) |
| `exists(key)` | Check if key exists and is not expired |
| `keys()` | Return all live keys |
| `type(key)` | Return type name of key's value |
| `expire(key, ttl)` | Set expiry on existing key |
| `ttl(key)` | Get remaining TTL (-1 = no expiry, -2 = not found) |

### Hash

| Operation | Description |
|-----------|-------------|
| `hset(key, field, value)` | Set hash field |
| `hget(key, field)` | Get hash field value |
| `hdel(key, field)` | Delete hash field |
| `hexists(key, field)` | Check if hash field exists |
| `hgetall(key)` | Get all fields and values |
| `hlen(key)` | Get number of fields |

### Set

| Operation | Description |
|-----------|-------------|
| `sadd(key, members...)` | Add members to set |
| `srem(key, members...)` | Remove members from set |
| `sismember(key, member)` | Check membership |
| `smembers(key)` | Get all members |
| `scard(key)` | Get set cardinality |

### Counter (PN-Counter)

| Operation | Description |
|-----------|-------------|
| `incr(key)` | Increment by 1 |
| `incrby(key, amount)` | Increment by amount |
| `decr(key)` | Decrement by 1 |
| `decrby(key, amount)` | Decrement by amount |

Counter operations require a **replica ID** to identify the calling node. Each replica maintains independent accumulators.

### Sorted Set

| Operation | Description |
|-----------|-------------|
| `zadd(key, score, member)` | Add member with score |
| `zrem(key, members...)` | Remove members |
| `zscore(key, member)` | Get member's score |
| `zrange(key, start, stop)` | Get members by score range |
| `zcard(key)` | Get cardinality |

### List

| Operation | Description |
|-----------|-------------|
| `lpush(key, values...)` | Prepend values |
| `rpush(key, values...)` | Append values |
| `lpop(key)` | Remove and return first element |
| `rpop(key)` | Remove and return last element |
| `lrange(key, start, stop)` | Get range of elements |
| `llen(key)` | Get list length |

Lists use LWW merge on the entire list. They are not CRDT-friendly for concurrent modification; applications requiring concurrent list operations SHOULD use sets or sorted sets instead.

### Maintenance

| Operation | Description |
|-----------|-------------|
| `gc()` | Remove expired entries and old tombstones |

---

## Reference Implementation

A reference implementation is provided in the Convex `convex-core` and `convex-peer` modules (Java).

### Classes

| Specification Concept | Java Class | Package |
|-----------------------|------------|---------|
| KV Store Lattice | `KVStoreLattice` | `convex.lattice.kv` |
| KV Entry utilities | `KVEntry` | `convex.lattice.kv` |
| KV Entry merge | `KVEntryLattice` | `convex.lattice.kv` |
| KV API facade | `LatticeKV` | `convex.lattice.kv` |
| Database wrapper | `KVDatabase` | `convex.lattice.kv` |
| Hash operations | `KVHash` | `convex.lattice.kv` |
| Set operations | `KVSet` | `convex.lattice.kv` |
| Counter operations | `KVCounter` | `convex.lattice.kv` |
| Sorted set operations | `KVSortedSet` | `convex.lattice.kv` |
| List operations | `KVList` | `convex.lattice.kv` |
| Index lattice (generic) | `IndexLattice` | `convex.lattice.generic` |

### Example: Local KV Operations

```java
// Create a KV database with signing key
AKeyPair keyPair = AKeyPair.generate();
KVDatabase db = KVDatabase.create("mydb", keyPair, "node-1");

// String operations
db.kv().set("user:alice", Strings.create("Alice"));
db.kv().set("config:timeout", CVMLong.create(30000));

// Hash operations
db.kv().hset("user:1", "name", Strings.create("Alice"));
db.kv().hset("user:1", "email", Strings.create("alice@example.com"));

// Set operations
db.kv().sadd("tags", Strings.create("alpha"), Strings.create("beta"));
boolean isMember = db.kv().sismember("tags", Strings.create("alpha"));

// Counter (PN-Counter with replica ID)
db.kv().incr("page-views");
db.kv().incrby("page-views", 10);
long views = db.kv().incrby("page-views", 0); // read current value

// TTL
db.kv().set("session:abc", Strings.create("data"), 3600000); // 1 hour TTL
long remaining = db.kv().ttl("session:abc");
```

### Example: Multi-Node Replication

```java
// Create two nodes with different keys
AKeyPair keyA = AKeyPair.generate();
AKeyPair keyB = AKeyPair.generate();

KVDatabase dbA = KVDatabase.create("shared", keyA, "node-a");
KVDatabase dbB = KVDatabase.create("shared", keyB, "node-b");

// Each writes different data
dbA.kv().set("from-a", Strings.create("hello"));
dbA.kv().incr("counter");

dbB.kv().set("from-b", Strings.create("world"));
dbB.kv().incr("counter");

// Exchange signed replicas
dbA.mergeReplicas(dbB.exportReplica());
dbB.mergeReplicas(dbA.exportReplica());

// Both now see all data
dbA.kv().get("from-b");             // "world"
dbA.kv().incrby("counter", 0);     // 2 (PN-counter merged)
```

### Example: Network Replication via Lattice Nodes

```java
// Create NodeServers with Lattice.ROOT
NodeServer<?> server1 = new NodeServer<>(Lattice.ROOT, store1, 19800);
NodeServer<?> server2 = new NodeServer<>(Lattice.ROOT, store2, 19801);
server1.launch();
server2.launch();

// Connect peers
server1.addPeer(ConvexRemote.connect(addr(19801)));
server2.addPeer(ConvexRemote.connect(addr(19800)));

// Create KV databases and write data
KVDatabase db1 = KVDatabase.create("shared", key1, "node-1");
db1.kv().set("key", Strings.create("value"));

// Publish signed replica to lattice
AHashMap<ACell, ACell> kvMap = Maps.of(dbName, db1.exportReplica());
server1.updateLocalPath(kvMap, Keywords.KV);

// Sync — LatticePropagator broadcasts automatically
server1.sync();

// Read merged owner map from peer's lattice
AHashMap<?,?> ownerMap = (AHashMap) kvMap.get(dbName);
db1.mergeReplicas(ownerMap);
```

## See Also

- [CAD002: CVM Values](../002_values/README.md) - Value types used in KV entries
- [CAD003: Encoding](../003_encoding/README.md) - Binary encoding format
- [CAD024: Data Lattice](../024_data_lattice/README.md) - Theoretical foundation
- [CAD035: Lattice Cursors](../035_cursors/README.md) - Cursor system for atomic state access
- [CAD036: Lattice Node](../036_lattice_node/README.md) - Network replication infrastructure
- [CAD028: DLFS](../028_dlfs/README.md) - Distributed filesystem (similar lattice pattern)
