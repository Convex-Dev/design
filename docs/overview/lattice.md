---
title: Lattice Technology
authors: [convex, mikera]
sidebar_position: 1
tags: [convex, lattice]
---

# Lattice Technology

Lattice Technology is a revolutionary leap forward for the decentralized digital landscape—a robust, self-sustaining, and democratic infrastructure that redefines how data and computation are shared globally.

Imagine a boundless, self-healing cloud of decentralized data and computing power. Accessible to all, it’s fortified by cutting-edge cryptography and seamless consensus mechanisms. Unlike traditional systems, no single entity controls it. This is The Lattice: a global network where trust, scalability, and resilience are built into its very foundation.

## How the Lattice works

### Algebraic foundation

At its core, the Lattice draws inspiration from the mathematical concept of a [lattice](https://en.wikipedia.org/wiki/Lattice_(order)) - a partially ordered set equipped with a *merge* function. This function combines any two lattice values (elements of the set) into a single, consistent result. Through repeated merges, the system naturally converges to a unified value, known as the *supremum*, without relying on complex locking mechanisms or heavy consensus protocols.

This design makes the Lattice a [Conflict-free Replicated Data Type (CRDT)](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type). It guarantees *eventual consistency* across the network, requiring only that nodes intermittently share lattice values. No continuous connectivity or specialized protocols are needed—simple, occasional "gossip" between nodes suffices to keep the system in sync.

### Lattice innovations

Lattice Technology builds on the CRDT framework with several groundbreaking enhancements:
- **Cryptographic Security**: Digital signatures and cryptographic hashes ensure secure, tamper-proof operation in a decentralized environment, fostering trust without centralized oversight.
- **Transaction Ordering Consensus**: The Lattice establishes a reliable sequence of transactions, solving critical issues like the double-spend problem in a decentralised setting.
- **Immutable Persistent Data Structures**: Lattice values leverage powerful, git-like data structures of arbitrary size. Only changes (deltas) are transmitted and processed, enabled by the efficient [CAD3 encoding format](../cad/003_encoding/README.md), making updates lightweight and scalable.
- **Merkle Tree Integration**: Lattice data structures double as Merkle trees, providing strong integrity guarantees and enabling rapid verification of data authenticity.
- **Conditional Acceptance Rules**: The system enforces strict validation of incoming lattice values, thwarting malicious actors. Merging invalid values is futile because other nodes will reject them outright, incentivising honest participation and preserving network integrity.

### Merge Context

A key innovation in Lattice Technology is the *merge context*, which refines how lattice values are combined. The merge process isn’t just a blind fusion of two values—it’s a function of three inputs:

```
new lattice value = merge (context, existing lattice value, received lattice value)
```

- `context`: Additional context-specific data for the merge (e.g., timestamps, keys for signature verification).
- `existing lattice value`: The locally validated value, already trusted by the node.
- `received lattice value`: An incoming value from the network, subject to scrutiny.

This approach ensures merges are intelligent and secure. For instance, a merge might only accept portions of a received lattice value that pass cryptographic validation, rejecting anything unverified or malicious. By prioritising the trusted existing value and applying contextual rules, the Lattice thrives in a decentralised world where not every participant can be blindly trusted.

## Regions of the Lattice

The Lattice isn’t a monolith—it’s a flexible framework divided into regions, each defined by the specific lattice values it uses and the rules governing how those values merge. Think of each region as a specialized sub-lattice, tailored to a unique purpose, yet seamlessly integrated into the broader Lattice ecosystem.

Regions operate as lattices themselves, leveraging a key property: a map of keys to lattice values forms a lattice. The merge function is straightforward—combine entries from two maps and resolve key collisions by merging the associated lattice values. Participants enforce region-specific rules on a decentralised basis. If someone violates these rules by sharing invalid values, their efforts are futile—others simply ignore the rogue values, preserving the Lattice’s integrity.

The Lattice launches with several foundational regions, each powering critical decentralized functions. Here’s a closer look:

### Convex Consensus Lattice

The *Convex Consensus Lattice* drives a secure, decentralised global state machine using the Convex Proof-of-Stake (CPoS) algorithm.

Lattice values are *Beliefs*, which are shared by peers and merged using the belief merge function, as defined in the [Convex White Paper](convex-whitepaper.md).

The Consensus Lattice performs the functions of a typical L1 blockchain:
- A transparent global state machine with Byzantine fault-tolerant consensus.
- Self-sovereign accounts for managing digital assets, secured by digital signatures.
- Turing-complete smart contracts and autonomous actors on the Convex Virtual Machine (CVM)—"unstoppable code" in action.
- Storage of arbitrary data as trust roots for decentralized applications.

This region blends blockchain-grade security with the Lattice’s lightweight, conflict-free design, making it a powerhouse for decentralised economic systems.

### Data Lattice

The *Data Lattice* is a decentralised storage network for content-addressable data, owned and managed by its users.

Lattice values are arbitrary sets of data (indexed by cryptographic hash) and the merge function simply takes the union of these sets. Nodes may discard values they are not interested in in order to save resources: if and only if all nodes decide to do this then the data is effectively deleted from the Lattice.

Four essential functions are supported:
- **Store**: Store arbitrary data in a local node, for future onwards replication
- **Read**: Access data from any reachable node using its hash.
- **Acquire**: Fetch data from specific nodes or search the network (like BitTorrent), copying it locally.
- **Pin**: Retain critical data on a node, ensuring availability across the Lattice.

Think of it as a faster, more efficient evolution of IPFS or IPLD, built on the Lattice’s high-performance architecture.

### Data Lattice File System (DLFS)

The *Data Lattice File System (DLFS)* extends the Data Lattice into a self-sovereign, replicated file system.

Lattice values are file system trees ("drives") with files and directory similar to a traditional file system. The merge function updates drives based on recency and cryptographic authorisation.

Because lattice values are immutable persistent data structure, it is also possible to "snapshot" an entire DLFS drive with a single cryptographic hash. This snapshot could, for example, be pinned in the data lattice for audit / backup / analysis purposes. This operation is extremely efficient because of structural sharing: most of the actual storage will be shared with the current DLFS drive and/or other snapshots so this operation is extremely efficient (you are only really storing the deltas from other versions).

### Execution Lattice

The execution lattice specifies compute tasks to be performed on a decentralised basis.

Lattice values are a map of job IDs to signed and timestamped job record. The merge function again combines these maps, with the most recent correctly signed job status preferred in event of collisions.

Job records consist of:
- A specification of the compute job to be performed
- Metadata about the job (including authorisation for completing the job)
- A map of inputs (provided by the requestor)
- A map of outputs (filled in by the completer)

Importantly, such job executions are highly extensible. They can utilise any form of compute task including computation in private enclaves, use of encrypted data or harnessing specialised compute infrastructure. Flexible authorisation makes it possible to specify tasks that must be complete by a specific party, or to make it open for anyone to complete the task (perhaps in exchange for some for of tokenised payment)

### P2P Lattice

The *P2P Lattice* powers peer-to-peer communication by solving the challenge of locating and connecting participants in a decentralized network.

Lattice values are a map of public keys to signed and timestamped metadata describing a peer. The merge function is simply to combine these maps, and to take the most recent correctly signed metadata if keys collide.

The P2P lattice operates in a manner similar to [Kademlia](https://en.wikipedia.org/wiki/Kademlia), allowing the location of arbitrary peers on the Internet without depending on any decentralised location service. In the Kademlia model, peers only need to store metadata for other peers that they are relatively "near" to in cryptographic space, making this a highly efficient and fault-tolerant decentralised service.

## Efficiency and scalability

How do we build a global, decentralised data structure of unlimited scale? How do we make it fast? Or even feasible? 

There are a number of key engineering ideas here. We've been building and stress-testing lattice technology for 5+ years which has given use some unique implementation advantages and insights:

**Structural sharing** - using immutable [persistent data structures](https://en.wikipedia.org/wiki/Persistent_data_structure) means that when changes to a large lattice value are made, a new lattice value is produced which shares most of its data with the original value. This means that storage and processing is only required.

**Selective attention** - nodes may select whichever subsets of the lattice they are interested in handling on a self-sovereign basis. This means that participants can scale their resource usage based on their own needs. For example, a Convex peer operator might elect only to participate in the the Convex consensus lattice and a small subset of DLFS drives representing data that the peer operator needs to access and maintain.

**Delta transmission** - building upon structural sharing, it is possible to only transmit the deltas (changes) when a new lattice value is communicated. This assumes that the recipient will have the original data, but this is a good assumption if they are already participating in the same lattice (and if they don't they can simply acquire it again...). This means that network / communication requirements are only ever (at most)proportional to the number of changes made in regions of the Lattice that a specific node has chosen to participate in.

**Merge coalescing** - A node may receive multiple lattice values from different sources in a short amount of time. With a series of repeated merges, it produces a new lattice value incorporation all of these updates. It then only needs to produce and transmit one new lattice value (typically with a much smaller much smaller delta than the sum of those received). This coalescing behaviour therefore automatically reduces traffic and scales the load to the amount that nodes can individually handle (typically, network transmission bandwidth will be the primary bottleneck since local lattice value merges are very fast).

**Embedded encodings** - Merkle trees have the disadvantage that they require the computation of a cryptographic hash at every branch of the tree. This can become expensive with a large number of small branches, so the Lattice makes use of a novel efficient encoding scheme (outlined in [CAD003](../cad/003_encoding/README.md)) that compresses multiple embedded values into a single Merkle tree branch (while still maintaining the important property of having a unique encoding with a content-addressable hash). Typical branches might be around 1000 bytes on average (and never less than 141 bytes), which ensures efficiency from a hashing perspective and also keeps overall storage requirements near-optimal.

**Branching factor** - there is a trade-off with branching factors in Merkle trees. Too low, and your tree becomes excessively deep with a lot of extra intermediate hashes to store and compute. Too high, and the encoding of a single branch becomes large, meaning that small changes result in a lot of redundant copying. Lattice values are optimised to provide efficient branching ratios for different use cases (typically ~10). In all cases: The number of branches, encoding size and cost of navigating to a direct child branch are guaranteed to be `O(1)` by design.

**Orthogonal persistence** - Lattice values can exist in memory on other storage media (typically local disks). From a developer perspective, these are effectively identical, there is no need to treat in-memory and externally stored values differently. However, values are efficiently loaded from storage and cached on demand, so that most of the time the lattice behaves like a very fast in-memory database despite being potentially much larger than local RAM.

**Fast comparison** - Lattice values enable some extremely quick comparison algorithms which lattice technology fully exploits. Most simply, checking the identity of any two values is simply the comparison of two cryptographic hashes, which can be done in `O(1)` time. Perhaps surprisingly, computing the common prefix of two vectors of arbitrary length is also just `O(1)`, which is heavily exploited to compare transaction orderings efficiently in CPoS. More sophisticated comparisons include computing differences between multiple lattice data structures (typically `O(n)` or `O(n log n)` where `n` is the size of differences). It is thanks to these comparison algorithms that we are able to implement extremely fast lattice merge operations.

**Garbage collection** - lattice values work *extremely* well with a model of lazy garbage collection. Technically, you can keep lattice values as long as you like (they are immutable and content-addressable after all, so never go stale). However, sooner or later you are likely to hit storage constraints. In this case, you can simply retain the subset of the lattice(s) you are interested in as identified by current root value(s) and discard all other values. This works both for both in-memory caches (e.g. leveraging the JVM GC) and long term storage (e.g. `convex etch gc`). 