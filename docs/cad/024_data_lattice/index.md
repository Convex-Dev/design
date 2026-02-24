# CAD024: Data Lattice

## Overview 

The Data Lattice is the data substrate of the Convex ecosystem, designed for high volume storage, high performance and verifiable content delivery at scale.

Convex maintains data as part of the operation of the CVM global state (on-chain). It is possible to build decentralised solutions using these capabilities alone which we call a "pure dApp", which is sufficient for many use cases. However, more sophisticated decentralised applications are likely to require additional data sources (off-chain). We call such applications "hybrid dApps".

While off-chain data can be provided in many different ways, including via traditional Web 2.0 server infrastructure, there is a compelling case for a more powerful decentralised storage solution to support hybrid dApps on Convex

## Rationale

Here are some of the key reasons data storage and processing extrinsic to Convex is useful for decentralised applications:

1. Scalability: Global-state DLTs inherently have limits on computational capacity and data throughput. Storing and analysing large data sets is inefficient on-chain. Off-chain resources that do not require the same degree of synchronisation via consensus can horizontally scale to demand.

2. Privacy: Sensitive data as with health records or personal financial information requires restricted access. Public blockchains provide transparency but not confidentiality. Off-chain systems support encryption and fine-grained access control.

3. Speed & Responsiveness: DLTs feature lengthy settlement finality and limited transactions per second. This hinders uses needing real-time data flow like messaging or IoT monitoring. Off-chain networks have can react faster to data changes. 

4. Cost Efficiency: Persisting every small update on-chain becomes expensive long term. Offloading data which does not require use of the global on-chain state curtails unnecessary fees and bloat. Subnets handle localised logic.

5. Regulatory Compliance: Chains are transnational making compliance difficult. Off-chain systems can enforce jurisdiction specific rules around permissible data types, storage locations, access restrictions and lifecycles.

6. Rich Data Formats: Chains restrict data schemas to basic key-value pairs and byte strings. Document databases, media assets, and complex analytic jobs operate off-chain.

In summary, a hybrid decentralised model using blockchains for consensus/settlement alongside purpose-built off-chain coordination handles data-intensive tasks aligned to use case needs more effectively. This unlocks wider adoption.

## Capabilities

The Data Lattice provides the following capabilities:

- **Content Addressability**: all data is addressed and indexed by a cryptographic hash. The near impossibility of hash collisions ensures that having the correct hash always allows location of the correct data.

- **Lazy loading**: data can be partially loaded on demand, allowing many processes to proceeded without downloading complete data structures. This enables many capabilities such a streaming media, and storage volumes beyond the memory size of individual nodes in the network.

- **Verifiability**: all data can be verified in its entirety from the cryptographic hash. Because the data takes the form of a Merkle Tree, this verifiability extends to multiple levels

- **Structural Sharing**: all common subtrees (i.e. sharing the same content and cryptographic hash) are automatically shared and de-duplicated. This property arises naturally from content addressability and the Merkle Tree structure, which in turn allows for efficient operations such as cloning and storing modified copies of any data.

- **Rich Data Types**: The Lattice supports a wide variety of data structures, including all data types available on the CVM such as maps, lists, vectors, numbers, strings and arbitrary blobs of byte data. In particular, the data lattice types support a superset of JSON, so JSON objects can be naturally represented with ease.

- **CRDT support**: The data lattice forms a natural CRDT, where arbitrary sets of data can be merged to create a union of all data. This process is aided by automatic de-duplication to reduce storage and transmission costs. 

- **Self healing** - The CRDT also makes the data lattice "self-healing": nodes which lose access to some data (e.g. due to disk corruption) may obtain it again on subsequent merges as long as at least one copy survives somewhere in the network.

- **Garbage Collection**: Stores can be garbage collected to reduce resource requirements at any time, simply by specifying which data is required to be maintained ("pinning"). This facilitates better operational management and allows flexible control by data lattice providers regarding what data they are interested in preserving or hosting.

- **Access Control**: data lattice hosts may optionally impose whatever access controls they require for governance, security or privacy purposes. Typically, these would involve authentications against a decentralised ID (DID) and a digital signature (Ed25519 as standard, though other systems can also be adopted)


## Specification

### Fundamental Principles

The Data Lattice is built on a set of core principles that together enable self-sovereign, peer-to-peer data structures that scale to internet level.

#### Self-Sovereign P2P Data

Data in the Lattice is inherently self-sovereign. Each participant owns and controls their own data, signed with their Ed25519 key pair. There is no central authority that mediates access or dictates structure. Participants publish data into the Lattice and other participants may choose to replicate, merge and act upon it — but the original author retains cryptographic proof of authorship and control over their own slice of the data structure.

The Lattice MUST partition data by owner public key. Each owner's data MUST be wrapped in a cryptographic signing boundary that enforces signing at the point of mutation. Only the holder of the corresponding private key may create or update values within their partition. Any reader MUST be able to independently verify the authenticity and integrity of data they receive without trusting the peer that delivered it.

#### Replicated, Self-Healing Structures

The Lattice is designed for replication across an open network of peers. Any peer may hold a partial or complete copy of the Lattice state. Because merge operations are commutative, associative and idempotent (see CRDT Properties below), peers can synchronise in any order, at any time, and always converge to the same result.

This makes the Lattice inherently self-healing. If a peer loses data due to disk corruption, network partitioning or any other failure, it MUST recover that data on the next successful merge with any peer that still holds it. No co-ordination protocol is required — the algebraic properties of the merge guarantee convergence. As long as at least one copy of any datum survives somewhere in the network, it can be recovered by all peers through normal replication.

#### Atomic Updates

All updates to the Lattice MUST be atomic. Observers MUST never see partially applied changes.

A fork/sync model provides transactional semantics: `fork()` creates an isolated working copy where local changes accumulate without affecting the parent. When `sync()` is called, all changes are applied to the parent atomically via lattice merge. Because merge is always well-defined (see CRDT Properties below), merge-aware atomic updates never fail or require retry — the merge function deterministically combines the local changes with whatever concurrent state the parent holds.

#### Time Travel and Snapshots

Because all Lattice values are immutable persistent data structures (Merkle Trees), the Lattice naturally supports snapshot and time-travel capabilities analogous to Git. Every state is identified by its cryptographic hash. Forking creates a snapshot at that point in time. Previous states remain accessible as long as the underlying cells are retained in storage (i.e. not garbage collected).

This enables powerful patterns: historical queries, audit trails, rollback, branching workflows, and diff-based synchronisation between peers. The structural sharing property ensures that snapshots are storage-efficient — only the cells that differ between versions occupy additional space.

#### Fully Mergeable CRDTs at Internet Scale

The Data Lattice forms a Conflict-free Replicated Data Type (CRDT). Every lattice type MUST define a `merge` function with the following algebraic properties:

- **Commutativity**: `merge(a, b) = merge(b, a)` — merge order does not matter
- **Associativity**: `merge(merge(a, b), c) = merge(a, merge(b, c))` — grouping does not matter
- **Idempotence**: `merge(a, a) = a` — re-merging the same data is a no-op

These properties guarantee that any number of peers, merging in any order, with any degree of message duplication or reordering, will always converge to the same final state. This eliminates the need for complex consensus protocols for off-chain data — eventual consistency is guaranteed by the mathematics of the lattice.

The CRDT merge extends hierarchically through the entire Lattice structure. The root lattice merges by delegating to child lattices at each key, which in turn delegate to their children, and so on. This compositional design means the full Lattice — from the root down to individual data entries — is a single, coherent CRDT that can scale to internet level.

#### Cursor-Based Application Interface

Applications interact with the Lattice through cursors — lightweight handles that provide a uniform interface for reading, writing, navigating and synchronising Lattice data. Cursors abstract away the details of atomic updates, lattice merging, cryptographic signing and hierarchical navigation, allowing application developers to focus on their domain logic.

### Lattice Types

A Lattice Type defines the merge semantics for a particular kind of value. Every lattice type MUST define:

- `merge(ownValue, otherValue)` — the core merge function, which MUST satisfy the CRDT properties (commutativity, associativity, idempotence)
- `zero` — the identity element of the lattice (i.e. `merge(zero, x) = x` for all `x`)
- `validate(value)` — validation that a received value is well-formed for this lattice type
- `child(key)` — returns the child lattice type for a given key, or nil if the lattice has no defined child structure at that key

Lattice types compose hierarchically. A parent lattice delegates merge of child values to the appropriate child lattice type. This enables construction of arbitrarily deep, well-typed lattice structures from simple building blocks.

#### Standard Lattice Types

The following standard lattice types are defined:

**Set Lattice** — Merges by set union. The result of merging two sets is a set containing all elements from both. Zero is the empty set.

**Max / Min Lattice** — Merges by taking the maximum (or minimum) value. Useful for monotonically increasing counters, timestamps, or version numbers.

**LWW Lattice** (Last-Write-Wins) — Merges by selecting the value with the most recent timestamp. In the case of equal timestamps, a deterministic tiebreaker MUST be applied to ensure commutativity. Suitable for mutable registers where the latest write should prevail.

**Map Lattice** — Merges maps by applying a value lattice to each key independently. Keys present in only one map are included directly. Keys present in both maps have their values merged using the configured child lattice. Zero is the empty map.

**Index Lattice** — Similar to Map Lattice but operates on sorted indexes with blob keys. Suitable for ordered data such as time-series feeds.

**Keyed Lattice** — A map-like lattice where each key has a distinct, statically configured child lattice type. Used for the root Lattice structure where different sections (e.g. data, filesystem, key-value, queue) each require different merge semantics.

**Owner Lattice** — Partitions data by owner public key. Each owner's slot is wrapped in a Signed Lattice. Merge operates independently per owner. This is the foundation for self-sovereign data — each owner controls their own partition via their signing key.

**Signed Lattice** — Wraps a child lattice in a cryptographic signing boundary. Values MUST be stored as signed data and verified on merge. When merge produces a new value, it MUST be re-signed with the current context's key pair. This ensures data integrity and provenance throughout the lattice hierarchy.

**Data Lattice** — A general-purpose content store indexed by hash. Merge is set union over the hash-indexed cells. Useful for bulk data storage where individual items are referenced by content hash.

**Local Lattice** — Stores peer-local data that is not replicated. Useful for configuration, caches, or other node-specific state.

### Root Lattice Structure

The system-wide Lattice root is a Keyed Lattice with the following standard sections:

- **Data** — General-purpose content-addressable data store. Stores arbitrary cells indexed by hash.

- **Filesystem** — Distributed Lattice File System. An Owner Lattice where each owner may maintain named drives, each containing a tree of directories and files.

- **Key-Value** — Key-value databases. An Owner Lattice where each owner may maintain named key-value stores with per-entry merge semantics.

- **Queue** — Message queues. An Owner Lattice where each owner may maintain named topics with partitioned, append-only message streams.

- **Local** — Peer-local storage that is not replicated across the network.

Applications MAY extend the root structure with additional sections by registering new keys and lattice types. For example, a social networking application could register a section with an Owner Lattice containing per-user social state (feeds, profiles, follow graphs), each with appropriate merge semantics.

### Cursors

Cursors are the primary interface for interacting with Lattice data. A cursor is a lightweight handle to a position within the Lattice hierarchy, providing atomic operations for reading, writing, navigating and merging values. In particular, lattice-aware cursors extend the base cursor model with fork/sync semantics: forking creates an isolated working copy, and syncing pushes changes back to the parent via lattice merge — which always succeeds without retry.

The full cursor specification is defined in [CAD035: Lattice Cursors](../035_cursors/index.md). When used with the Data Lattice, cursor path navigation MUST be lattice-aware: at each level, the cursor consults the lattice type to determine the child lattice for the next key, and when a Signed Lattice boundary is crossed, cryptographic signing MUST be enforced transparently.

### Merge Context

Merge operations may require contextual information beyond the two values being merged. A merge context MUST provide:

- **Timestamp** — Used by LWW Lattice for conflict resolution
- **Signing key pair** — Used by Signed Lattice to sign merged results
- **Owner verifier** — Used by Owner Lattice to verify that a signer is authorised to write to an owner's partition

The context MUST be propagated through the lattice hierarchy and made available to merge functions as needed.

### P2P Replication

Peers replicate Lattice data using a propagation model:

1. **Announce** — When a peer produces new data (via local writes or received merges), it computes the delta (novel cells not previously present).

2. **Persist** — The merged root value is persisted to durable storage, enabling recovery after restart.

3. **Broadcast** — The delta is broadcast to connected peers.

4. **Receive and Merge** — When a peer receives a broadcast, it merges the received value into its local state. The CRDT properties guarantee convergence regardless of message ordering, duplication or partial delivery.

This model requires no central co-ordinator. Peers form an open mesh and replicate data transitively. The commutativity and idempotence of merge mean that redundant messages are harmless and message ordering is irrelevant.

### Data Types

The data lattice supports the full set of decentralised data values used in the Convex CVM. This enables the construction of arbitrary data structures. In practice, applications are likely to rely primarily upon composing data structures from the following types: Maps, Indexes, Vectors, Sets, Strings, Keywords, Integers, Booleans, Doubles and Signed Data.

Applications SHOULD consider whether there is an advantage to limiting usage to the subset of these that represents JSON (Numbers, Maps, Vectors, Strings, Booleans and `nil`). This enables easy one-to-one mapping to JSON representations.

## Reference Implementation

The reference implementation is provided in the `convex-core` and `convex-peer` Java modules.

Key implementation notes:

- **Etch** is the storage subsystem, specialised for efficient storage of content addressable Merkle Trees.
- The Data Lattice operates using the same efficient **binary protocol** used by Convex peer-to-peer communication. Peers SHOULD support hosting Data Lattice access on a different port from CPoS / peer communication.
- A **REST API** provides access to key data lattice capabilities: insert data, retrieve data, pin/unpin data, access controls and replication.
- The implementation is **lock-free**, using atomic references containing immutable values. Merge-aware atomic updates ensure progress without retry. Multiple threads may concurrently read, write, fork and sync without external synchronisation.
- Cursor types in the implementation include root cursors, forked cursors, descended cursors (for sub-path navigation) and signed cursors (automatically inserted at Signed Lattice boundaries).

## See Also

- [CAD002: CVM Values](../002_values/index.md) — Immutable value types used in the Lattice
- [CAD003: Encoding](../003_encoding/index.md) — Binary encoding and content addressing
- [CAD035: Lattice Cursors](../035_cursors/index.md) — Full cursor specification
- [CAD036: Lattice Node](../036_lattice_node/index.md) — Networked lattice replication
