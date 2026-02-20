# CAD036: Lattice Node

## Overview

A Lattice Node is a networked server that participates in Data Lattice replication. Unlike full Convex Peers that implement Convergent Proof of Stake consensus for global state, Lattice Nodes focus exclusively on CRDT-based synchronisation of lattice values across a distributed network.

Lattice Nodes enable decentralised applications to share and replicate data without blockchain consensus overhead, while still benefiting from content-addressable storage, Merkle verification, and automatic conflict resolution through lattice merge semantics.

## Motivation

The Data Lattice (CAD024) provides the theoretical foundation for decentralised data storage. However, applications need practical infrastructure to:

1. **Host and serve lattice data** - Nodes that store and make data available
2. **Synchronise across networks** - Automatic replication between distributed nodes
3. **Handle partial data** - Recover missing data from peers during merges
4. **Propagate updates efficiently** - Minimise bandwidth with delta encoding
5. **Detect divergence** - Lightweight mechanisms to identify out-of-sync nodes

Lattice Nodes provide this infrastructure as a lightweight alternative to full blockchain peers, suitable for:
- Distributed file systems (DLFS - see CAD028)
- Content delivery networks
- Collaborative applications
- Federated data sharing
- Off-chain data for hybrid dApps

## Specification

### Node Architecture

A Lattice Node consists of the following logical components:

```
┌─────────────────────────────────────────────────────────────┐
│                       Lattice Node                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Cursor    │  │   Lattice   │  │       Store         │ │
│  │  (State)    │  │  (Merge)    │  │   (Persistence)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  Network Server                         ││
│  │  • Message handling (PING, QUERY, VALUE, DATA_REQUEST) ││
│  │  • Peer connections                                     ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 Update Propagator                       ││
│  │  • Delta broadcasting                                   ││
│  │  • Root sync                                            ││
│  │  • Novelty detection                                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### Cursor (State)

Each node maintains a cursor (see CAD035) pointing to its current lattice value.

The cursor MUST:
- Provide atomic read/write operations
- Support path-based access into nested structures
- Enable thread-safe concurrent updates

#### Lattice (Merge)

The lattice defines merge semantics for conflict resolution.

The lattice MUST:
- Satisfy CRDT properties (commutative, associative, idempotent)
- Provide a `zero` identity value
- Validate foreign values before merging via `checkForeign()`
- Support hierarchical path navigation to sub-lattices

#### Store (Persistence)

The store provides content-addressable storage for lattice values.

The store MUST:
- Support retrieval by cryptographic hash (SHA3-256)
- Track which data has been announced (for delta encoding)
- Handle persistence of Merkle tree structures
- Use the encoding format specified in CAD003

### Network Protocol

Lattice Nodes communicate using a binary protocol. Messages use the encoding format specified in CAD003.

#### Message Framing

Messages are framed as:
- VLQ-encoded length prefix
- Message payload (encoded per CAD003)

#### Message Types

| Type ID | Name | Description |
|---------|------|-------------|
| 5 | DATA_REQUEST | Request missing data cells |
| 12 | PING | Connectivity test |
| 14 | LATTICE_VALUE | Announce lattice value update |
| 15 | LATTICE_QUERY | Request lattice value at path |

#### PING (Type 12)

Connectivity test message.

**Request format:**
```
[:PING id]
```
- `id`: Request identifier (any CVM value)

**Response:** Result message containing `(id, "PONG")`

Nodes MUST respond to PING messages with a Result containing the same ID.

#### LATTICE_QUERY (Type 15)

Request lattice value at a path.

**Request format:**
```
[:LQ id path]
```
- `id`: Request identifier (for correlating response)
- `path`: Vector of keys specifying path into lattice (empty vector `[]` = root)

**Response:** Result message containing `(id, value)`
- `value`: Lattice value at the requested path (encoded per CAD003)

Nodes MUST respond with the current value at the specified path, or an error Result if the path is invalid.

#### LATTICE_VALUE (Type 14)

Announce a lattice value update.

**Message format:**
```
[:LV path value]
```
- `path`: Vector of keys specifying path (empty vector `[]` = root)
- `value`: New lattice value to merge (encoded per CAD003)

Messages MAY include delta-encoded data for bandwidth efficiency (see Delta Encoding below).

Upon receiving a LATTICE_VALUE message, nodes MUST:
1. Extract the path from the message
2. Validate the path against the lattice structure
3. Validate the foreign value using `checkForeign()`
4. Merge the value using lattice semantics
5. Handle missing data by acquiring from peers (see Missing Data Recovery)
6. Trigger propagation of merged changes

#### DATA_REQUEST (Type 5)

Request missing data cells by hash.

**Request format:**
```
[:DR id hash1 hash2 ...]
```
- `id`: Request identifier
- `hash1, hash2, ...`: SHA3-256 hashes of missing data cells (32-byte blobs)

**Response:** Message containing requested cells

Nodes SHOULD respond with available data from their store. Unavailable cells SHOULD be encoded as nil values.

### Value Encoding

All values exchanged between nodes MUST use the canonical encoding format specified in CAD003.

Key encoding properties:
- All CVM values have a unique canonical encoding
- Value ID = SHA3-256 hash of encoding
- Merkle tree structure enables incremental verification
- Multi-cell encoding supports complex nested values

### Missing Data Recovery

Lattice values are Merkle trees that may reference data not yet available locally. Nodes MUST implement missing data recovery.

#### Speculative Merge Pattern

1. Attempt merge with received value
2. If merge fails due to missing data, capture the missing hash
3. Acquire missing data from connected peers via DATA_REQUEST
4. Retry merge (up to configurable limit)
5. Commit merged value on success

**Recommended parameters:**
- Maximum retry attempts: 3
- Acquisition timeout per peer: 5 seconds

#### Data Acquisition Algorithm

```
function acquire(missingHash):
    for each connectedPeer:
        response = sendDataRequest(peer, missingHash)
        if response contains data:
            store data locally
            return data
    return null (acquisition failed)
```

### Delta Encoding

To minimise bandwidth, nodes SHOULD implement delta encoding for LATTICE_VALUE messages.

#### Novelty Detection

Nodes track which cells have been "announced" to the store. When broadcasting:
1. Walk the value's Merkle tree
2. Collect cells not previously announced
3. Mark collected cells as announced
4. Encode only novel cells

#### Delta Message Format

LATTICE_VALUE messages include encoded message data:
- Standard encoding: Only the value's top cell
- Delta encoding: All novel cells in dependency order

Receivers reconstruct the full value by:
1. Decoding received cells into local store
2. Resolving the top cell's references
3. Acquiring any still-missing data from peers

### Update Propagation

Nodes SHOULD implement automatic propagation of updates to peers.

#### Broadcast Triggers

Propagation SHOULD be triggered when:
- Local value changes (via cursor update)
- Merge produces a new value
- Periodic root sync interval elapses

#### Timing Parameters

| Parameter | Recommended Value | Description |
|-----------|-------------------|-------------|
| MIN_BROADCAST_DELAY | 50ms | Minimum time between broadcasts |
| ROOT_SYNC_INTERVAL | 30 seconds | Interval for root-only sync |

#### Delta Broadcasting

When local values change:
1. Detect novel cells (not previously announced)
2. Create delta-encoded LATTICE_VALUE message
3. Broadcast to all connected peers
4. Track announced values to avoid redundant transmission

#### Root Sync

Nodes SHOULD periodically broadcast root-only messages containing only the top cell's encoding.

Root sync provides:
- Lightweight divergence detection (typically 50-200 bytes)
- Trigger for pull-based recovery via DATA_REQUEST
- Bandwidth-efficient heartbeat mechanism

Receivers detecting divergence (merge triggers missing data) will automatically acquire missing cells.

### Peer Management

Nodes maintain connections to peer nodes for synchronisation.

#### Connection Operations

Nodes MUST support:
- `addPeer(connection)`: Add a peer connection
- `removePeer(connection)`: Remove a peer connection
- `getPeers()`: List current peer connections

Nodes SHOULD maintain persistent connections for efficient messaging.

Nodes MAY support automatic peer discovery (implementation-defined).

#### Synchronisation Operations

- **Manual sync**: Request root value from peer via LATTICE_QUERY, merge response
- **Automatic sync**: Propagator broadcasts to all connected peers on changes

### Path-Based Operations

Lattice Nodes support hierarchical access into nested lattice structures.

#### Path Semantics

- Empty path (`[]`) refers to root value
- Single key path (`[:key]`) accesses first level
- Deep path (`[:a :b :c]`) navigates nested structures

Path operations MUST:
- Use the sub-lattice at the path for merge semantics
- Apply updates atomically to the root cursor
- Support arbitrary nesting depth

#### Sub-Lattice Resolution

Given a path, nodes resolve the applicable sub-lattice:
1. Start with root lattice
2. For each path key, navigate to child lattice
3. Use child lattice's merge semantics for that path

#### JSON Key Compatibility

Lattice paths internally use CVM-native key types (Keywords, AccountKeys, etc.), but JSON-based APIs address paths using JSON-native types (strings, integers). Each lattice level provides a `resolveKey` function that translates an external key to the canonical CVM key for that level:

| Lattice Level | JSON Key | Canonical CVM Key |
|---------------|----------|-------------------|
| KeyedLattice (root) | `"kv"` | Keyword `:kv` |
| OwnerLattice | `"0x49b44c..."` | ABlob (parsed hex) |
| SignedLattice | `"value"` | Keyword `:value` |
| Vector-valued (e.g. DLFSLattice) | `"0"` | AInteger `0` (parsed numeric string for vector position) |
| MapLattice / IndexLattice | `"mykey"` | AString (identity) |

The reverse mapping (`toJSONKey`) converts canonical keys back to JSON representations: Keywords become their name strings, blobs become hex strings, and other types pass through unchanged.

JSON-based callers MUST resolve each path element through `resolveKey` before using standard lattice operations. CVM-native code that already uses canonical key types does not need resolution.

### Thread Safety

Lattice Nodes MUST be thread-safe:
- Cursor operations MUST be atomic
- Multiple concurrent merges MUST produce consistent results
- Propagation MUST not interfere with local operations

Implementations SHOULD use appropriate synchronisation primitives (atomic references, locks, etc.) for the target language/platform.

## Standard Lattice Types

Nodes MAY implement these standard lattice types:

| Type | Merge Behaviour | Zero Value |
|------|-----------------|------------|
| SetLattice | Set union | Empty set |
| MaxLattice | Maximum value | 0 (or min value) |
| MapLattice | Recursive merge of entries | Empty map |
| DataLattice | Union of hash-indexed values | Empty index |
| SignedLattice | Validates signatures, merges child | nil |
| OwnerLattice | Per-owner signed data maps | Empty map |

The standard ROOT lattice structure uses a `KeyedLattice` backed by an `Index<Keyword, ACell>`, which provides lexicographic key ordering and compatibility with both CVM keyword paths and JSON string paths (keywords and strings share the same blob representation in the Index):

```
KeyedLattice (Index<Keyword, ACell>) {
    :data → DataLattice
    :fs   → OwnerLattice(MapLattice(DLFSLattice))
    :kv   → MapLattice(OwnerLattice(KVStoreLattice))
}
```

## Comparison with CPoS Peers

| Aspect | Lattice Node | CPoS Peer |
|--------|--------------|-----------|
| Purpose | Data replication | Global consensus |
| Consensus | None (CRDT merge) | Convergent Proof of Stake |
| State | Single lattice value | Full blockchain state |
| Messages | 4 types | Many (BELIEF, TRANSACT, etc.) |
| Authentication | Optional (per lattice type) | Ed25519 required |
| Ordering | Unordered (commutative) | Ordered transactions |

## Security Considerations

### Foreign Value Validation

Nodes MUST validate all received values using `checkForeign()` before merging. This prevents:
- Malformed data injection
- Type confusion attacks
- Invalid lattice structures

### Signature Verification

When using SignedLattice or OwnerLattice types, nodes MUST verify Ed25519 signatures on received data before accepting merges.

### Denial of Service Mitigation

Implementations SHOULD:
- Rate-limit incoming connections
- Limit maximum message sizes
- Timeout slow peers
- Bound retry attempts for data acquisition
- Limit concurrent pending requests

## Configuration

Lattice Nodes require the following configuration:

| Parameter | Required | Description |
|-----------|----------|-------------|
| Lattice | Yes | Lattice type defining merge semantics |
| Store | Yes | Storage backend for persistence |
| Port | No | Network port (default: implementation-defined) |

Optional configuration:
- Initial peer list
- Propagation timing parameters
- Retry limits
- Maximum message size

---

## Reference Implementation

A reference implementation is provided in the Convex `convex-peer` module (Java).

### Classes

| Specification Concept | Java Class | Package |
|-----------------------|------------|---------|
| Lattice Node | `NodeServer<V>` | `convex.node` |
| Update Propagator | `LatticePropagator<V>` | `convex.node` |

### Example (Java)

```java
// Create lattice node with SetLattice semantics
ALattice<ASet<ACell>> lattice = SetLattice.INSTANCE;
AStore store = EtchStore.createTemp();
Integer port = 19999;

NodeServer<ASet<ACell>> node = new NodeServer<>(lattice, store, port);
node.launch();

// Update local value
ASet<ACell> data = Sets.of("item1", "item2");
node.updateLocal(data);

// Connect to peer
Convex peer = Convex.connect(new InetSocketAddress("peer.example.com", 19999));
node.addPeer(peer);

// Manual sync with peer
node.sync(peer).join();

// Get current value
ASet<ACell> current = node.getLocalValue();

// Access via cursor
ACursor<ASet<ACell>> cursor = node.getCursor();
cursor.updateAndGet(set -> set.include(Strings.create("item3")));

// Clean up
node.close();
```

### Implementation Notes

- The Java implementation uses Netty for network I/O
- Thread safety is provided via `java.util.concurrent.atomic.AtomicReference`
- Delta encoding uses the `Cells.announce()` mechanism for novelty detection
- Other language implementations should use equivalent networking and concurrency primitives

## See Also

- [CAD002: CVM Values](../002_values/index.md) - Value types
- [CAD003: Encoding](../003_encoding/index.md) - Binary encoding format
- [CAD024: Data Lattice](../024_data_lattice/index.md) - Theoretical foundation
- [CAD028: DLFS](../028_dlfs/index.md) - Distributed filesystem
- [CAD035: Lattice Cursors](../035_cursors/index.md) - Cursor system
- [CAD037: KV Database](../037_kv_database/index.md) - Replicated key-value store
