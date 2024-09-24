---
title: Lattice Technology
authors: [convex, mikera]
sidebar_position: 1
tags: [convex, lattice]
---

# Lattice Technology

Lattice technology is the breakthrough that the decentralised digital world has been waiting for. 

Imagine an infinitely scalable, self-repairing, decentralised cloud of data and compute resources accessed by self-sovereign individuals, secured with strong cryptographic technology and backed up by powerful consensus algorithms. Anybody can participate, nobody can control it. This is the promise of the Lattice.

## Parts of the Lattice

Sections of the Lattice are defined by the lattice values they utilise and how these values are merged, which in turn defines the rules by which they operate. 

Each section is a sub-lattice of the Lattice as a whole: we exploit the property that a map of keys to lattice values is itself a lattice (with the simple merge function: combine entries of both maps into a single map and merge the lattice values of any keys that collide)

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

Lattice values are arbitrary sets of data (indexed by cryptographic hash) and the merge function simply takes the union of these sets. Nodes may simply discard values they are not interested in in order to save resources (effectively deleting such values from the )

Three essential functions are supported:
- Participants can **read** data from a lattice node that they can access, acquiring whatever data is associated with a given hash
- Lattice nodes can **acquire** data from other nodes, again indexed by cryptographic hash. This brings a copy of the data into the local storage of the node. Acquisition can be from a specific node, or searched for across the whole data lattice (similar to Bittorrent)
- Controllers of nodes can **pin** data they are interested in so that it is retained by their lattice node. This ensures at least one copy will always be available to the lattice as a whole

The Data Lattice is similar in concept to IPFS / IPLD, but based on higher performance and more efficient lattice technology. 

### Data Lattice File System (DLFS)

DLFS is a lattice that builds on the data lattice to provide self-sovereign replicated file systems.

Lattice values are file system trees with files and directory similar to a traditional file system. The merge function operates like file replication: files are updated if they are more recent versions and if the party making the change is authorised to do so.

Because lattice values are immutable persistent data structure, it is also possible to "snapshot" an entire DLFS drive with a single cryptographic hash. This snapshot could, for example, be pinned in the data lattice for audit / backup / analysis purposes. This operation is extremely efficient because of structural sharing: most of the actual storage will be shared with the current DLFS drive and/or other snapshots so this operation is extremely efficient (you are only really storing the deltas from other versions).