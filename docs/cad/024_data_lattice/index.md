# CAD024: Data Lattice

## Overview 

The Data Lattice is the data substrate of the Convex ecosystem, designed for high volume storage, high performance and verifiable content delivery at scale.

Convex maintains data as part of the operation of the CVM global state (on-chain). It is possible to build decentralised solutions using these capabilities alone which we call a "pure dApp", which is sufficient for many use cases. However, more sophisticated decentralised applications are likely to require additional data sources (off-chain). We call such applications "hybrid dApps".

While off-chain data can be provided in many different ways, including via traditional Web 2.0 server infrastructure, there is a compelling case for a more powerful decentralised storage solution to support hybrid dApps on Convex

## Scope and related CADs

This CAD specifies the **abstract data and merge model**. A lattice definition
describes values, validation and merge semantics independently of the objects
used to execute it. Abstract compositions remain valid specifications: an
implementation need not instantiate one Java object for every node in a diagram.

| CAD | Responsibility |
|---|---|
| CAD024 (this document) | Values, abstract lattice types and merge semantics |
| [CAD038: Lattice Authentication](/docs/cad/lattice_auth) | Owner and signer authorisation, signed-value acceptance and authoring rules |
| [CAD045: Lattice Applications](/docs/cad/lattice_apps) | Application implementation through components: domain operations, policy, routing and publication boundaries |
| [CAD035: Lattice Cursors](/docs/cad/cursors) | Atomic storage, path views and fork reconciliation used by components |
| [CAD036: Lattice Node](/docs/cad/lattice_node) | Network delivery, replication and publication of hosted state |
| [CAD053: Lattice Regions](/docs/cad/lattice_regions) | Shared region names and references to their semantic definitions |

Applications SHOULD normally implement their behaviour through components as
specified in CAD045, composing reusable lattice definitions where appropriate.
Components MUST preserve the semantics of the regions they serve. A component
boundary does not change a region's data format or merge rule.

## Rationale

Here are some of the key reasons data storage and processing extrinsic to Convex is useful for decentralised applications:

1. Scalability: Global-state DLTs inherently have limits on computational capacity and data throughput. Storing and analysing large data sets is inefficient on-chain. Off-chain resources that do not require the same degree of synchronisation via consensus can horizontally scale to demand.

2. Privacy: Sensitive data as with health records or personal financial information requires restricted access. Public blockchains provide transparency but not confidentiality. Off-chain systems support encryption and fine-grained access control.

3. Speed & Responsiveness: DLTs feature lengthy settlement finality and limited transactions per second. This hinders uses needing real-time data flow like messaging or IoT monitoring. Off-chain networks can react faster to data changes. 

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

- **Garbage Collection**: Stores can be garbage collected to reduce resource requirements at any time, simply by specifying which data is required to be maintained ("pinning"). This facilitates better operational management and allows flexible control by data lattice providers regarding what data they are interested in preserving or hosting. The collection procedure and the precise retention model are specified in [CAD049](/docs/cad/etch_gc).

- **Access Control**: data lattice hosts may optionally impose whatever access controls they require for governance, security or privacy purposes. Typically, these would involve authentications against a decentralised ID (DID) and a digital signature (Ed25519 as standard, though other systems can also be adopted)


## Specification

### Fundamental Principles

The Data Lattice is built on a set of core principles that together enable self-sovereign, peer-to-peer data structures that scale to internet level.

#### Self-Sovereign P2P Data

Data in the Lattice is inherently self-sovereign. Each participant owns and controls their own data, signed with their Ed25519 key pair. There is no central authority that mediates access or dictates structure. Participants publish data into the Lattice and other participants may choose to replicate, merge and act upon it — but the original author retains cryptographic proof of authorship and control over their own slice of the data structure.

Owned data MUST be partitioned by owner identity, which may be a public key, account address or DID. Each independently mergeable signed value MUST retain a valid signature from a key authorised for that owner, as specified by [CAD038](/docs/cad/lattice_auth). A public-key owner uses key equality; an indirect identity requires its authorisation rule. Readers verify authenticity independently of the delivering peer.

#### Replicated, Self-Healing Structures

The Lattice is designed for replication across an open network of peers. Any peer may hold a partial or complete copy of the Lattice state. Merge operations are associative and idempotent, and are commutative wherever their ordering rule selects a strict winner (see Merge Properties below). An exact ordering tie deliberately favours the first, own/current operand.

This makes the Lattice inherently self-healing. If a peer loses data due to disk corruption, network partitioning or any other failure, it MUST recover that data on the next successful merge with any peer that still holds it. No co-ordination protocol is required for recovery. As long as at least one copy of any datum survives somewhere in the network, it can be recovered by all peers through normal replication; the exact-tie preference affects selection between conflicting values, not acquisition of missing data.

#### Atomic Updates

All updates to the Lattice MUST be atomic. Observers MUST never see partially applied changes.

Atomicity applies at the selected publication boundary. A component may stage a working copy and reconcile it with its destination on publication. Independent child components may publish separately; an application requiring an atomic aggregate MUST choose a boundary enclosing that aggregate. [CAD045](/docs/cad/lattice_apps) specifies this choice and [CAD035](/docs/cad/cursors) specifies the storage operations. Validation, unavailable signing capabilities or storage errors may prevent publication; concurrent writes may require internal retries.

#### Time Travel and Snapshots

Because all Lattice values are immutable persistent data structures (Merkle Trees), the Lattice naturally supports snapshot and time-travel capabilities analogous to Git. Every state is identified by its cryptographic hash. Forking creates a snapshot at that point in time. Previous states remain accessible as long as the underlying cells are retained in storage (i.e. not garbage collected).

This enables powerful patterns: historical queries, audit trails, rollback, branching workflows, and diff-based synchronisation between peers. The structural sharing property ensures that snapshots are storage-efficient — only the cells that differ between versions occupy additional space.

#### Merge Properties and Tie Preference

Every lattice type MUST define a `merge(own, other)` function. The operands are
directional: `own` is the value already selected at the receiving cursor, store or
publication boundary, and `other` is the candidate being incorporated. Merge has
the following properties:

- **Commutativity up to tie preference**: when the lattice ordering distinguishes
  the operands, `merge(a, b) = merge(b, a)`. If distinct operands have exactly
  equal ordering priority, the first (`own`) operand is retained.
- **Associativity**: `merge(merge(a, b), c) = merge(a, merge(b, c))` — grouping does not matter
- **Idempotence**: `merge(a, a) = a` — re-merging the same data is a no-op

The own-value preference makes local mutation, remote incorporation and
persistence/publication consistent: the value already current at that boundary
survives an exact tie. It also means two peers holding distinct, independently
produced values with exactly equal priority are not forced to choose the same value
by exchanging those values alone. Such a tie remains locally stable until a later
non-tied update resolves it. Outside this explicit tie case, merge order, message
duplication and reordering do not affect the selected result.

The merge model extends hierarchically through the entire Lattice structure. The root lattice merges by delegating to child lattices at each key, which in turn delegate to their children, and so on. This compositional design applies the same structural merge and documented tie preference from the root down to individual data entries.

#### Application interface

Components provide the normal application interface: domain operations, incoming
merge policy, signing and publication. They use cursors for atomic storage and
path access. [CAD045](/docs/cad/lattice_apps) specifies components and
[CAD035](/docs/cad/cursors) specifies cursor mechanics. Neither the abstract
lattice hierarchy nor path navigation alone determines a publication boundary.

### Lattice Types

A Lattice Type defines the merge semantics for a particular kind of value. Every lattice type MUST define:

- `merge(ownValue, otherValue)` — the core merge function, which MUST satisfy the merge properties and own-value tie rule above
- `zero` — the identity element for valid, authorised values (i.e. `merge(zero, x) = x` for such `x`); foreign values still undergo validation
- `validate(value)` — validation that a received value is well-formed for this lattice type
- `child(key)` — returns the child lattice type for a given key, or nil if the lattice has no defined child structure at that key

Lattice types compose hierarchically. A parent lattice delegates merge of child values to the appropriate child lattice type. This enables construction of arbitrarily deep, well-typed lattice structures from simple building blocks.

#### Standard Lattice Types

The following standard lattice types are defined:

**Set Lattice** — Merges by set union. The result of merging two sets is a set containing all elements from both. Zero is the empty set.

**Max / Min Lattice** — Merges by taking the maximum (or minimum) value. Useful for monotonically increasing counters, timestamps, or version numbers.

**LWW Lattice** (Last-Write-Wins) — Merges by selecting the **whole value** with the most recent timestamp; it never recurses into the inner structure. Distinct values with equal timestamps retain the first, own/current operand. Because the newer value replaces the old wholesale, whole-value LWW makes **deletions durable**: a smaller value carrying a newer timestamp replaces the larger old one, and removed entries do not reappear on merge. This is what lets applications delete directly rather than accumulate tombstones.

**JSON Lattice** — A structural navigation layer for JSON-shaped data (maps, vectors, strings, numbers, booleans and nil). It defines how to navigate and how to build intermediate containers from the shape of a key, but deliberately defines **no merge of its own** — it is composed under a merge layer.

**Stamp-on-write composition** — A write policy assigns a timestamp to local edits without changing the merge rule. Combined with whole-value LWW and structural navigation, it supports navigable mutable state with durable deletes. This is a logical composition, not a required `StampingLattice` class: CAD045 components bind the clock and write transformation; the Java implementation supplies `StampedCursor` as a mechanism.

**Map Lattice** — Merges maps by applying a value lattice to each key independently. Foreign entries are validated even when their key is absent locally. Keys present in both maps have their values merged using the configured child lattice. Zero is the empty map.

**Index Lattice** — Similar to Map Lattice but operates on sorted indexes with blob keys. Suitable for ordered data such as time-series feeds.

**Keyed Lattice** — A map-like lattice where each key has a distinct, statically configured child lattice type. Used for the root Lattice structure where different sections (e.g. data, filesystem, key-value, queue) each require different merge semantics.

**Owner Lattice** — Partitions data by owner identity. Each owner's slot contains a signed value, and merge operates independently per owner under that slot's authorisation rule. Direct public-key ownership is the special case in which the owner key must equal the signing key. CAD038 defines verification; CAD045 defines the usual owned-map components.

**Signed Lattice** — Wraps a value lattice in a cryptographic boundary. Incoming
envelopes MUST satisfy signature, owner-authorisation and payload-validation rules.
Selecting an existing input preserves its envelope. Synthesising a different
payload requires a new authorised signature; an implementation without that
capability retains its established value. CAD038 specifies these rules; CAD045
components choose immediate signing or an unsigned draft signed on publication.
An incoming path cannot bypass the envelope by addressing its unsigned interior.

**Data Lattice** — A general-purpose content store indexed by hash. Merge is set union over the hash-indexed cells. Useful for bulk data storage where individual items are referenced by content hash.

**Local Lattice** — Stores peer-local data that is not replicated. Useful for configuration, caches, or other node-specific state.

### Root Lattice Structure

The system-wide Lattice root is a Keyed Lattice whose sections are called regions. The official list of regions, with their keys, status and where each is defined, is [CAD053: Lattice Regions](/docs/cad/lattice_regions). The standard sections are:

- **Data** — General-purpose content-addressable data store. Stores arbitrary cells indexed by hash.

- **Filesystem** — Distributed Lattice File System. An Owner Lattice where each owner may maintain named drives, each containing a tree of directories and files.

- **Key-Value** — Key-value databases. An Owner Lattice where each owner may maintain named key-value stores with per-entry merge semantics.

- **Queue** — Message queues. An Owner Lattice where each owner may maintain named topics with partitioned, append-only message streams.

- **P2P** — Peer-to-peer network state, shared between peers to co-ordinate replication.

- **Local** — Peer-local storage that is not replicated across the network.

- **App** — Application-specific lattices, keyed by application name. Each application's own state lives here rather than in a root section of its own.

Root sections are ecosystem-owned and allocated by the Convex Foundation, typically for facilities that many applications can use; CAD053 lists further allocated regions, such as P2P identity and a social graph. An application MUST NOT add a root section for its own state: it registers its lattice under the App section instead. [CAD045](/docs/cad/lattice_apps) defines both kinds of registration.

### Cursors

Cursors provide atomic access to immutable values. Components supply any
construction, merge, signing or stamping functions needed at a path. Cursors do
not infer authorisation, initialise missing containers on read, or publish an
application merely because a nested value changed. Their mechanics are defined
in [CAD035](/docs/cad/cursors).

### Merge Context

Merge and write operations may require policy beyond their input values. In the
Java implementation, a component holds a `LatticeContext` supplying a write clock
and signing capabilities. Newly constructed children receive policy explicitly;
sharing a component does not replace its policy. Dynamic policy MUST be safe for
the threads using it. One logical timestamped edit MUST use one clock reading.

The owner-authorisation rule belongs to the served ownership boundary. It MUST
remain the same for whole-map delivery, owner-path delivery and local authoring.
CAD038 defines the rule; CAD045 defines how a component binds it to reusable
lattice machinery. Providing a signing key does not confer authority over an
unrelated owner.

### Publication boundaries

A component publishes only into its supplied destination. Publication MUST NOT
implicitly publish an enclosing component, host or store. A lightweight view
shares existing working state and has no independent publication step. A region
collection publishes its registered children and leaves other paths unchanged.
Persistence and replication of published host state are separate operations.
CAD045 specifies these boundaries; CAD035 specifies fork reconciliation and
CAD036 specifies network publication.

### P2P Replication

Peers replicate Lattice data using a propagation model:

1. **Announce** — When a peer produces new data (via local writes or received merges), it computes the delta (novel cells not previously present).

2. **Persist** — The merged root value is persisted to durable storage, enabling recovery after restart.

3. **Broadcast** — The delta is broadcast to connected peers.

4. **Receive and Merge** — When a peer receives a broadcast, it merges the received value into its local state. Merge is insensitive to message duplication and, except for the documented exact-tie preference, to ordering.

This model requires no central co-ordinator. Peers form an open mesh and replicate data transitively. Idempotence makes redundant messages harmless; strict ordering differences converge normally, while distinct equal-priority values remain stable at the peer which currently owns them until a later update breaks the tie.

### Data Types

The data lattice supports the full set of decentralised data values used in the Convex CVM. This enables the construction of arbitrary data structures. In practice, applications are likely to rely primarily upon composing data structures from the following types: Maps, Indexes, Vectors, Sets, Strings, Keywords, Integers, Booleans, Doubles and Signed Data.

Applications SHOULD consider whether there is an advantage to limiting usage to the subset of these that represents JSON (Numbers, Maps, Vectors, Strings, Booleans and `nil`). This enables easy one-to-one mapping to JSON representations.

## Reference Implementation

The reference implementation is provided in the `convex-core` and `convex-peer` Java modules.

Key implementation notes:

- **Etch** is the storage subsystem, specialised for efficient storage of content addressable Merkle Trees.
- The Data Lattice operates using the same efficient **binary protocol** used by Convex peer-to-peer communication. Peers SHOULD support hosting Data Lattice access on a different port from CPoS / peer communication.
- A **REST API** provides access to key data lattice capabilities: insert data, retrieve data, pin/unpin data, access controls and replication.
- Root storage uses atomic references to immutable values. Compare-and-set retries and fork synchronisation provide the guarantees in CAD035; this is not a blanket lock-free guarantee for application operations.
- CAD045 components bind reusable `ALattice` definitions to storage and policy. Cursor mechanisms include `Root`, `PathCursor`, `ProjectionCursor`, `ForkedCursor`, `SignedCursor` and `StampedCursor`; components explicitly construct signing and stamping views.

## See Also

- [CAD002: CVM Values](/docs/cad/values) — Immutable value types used in the Lattice
- [CAD003: Encoding](/docs/cad/encoding) — Binary encoding and content addressing
- [CAD035: Lattice Cursors](/docs/cad/cursors) — Full cursor specification
- [CAD036: Lattice Node](/docs/cad/lattice_node) — Networked lattice replication
