---
title: Lattice Technology
authors: [convex, mikera]
sidebar_position: 1
tags: [convex, lattice]
---

# Lattice Technology

Lattice technology is the breakthrough that the decentralised digital world has been waiting for. 

Imagine an infinitely scalable, self-repairing, decentralised cloud of data and compute resources accessed by self-sovereign individuals, secured with strong cryptographic technology and backed up by powerful consensus algorithms. Anybody can participate, nobody can control it. This is the promise of the Lattice.

## How the Lattice works

### Algebraic foundation

The Lattice is based on the mathematical / algebraic concept of a [lattice](https://en.wikipedia.org/wiki/Lattice_(order)). **Lattice values** are elements of a set where there is a *merge* function that can combine any two lattice values.

By repeated merges of lattice values, the system is guaranteed to converge to a single lattice value (in the sense of eventual consistency). This enables the Lattice to operate as a [Conflict-free Replicated Data Type (CRDT)](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type).

### Lattice innovations

Lattice technology augments the idea of the CRDT in several key ways:
- Adding cryptographic security to enable secure decentralised operation (digital signatures and cryptographic hashes).
- Ability to create consensus over an ordering of transactions (essential for transaction security, e.g. the double-spend problem) 
- Use of powerful immutable persistent data structures as the lattice values. These can be of arbitrary size and contain arbitrary data, but only the differences need to be transmitted and processed - similar to the "git" version control system. 
- Lattice data structures are also Merkle trees, proving strong integrity guarantees and fast identity checking.
- Enforcement of rules regarding which incoming lattice values are "accepted" by a participant: this prevents malicious actors from disrupting the Lattice as a whole. Merging a bad lattice value is generally pointless: in most cases all it means is that a participant wastes resources producing a lattice value that will subsequently be ignored by others, so there is an incentive for all participants to immediately reject such values.

## Parts of the Lattice

Sections of the Lattice are defined by the lattice values they utilise and how these values are merged, which in turn defines the rules by which they operate. 

Each section is effectively a sub-lattice of the Lattice as a whole: we exploit the property that a map of keys to lattice values is itself a lattice (with the simple merge function: combine entries of both maps into a single map and merge the lattice values of any keys that collide)

Participants enforce these rules on a decentralised basis. Anyone breaking the rules and sharing illegal values is able to do so, but the lattice values they produce will effectively be ignored by other participants: such behaviour cannot harm the integrity of the Lattice as a whole.

The lattice is being initialised with a number of sub-lattices that perform critical functions, outlined below.

### Convex Consensus Lattice

The Convex CPoS consensus algorithm operates a lattice designed to provide a secure, decentralised global state machine.

Lattice values are beliefs, which are shared by peers and merged using the belief merge function, as defined in the [Convex White Paper](convex-whitepaper.md).

The Consensus Lattice performs the functions of a typical L1 blockchain:
- A global state machine, publicly visible but with changes protected by byzantine fault tolerant consensus
- An account based model allowing self-sovereign control of digital assets protected by digital signatures
- The ability to use Turing-complete smart contracts and autonomous actors as "unstoppable code" on the CVM
- Capability to store and manage arbitrary data as roots of trust for other decentralised applications

### Data Lattice

The Data Lattice is a lattice which stores arbitrary content-addressable data on a self-sovereign basis. 

Lattice values are arbitrary sets of data (indexed by cryptographic hash) and the merge function simply takes the union of these sets. Nodes may discard values they are not interested in in order to save resources (effectively deleting such values from the )

Three essential functions are supported:
- Participants can **read** data from a lattice node that they can access, acquiring whatever data is associated with a given hash
- Lattice nodes can **acquire** data from other nodes, again indexed by cryptographic hash. This brings a copy of the data into the local storage of the node. Acquisition can be from a specific node, or searched for across the whole data lattice (similar to Bittorrent)
- Controllers of nodes can **pin** data they are interested in so that it is retained by their lattice node. This ensures at least one copy will always be available to the lattice as a whole

The Data Lattice is similar in concept to IPFS / IPLD, but based on higher performance and more efficient lattice technology. 

### Data Lattice File System (DLFS)

DLFS is a lattice that builds on top of the data lattice to provide self-sovereign replicated file systems.

Lattice values are file system trees with files and directory similar to a traditional file system. The merge function operates like file replication: files are updated if they are more recent versions and if the party making the change is authorised to do so.

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

The P2P lattice is a lattice designed to facilitate P2P communications. It solves the problem of being able to identify and locate participants on a decentralised network, especially with respect to resolving IP addresses for communication. Peers can be lattice nodes (e.g. Convex peers) or clients wishing to set up secure communication channels with other clients.

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