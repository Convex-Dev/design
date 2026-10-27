# CAD036: Lattice Node

## Overview

A Lattice Node is a networked server that participates in Data Lattice replication. Unlike full Convex Peers that implement Convergent Proof of Stake consensus for global state, Lattice Nodes focus exclusively on CRDT-based synchronisation of lattice values across a distributed network.

Lattice Nodes enable decentralised applications to share and replicate data without blockchain consensus overhead, while still benefiting from content-addressable storage, Merkle verification, and automatic conflict resolution through lattice merge semantics.

## Scope

This CAD specifies **network delivery and replication of hosted state**.
[CAD024](/docs/cad/data_lattice) defines abstract merge semantics and
[CAD038](/docs/cad/lattice_auth) defines authorisation. The normal implementation
delegates incoming values to application components assembled over a host, as
specified in [CAD045](/docs/cad/lattice_apps). References here to a node's lattice
describe the served semantics; they do not require the transport to own a lattice
object, choose a signer or implement domain merges. Cursor mechanics belong to
[CAD035](/docs/cad/cursors).

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
┌──────────────────────────────────────────────────────────────┐
│                        Lattice Node                          │
│  Host + Applications + Authoritative Store Root             │
│  Merge + Logical Publication + Durability                   │
├──────────────────────────────────────────────────────────────┤
│  Shared listener: socket acceptance and group assignment    │
├───────────────────────┬──────────────────────────────────────┤
│ Propagation Group A   │ Propagation Group B (optional)       │
│ routes + trust        │ routes + trust                       │
│ protocol endpoint     │ protocol endpoint                    │
│ filtered serving view │ filtered serving view                │
│ serving store         │ serving store                        │
└───────────────────────┴──────────────────────────────────────┘
```

#### Cursor (State)

Each node maintains a cursor (see CAD035) pointing to its current lattice value.

The cursor MUST:
- Provide atomic read/write operations
- Support path-based access into nested structures
- Enable thread-safe concurrent updates

#### Lattice (Merge)

The hosted application defines merge behaviour consistent with CAD024 and the
served regions' specifications. Foreign validation and CAD038 authorisation MUST
be enforced at the receiving merge boundary; a separate `checkForeign` pre-check
is not sufficient. Components may delegate these operations to reusable lattices.

The host routes roots and paths to configured application components. The node
transport MUST NOT bypass that policy by directly applying a child lattice to
published storage. Components own staging and publication decisions under CAD045;
the transport replicates the resulting published host state.

#### Store (Persistence)

The store provides content-addressable storage for lattice values.

The store MUST:
- Support retrieval by cryptographic hash (SHA3-256)
- Track which data has been announced (for delta encoding)
- Handle persistence of Merkle tree structures
- Use the encoding format specified in CAD003

#### Store Publication and Durability

Published state and its reachable cells MUST be available from the node's
serving store before the node advertises that state as available. Retention and
store-relative persistence are defined by [CAD048](/docs/cad/stores).
Concurrent publication MUST NOT allow completion of an older publication to
replace a newer authoritative root with an obsolete snapshot.

Publication and replication acknowledgement do not by themselves imply crash
durability. A service offering a durable acknowledgement MUST state its
durability guarantee and ensure that the acknowledged state and its reachable
cells satisfy that guarantee before issuing the acknowledgement. Storage failure
MUST NOT be reported as durable success. A durability failure does not imply
rollback of state already published or replicated.

Implementations MAY use volatile storage or batch durable writes. This CAD does
not prescribe application APIs, flushing schedules or ownership of storage
lifecycle operations.

Published updates SHOULD become available to every applicable propagation group
according to that group's policy. Failure in one group MUST NOT invalidate
successful local publication or prevent another group from progressing.
Consecutive monotonic updates MAY coalesce.

#### Propagation Policy Groups

The calling application, not the generic node host, configures propagation
groups. A node MUST NOT create or infer a default group. A node with no groups is
a valid local store-backed lattice host.

Each group owns its connection set, transport identity and trust state, bounded
protocol queues, missing-data acquisition, ingress policy, publication
projection, serving store, novelty tracking and broadcast worker. Attaching a
group to a node supplies only the authoritative merge destination; it MUST NOT
implicitly copy the node lattice context, signing key, filters or peer policy.

An inbound socket MUST be assigned to at most one group. Assignment selects a
serving capability but does not authenticate the remote. Only a live possession
proof for an application-admitted key may upgrade the socket into an
authenticated outbound route.

### Network Protocol

Lattice Nodes communicate using a binary protocol. Messages use the encoding format specified in CAD003.

#### Message Framing

Messages are framed as:
- VLQ-encoded length prefix
- Message payload (encoded per CAD003)

#### Message Types

Message types are identified by a Keyword tag at the start of the message payload (see CAD015). There are no numeric message type IDs.

| Tag | Name | Description |
|-----|------|-------------|
| `:DR` | DATA_REQUEST | Request missing data cells |
| `:DATA` | DATA | Stage bounded data cells ahead of a lattice root |
| `:PING` | PING | Connectivity test |
| `:LV` | LATTICE_VALUE | Announce lattice value update |
| `:LQ` | LATTICE_QUERY | Request lattice value at path |

#### PING (`:PING`)

Connectivity test message.

**Request format:**
```
[:PING id]
```
- `id`: Request identifier

**Response:** Successful Result containing the same `id` and the receiver's current
timestamp as its value.

Nodes MUST respond to PING messages with `Result(id, timestamp)`, where `timestamp` is
the receiver's current Unix time in milliseconds.

#### LATTICE_QUERY (`:LQ`)

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

#### LATTICE_VALUE (`:LV`)

Announce a lattice value update.

**Optimistic push format:**
```
[:LV path value]
```
- `path`: Vector of keys specifying path (empty vector `[]` = root)
- `value`: New lattice value to merge (encoded per CAD003)

An optimistic push is fire-and-forget. The receiver attempts the merge but MUST NOT
return a Result.

**Confirmed push format:**

```
[:LV id path value]
```

- `id`: Request identifier
- `path`: Vector of keys specifying path (empty vector `[]` = root)
- `value`: New lattice value to merge (encoded per CAD003)

A confirmed push requests a Result after the merge. Receivers distinguish the two forms
by vector length and MUST reject any other length. For compatibility, a four-field
message with a nil ID has the same fire-and-forget semantics as an optimistic push.

Messages MAY include delta-encoded data for bandwidth efficiency (see Delta Encoding below).

Upon receiving a LATTICE_VALUE message, the selected propagation group and node MUST:
1. Extract the path from the message
2. Validate the protocol path and route it through the configured application boundaries
3. Decode a complete value in the selected serving store, acquiring missing data
   from that same connection only when it is authenticated
4. Apply the group's complete-value ingress policy
5. Validate and merge the foreign value using the authoritative lattice semantics
6. Publish a changed authoritative node root
7. Trigger independent propagation-group notifications

For a confirmed push, the receiver MUST return a successful Result with the same ID only
after the authoritative merge and logical node-root publication complete. The
response MUST NOT depend on optional propagation-group broadcast completion.

#### DATA_REQUEST (`:DR`)

Request missing data cells by hash.

**Request format:**
```
[:DR id hash1 hash2 ...]
```
- `id`: Request identifier
- `hash1, hash2, ...`: SHA3-256 hashes of missing data cells (32-byte blobs)

**Response:** Message containing requested cells

Nodes SHOULD respond with available data from their store. Unavailable cells SHOULD be encoded as nil values.

#### DATA (`:DATA`)

Stage a bounded batch of independently addressable cells before a later
LATTICE_VALUE root announcement.

**Message format:**
```
[:DATA cell1 cell2 ...]
```

DATA does not carry a lattice path and MUST NOT trigger a merge. A node MUST
stage it only in the store selected by the connection's operator-assigned
propagator capability. Missing DATA batches remain recoverable when the later
root triggers DATA_REQUEST acquisition.

### Value Encoding

All values exchanged between nodes MUST use the canonical encoding format specified in CAD003.

Key encoding properties:
- All CVM values have a unique canonical encoding
- Value ID = SHA3-256 hash of encoding
- Merkle tree structure enables incremental verification
- Multi-cell encoding supports complex nested values

### Missing Data Recovery

Lattice values are Merkle trees that may reference data not yet available locally. Nodes MUST implement missing data recovery.

#### Complete-Before-Merge Pattern

1. Decode the received value against the selected group's serving store
2. If an authenticated source omitted data, request the missing hash from that source
3. Retry decoding until the complete value is available or acquisition fails
4. Apply size and ingress policy to the complete value
5. Offer only the complete value to the authoritative lattice merge

An unverified connection MUST supply a complete value and MUST NOT trigger
missing-cell acquisition. This prevents unsolicited partial data from writing
arbitrary cells into a serving store.

**Recommended parameters:**
- Maximum retry attempts: 3
- Acquisition timeout per peer: 5 seconds

#### Data Acquisition Algorithm

```
function acquire(source, servingStore, missingHash):
    require source.isAuthenticated()
    response = sendDataRequest(source, missingHash)
    if response contains valid data matching missingHash:
        store data in servingStore
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

The maximum complete inbound lattice value and the maximum encoded propagation
message are separate limits. Implementations MUST bound both. A complete value
may be much larger than one message because its independently addressable cells
can be transferred in bounded DATA batches or acquired by hash.

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
2. If the delta fits the application message limit, create one delta-encoded LATTICE_VALUE message
3. Otherwise partition novel cells into bounded DATA batches and append one root-only LATTICE_VALUE message
4. Broadcast the sequence to connected peers
5. Track announced values to avoid redundant transmission

#### Root Sync

Nodes SHOULD periodically broadcast root-only messages containing only the top cell's encoding.

Root sync provides:
- Lightweight divergence detection (typically 50-200 bytes)
- Trigger for pull-based recovery via DATA_REQUEST
- Bandwidth-efficient heartbeat mechanism

Receivers detecting divergence (merge triggers missing data) will automatically acquire missing cells.

### Peer Management

Propagation groups maintain connections to peer nodes for synchronisation.

#### Connection Operations

Groups MUST support:
- `addPeer(connection)`: Add a peer connection
- `removePeer(connection)`: Remove a peer connection
- `getPeers()`: List current peer connections

Groups SHOULD maintain persistent connections for efficient messaging.

Applications MAY translate discovery policy into bounded desired-peer intent for
one or more groups.

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
- Represent every protocol path as a vector; nil, omitted and scalar paths are invalid
- Use the addressed component's merge policy, consistent with the served region semantics
- Apply each update atomically at its declared boundary; a component may stage changes before publishing them to the host
- Support arbitrary nesting depth

#### Sub-Lattice Resolution

Path delivery selects the semantics of the addressed region while preserving the
policy of its owning component. In the component implementation, the host hands
the path and complete incoming value to configured applications, which route it
to the responsible child or merge it through their declared shape. Whole-value
and path delivery MUST enforce equivalent owner and signing boundaries. The node
does not require a global lattice tree to perform this delegation.

#### JSON Key Compatibility

Lattice paths internally use CVM-native key types (Keywords, AccountKeys, etc.), but JSON-based APIs address paths using JSON-native types (strings, integers). Each lattice level provides a `resolveKey` function that translates an external key to the canonical CVM key for that level. Components may expose resolution helpers using these rules before constructing cursor views; plain cursor `path(keys...)` uses already-canonical keys (see [CAD035](/docs/cad/cursors)):

| Lattice Level | JSON Key | Canonical CVM Key |
|---------------|----------|-------------------|
| KeyedLattice (root) | `"kv"` | Keyword `:kv` |
| OwnerLattice | `"0x49b44c..."` | ABlob (parsed hex) |
| SignedLattice | No interior path | Supply a complete envelope at its slot |
| Vector-valued (e.g. DLFSLattice) | `"0"` | AInteger `0` (parsed numeric string for vector position) |
| MapLattice / IndexLattice | `"mykey"` | AString (identity) |

The reverse mapping (`toJSONKey`) converts canonical keys back to JSON representations: Keywords become their name strings, blobs become hex strings, and other types pass through unchanged.

JSON-based callers MUST resolve each path element through `resolveKey` before using standard lattice operations. CVM-native code that already uses canonical key types does not need resolution.

There is no incoming `:value` step through a signed envelope. A local component may explicitly expose an authorised unsigned editing view; that is not a network path.

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
| MapLattice | Recursive merge of entries by key | Empty map |
| IndexLattice | Union of keys, per-entry child merge | Empty index |
| KeyedLattice | Per-key statically-typed child lattices | Per-key zeros |
| LWWLattice | Whole value with the newer timestamp wins (durable deletes) | nil |
| JSONLattice | Structural navigation only (defines no merge) | Empty container by key shape |
| StampingLattice | Stamp-on-write layer; delegates merge and navigation | Delegated |
| DataLattice | Union of hash-indexed values | Empty index |
| SignedLattice | Validates signatures on merge; signs on write at the boundary | nil |
| OwnerLattice | Per-owner signed data maps | Empty map |

The standard ROOT lattice structure uses a `KeyedLattice` backed by an `Index<Keyword, ACell>`, which provides lexicographic key ordering and compatibility with both CVM keyword paths and JSON string paths (keywords and strings share the same blob representation in the Index):

```
KeyedLattice (Index<Keyword, ACell>) {
    :data  → DataLattice
    :fs    → OwnerLattice(MapLattice(DLFSLattice))
    :kv    → OwnerLattice(MapLattice(KVStoreLattice))
    :queue → OwnerLattice(MapLattice(TopicLattice))
    :p2p   → P2PLattice
    :local → LocalLattice
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

The receiving application merge MUST reject invalid foreign values. A lattice may use `checkForeign()` internally, but callers MUST NOT rely on an optional pre-check as the enforcement boundary. This protects against:
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
| Host | Yes | Published state and configured application components defining merge policy |
| Store | Yes | Storage backend for persistence |
| Port | No | Network port (default: implementation-defined) |

Optional configuration:
- Zero or more application-configured propagation groups
- Per-group serving store and filtered view
- Per-group initial peer or discovery policy
- Propagation timing, queue, acquisition and message limits

---

## Reference Implementation

A reference implementation is provided in the Convex `convex-peer` module (Java).

### Classes

| Specification Concept | Java Class | Package |
|-----------------------|------------|---------|
| Application host | `LatticeHost<V>` | `convex.lattice` |
| Lattice Node | `NodeServer<V>` | `convex.node` |
| Propagation Policy Group | `LatticePropagator` | `convex.node` |
| Outbound Route Manager | `LatticeConnectionManager` | `convex.node` |

### Component assembly

Assemble a `LatticeHost` and its application components before constructing
`NodeServer` from that host. Configure each propagation group with its own serving
store and policy before attaching it. Local operations edit a domain component;
that component publishes into the host, and host publication makes the resulting
state available to persistence and propagation policy.

`RelayHost` is a convenience for assembling one live application over a supplied
whole-value lattice. It does not move merge policy into the transport. Executable
network application examples live in `convex-peer/src/test/java/convex/node/app`
in the Convex repository; the in-memory component testbed is described by CAD045.

### Implementation Notes

- The Java implementation uses Netty for network I/O
- Thread safety is provided via `java.util.concurrent.atomic.AtomicReference`
- Delta encoding uses the `Cells.announce()` mechanism for novelty detection
- Other language implementations should use equivalent networking and concurrency primitives

## See Also

- [CAD002: CVM Values](/docs/cad/values) - Value types
- [CAD003: Encoding](/docs/cad/encoding) - Binary encoding format
- [CAD024: Data Lattice](/docs/cad/data_lattice) - Theoretical foundation
- [CAD028: DLFS](/docs/cad/dlfs) - Distributed filesystem
- [CAD035: Lattice Cursors](/docs/cad/cursors) - Cursor system
- [CAD037: KV Database](/docs/cad/kv_database) - Replicated key-value store
