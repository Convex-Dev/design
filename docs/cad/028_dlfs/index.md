# CAD028: DLFS - Data Lattice File System

## Overview

The Data Lattice File System (DLFS) is a decentralised virtual file system built on the [Data Lattice](../024_data_lattice/index.md). It provides automatic synchronisation, conflict-free replication, and cryptographic verification of file data across distributed networks.

## Motivation

### The Problem with Centralised Storage

Today's cloud storage solutions (Dropbox, Google Drive, iCloud) require users to trust centralised providers with their data. This creates fundamental problems:

- **Single points of failure** - Provider outages mean no access to your files
- **Privacy concerns** - Providers can access, analyse, and monetise your data
- **Vendor lock-in** - Switching providers is difficult; your data is held hostage
- **Censorship risk** - Providers can delete your files or terminate your account
- **Subscription dependency** - Stop paying and lose access to your own data

### Why DLFS is Powerful

DLFS eliminates these problems through decentralised architecture:

**Self-Sovereign Storage**: You own your data. No third party can deny access, delete files, or terminate your account. Your cryptographic keys are the only authority.

**Automatic Conflict Resolution**: Unlike traditional distributed filesystems that fail on conflicts, DLFS uses CRDT-based merge semantics. Edit the same file on two offline devices? DLFS merges changes intelligently when they reconnect - no manual intervention required.

**Cryptographic Integrity**: Every file, every directory, every version is cryptographically verified through Merkle trees. Tampering is mathematically impossible without detection. The entire drive state can be verified with a single 32-byte hash.

**Efficient Synchronisation**: DLFS uses delta encoding and content-addressable storage. Sync only what changed, not the entire file. Identical content is automatically deduplicated across your entire filesystem.

**Offline-First Design**: Work offline indefinitely. DLFS is designed for intermittent connectivity. Changes merge seamlessly when connections are restored.

**Zero Infrastructure**: No servers to maintain, no databases to manage. DLFS drives replicate peer-to-peer using Lattice Nodes (CAD036).

**Future-Proof**: Based on immutable data structures and content addressing. Your data format will work decades from now - no proprietary formats, no migration nightmares.

## Design Goals

- Provide a decentralised alternative to cloud storage services
- Support peer-to-peer data replication (BitTorrent-style efficiency)
- Maintain compatibility with familiar personal computer file systems
- Provide POSIX compatibility as far as possible
- Leverage CRDT semantics for automatic conflict resolution
- Enable off-chain personal and/or private file systems
- Support cryptographic access control and optional encryption

## Overall Architecture

DLFS operates over a **P2P network** of Lattice Nodes (CAD036) that manage **drives** controlled by independent users.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DLFS Architecture                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │   Device A   │    │   Device B   │    │   Device C   │         │
│  │              │    │              │    │              │         │
│  │  ┌────────┐  │    │  ┌────────┐  │    │  ┌────────┐  │         │
│  │  │ Cursor │  │    │  │ Cursor │  │    │  │ Cursor │  │         │
│  │  └────────┘  │    │  └────────┘  │    │  └────────┘  │         │
│  │       │      │    │       │      │    │       │      │         │
│  │  ┌────────┐  │    │  ┌────────┐  │    │  ┌────────┐  │         │
│  │  │  DLFS  │  │    │  │  DLFS  │  │    │  │  DLFS  │  │         │
│  │  │ Drive  │  │    │  │ Drive  │  │    │  │ Drive  │  │         │
│  │  └────────┘  │    │  └────────┘  │    │  └────────┘  │         │
│  │       │      │    │       │      │    │       │      │         │
│  │  ┌────────┐  │    │  ┌────────┐  │    │  ┌────────┐  │         │
│  │  │Lattice │◄─┼────┼─►│Lattice │◄─┼────┼─►│Lattice │  │         │
│  │  │ Node   │  │    │  │ Node   │  │    │  │ Node   │  │         │
│  │  └────────┘  │    │  └────────┘  │    │  └────────┘  │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                     │
│         ◄──────────── P2P Replication ────────────►                │
│                    (Delta-encoded, automatic)                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Lattice Cursors** (CAD035) provide atomic access to drive state, enabling thread-safe concurrent operations.

**Lattice Nodes** (CAD036) handle network replication, automatically propagating changes to peers with delta encoding.

**DLFSLattice** defines rsync-like merge semantics ensuring drives converge to consistent state.

### Cryptographic Security

- **Authentication**: Only authorised users can update drives using Ed25519 digital signatures
- **Integrity**: Each drive state is a Merkle tree verifiable via SHA3-256 hashes
- **Content Addressing**: All data is collision-resistant and deduplicated
- **Optional Encryption**: Privacy through client-side encryption

### Decentralised Identity

W3C-style DIDs identify and validate users. This can be anchored on-chain via the Convex network as a secure public root of trust.

## Specification

### DLFS Drives

A DLFS drive manages and enables access to DLFS data, analogous to a mounted filesystem on a personal computer.

Conceptually, a drive is a cursor (CAD035) pointing to a Drive State, where filesystem operations atomically update the state.

#### Drive Implementations

DLFS drives MAY have multiple implementations:
- **In-memory drives**: Fast, volatile storage
- **Local drives**: Persistent storage backed by Etch or other stores
- **Remote drives**: Drawing data from the Data Lattice via Lattice Nodes
- **Read-only drives**: Immutable snapshots of another drive

Systems MAY determine custom access rules:
- Restricting access to authenticated users
- Read-only public access (e.g., web servers)
- Group-based permissions via SignedLattice

#### Drive State

The Drive State is the DLFS Node at the root of a drive.

The Drive State MUST be a valid DLFS directory node (the "root" directory).

Implementations SHOULD support immutable snapshots of Drive State.

#### Drive State Hash

The Drive State Hash MUST be the SHA3-256 hash of the root node's encoding (its Value ID per CAD003).

This single hash cryptographically verifies the entire drive contents as a Merkle tree.

### DLFS URIs

DLFS operates as a fundamental Internet protocol with URI-based addressing.

**Proposed URI scheme:** `dlfs`

#### Global Addresses

```
dlfs:bob/shared/images/photo.png
```

Refers to drive `shared` controlled by user `bob`, file `photo.png` in directory `images`.

Usernames MUST be registered on CNS with a public DID in the `user` namespace (e.g., `user.bob`).

#### Hosted Drives

```
dlfs://dlfs.example.com/bob/shared/images/photo.png
```

Specifies a particular host for resolution. Implementations MAY support unregistered usernames.

#### Local Drives

```
dlfs:local:bob/private/documents/report.pdf
```

Local drives need not be publicly resolvable. They MAY be replicas of public drives.

#### HTTPS Mapping

DLFS URIs map to HTTP/HTTPS for web access:

```
https://dlfs.example.com/dlfs/bob/shared/images/photo.png
```

### DLFS Nodes

Each object in a DLFS drive is represented as a Node.

A Node is a Vector with the following structure:

```
[directory-contents file-contents metadata update-time]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | directory-contents | Index or nil | Map of names to child nodes |
| 1 | file-contents | Blob or nil | File data |
| 2 | metadata | Any or nil | Arbitrary metadata |
| 3 | update-time | Long | Timestamp of last modification |

Nodes MUST contain at least these four fields.

Future extensions MAY include additional fields. Implementations MUST preserve unrecognised fields.

#### Directory Nodes

A directory node has:
- `directory-contents`: Index mapping String names to child DLFS nodes
- `file-contents`: nil

#### File Nodes

A file node has:
- `directory-contents`: nil
- `file-contents`: Blob containing file data

#### Tombstones

A tombstone is a node that is neither directory nor file (both contents fields are nil).

Implementations SHOULD create tombstones on file deletion to ensure deletes propagate correctly during replication.

Implementations SHOULD support tombstone cleanup after replication completes (e.g., after a configurable retention period).

#### Metadata

The metadata field MAY contain:
- nil (no metadata)
- Any valid CVM value

Implementations MAY assign custom semantics to metadata.

#### Update Time

The timestamp of the last operation modifying this node.

Implementations SHOULD update timestamps on all content or metadata changes.

Implementations SHOULD use timestamps to resolve replication conflicts (newer wins).

### DLFS File Names

File names MAY be any UTF-8 String of length 1 or more.

File names are **case sensitive**. For Windows compatibility, avoid names differing only by case.

**Recommended characters:**
- Alphabetic: `A-Z`, `a-z`
- Digits: `0-9` (except first position)
- Hyphen: `-`
- Dot: `.`
- Underscore: `_`

**Avoid** `-` and `.` as initial characters (special meanings in shells and Unix).

### Merge Semantics

DLFS uses rsync-like merge semantics via DLFSLattice:

#### Directory Merge

When merging two directories:
1. Entries present in both are merged recursively
2. Entries present only in one are included in result
3. The merged directory timestamp is max(timestamp_a, timestamp_b)

#### File/Node Merge

When merging non-directory nodes:
- The node with the newer timestamp wins
- Equal timestamps: first operand is favoured (deterministic)

#### Conflict Resolution

All conflicts resolve deterministically:
- **Timestamp-based**: Newer modifications win
- **Symmetric**: merge(a, b) = merge(b, a)
- **Idempotent**: merge(a, a) = a

This ensures all replicas converge to identical state regardless of merge order.

### Replication

DLFS drives replicate via Lattice Nodes (CAD036).

#### Automatic Propagation

When drive state changes:
1. Cursor update triggers Lattice Node propagator
2. Delta-encoded LATTICE_VALUE broadcast to peers
3. Peers merge received state using DLFSLattice
4. Missing data automatically acquired via DATA_REQUEST

#### Manual Synchronisation

Applications MAY trigger explicit sync:
1. Send LATTICE_QUERY to peer for current state
2. Merge response into local drive
3. Propagate merged state to other peers

#### Efficiency

- **Delta encoding**: Only novel cells transmitted
- **Content addressing**: Identical content deduplicated
- **Structural sharing**: Common subtrees shared between versions
- **Root sync**: Periodic lightweight divergence detection

### Path-Based Access

Drives support hierarchical path access via cursors (CAD035).

```
cursor.path(:fs, owner, "drivename", "path", "to", "file.txt")
```

The standard lattice ROOT structure positions DLFS at:
```
:fs → OwnerLattice(MapLattice(DLFSLattice))
```

This provides:
- Per-owner isolation via SignedLattice
- Multiple named drives per owner via MapLattice
- rsync-like merge within each drive via DLFSLattice

## Encoding

DLFS nodes use the standard encoding format specified in CAD003.

Node encoding:
- Vector tag followed by element encodings
- Index (for directories) uses radix tree encoding
- Blob (for files) uses chunked encoding for large files
- Timestamps as VLQ-encoded Long

Value identity is determined by encoding equality. Value ID is SHA3-256 hash of encoding.

---

## Reference Implementation

A reference implementation is provided in the Convex `convex-core` module (Java).

### Classes

| Specification Concept | Java Class | Package |
|-----------------------|------------|---------|
| DLFS Lattice | `DLFSLattice` | `convex.lattice.fs` |
| DLFS Node utilities | `DLFSNode` | `convex.lattice.fs` |
| Local Drive | `DLFSLocal` | `convex.lattice.fs.impl` |
| Java NIO FileSystem | `DLFileSystem` | `convex.lattice.fs` |

### Node Structure Constants

```java
public static final int POS_DIR = 0;      // Directory entries index
public static final int POS_DATA = 1;     // File data blob
public static final int POS_METADATA = 2; // Arbitrary metadata
public static final int POS_UTIME = 3;    // Update timestamp
```

### Example: Local Drive with Cursor

```java
// Create local DLFS drive
AStore store = EtchStore.createTemp();
DLFSLocal drive = DLFSLocal.create(store);

// Get cursor to drive root
ACursor<AVector<ACell>> cursor = drive.getCursor();

// Create a file
CVMLong timestamp = CVMLong.create(System.currentTimeMillis());
AVector<ACell> fileNode = DLFSNode.createEmptyFile(timestamp);
fileNode = fileNode.assoc(DLFSNode.POS_DATA, Blob.fromHex("48656c6c6f")); // "Hello"

// Update drive state atomically
cursor.updateAndGet(root ->
    DLFSNode.updateNode(root, DLPath.create("hello.txt"), fileNode, timestamp)
);
```

### Example: Replicated Drive via Lattice Node

```java
// Create lattice node for DLFS replication
ALattice<ACell> rootLattice = Lattice.ROOT;
NodeServer<ACell> node = new NodeServer<>(rootLattice, store, 19999);
node.launch();

// Access DLFS via cursor path
ACursor<ACell> cursor = node.getCursor();
Address owner = Address.create(42);
ACell driveState = cursor.get(Keywords.FS, owner, Strings.create("main"));

// Update drive and trigger automatic replication
cursor.set(newDriveState, Keywords.FS, owner, Strings.create("main"));

// Connect to peer for replication
Convex peer = Convex.connect(peerAddress);
node.addPeer(peer);

// Changes automatically propagate via LatticePropagator
```

### Example: Java NIO Integration

```java
// Mount DLFS as Java NIO FileSystem
URI uri = URI.create("dlfs:local:myuser/drive1");
FileSystem fs = FileSystems.newFileSystem(uri, env);

// Use standard Java file operations
Path file = fs.getPath("/documents/report.txt");
Files.write(file, "Hello DLFS".getBytes());
byte[] content = Files.readAllBytes(file);

// Changes reflect in underlying DLFS drive
```

### Implementation Notes

- `DLFSLattice` implements `ALattice<AVector<ACell>>` for merge operations
- `DLFSNode.merge()` provides the rsync-like recursive merge algorithm
- `DLFSLocal` wraps a cursor and store for local drive operations
- `DLFileSystem` provides Java NIO FileSystem SPI integration
- Replication uses `NodeServer` from convex-peer module

## See Also

- [CAD002: CVM Values](../002_values/index.md) - Value types
- [CAD003: Encoding](../003_encoding/index.md) - Binary encoding format
- [CAD024: Data Lattice](../024_data_lattice/index.md) - Theoretical foundation
- [CAD035: Lattice Cursors](../035_cursors/index.md) - Cursor system for state access
- [CAD036: Lattice Node](../036_lattice_node/index.md) - Network replication
