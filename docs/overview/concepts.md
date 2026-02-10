---
sidebar_position: 1
title: Key Concepts
authors: [convex]
tags: [convex]
---

# Overview

Convex is an open platform for building decentralised applications that require a high performance, trusted global state without needing to depend on centralised services.

It delivers the promise of the Internet of Value, offering flexibility and scalability far beyond the capabilities of traditional blockchains. In particular, it is supports high volume, interactive applications used directly by end users such as for mobile apps, payments and gaming.

## Lattice Technology

Convex is based on **lattice technology**. A lattice is a concept from mathematics: a set where every element can be merged with any other element with a "merge" function that is commutative, idempotent and associative.

A consequence of this is that distributed systems can share their lattice values and the lattice is guaranteed to converge to a single consensus value - this is the key idea behind a CRDT (conflict-free replicated data type). CRDTs are well known as a powerful way to build scalable, fault-tolerant distributed systems (e.g Redis).

Lattice technology builds on the idea of CRDTs in several key ways:
- Adding cryptographic security to enable secure decentralised operation (digital signatures and cryptographic hashes)
- Ability to create consensus over an ordering of transactions (essential for transaction security, e.g. the double-spend problem) 
- Use of powerful immutable persistent data structures as the lattice values. These can be of arbitrary size and contain arbitrary data, but only the differences need to be transmitted and processed - similar to the "git" version control system. 
- Lattice data structures are also Merkle trees, proving strong integrity guarantees and fast identity checking.

By combining the principles of CRDTs with cryptographic security, transactional ordering and immutable data structures, Convex offers a unique solution for building decentralised systems that can reliably converge to consensus, even in the face of network failures or malicious attacks.

## Convergent Proof of Stake (CPoS)

The consensus algorithm used by Convex to secure on-chain transactions is **Convergent Proof of Stake**, which is described in more detail in the [Convex White Paper](convex-whitepaper.md)

The main properties of CPoS are:
- Byzantine Fault Tolerance (similar to PBFT)
- Stake weighted voting by peers (67% required to ensure stable consensus)
- Leaderless design - peers can submit transaction in parallel
- Resistance to front-running

In general, users and developers don't need to care about CPoS happening: it is handled by peers participating in the consensus lattice. They just get to enjoy lightning fast, secure transactions.


## Comparison with Blockchains

Convex is not a blockchain: Its unique lattice technology maintains consensus via a CRDT, rather tying a block to the previous block. This allows significantly better realtime performance as it is a leaderless system with zero block delay.

However, comparisons are inevitable so it is worth noting that Convex can still do everything possible on a blockchain and more:
- Create and execute smart contracts (via the CVM)
- Enforce cryptographic security for digital assets and on-chain data
- Provide decentralised services such as identity, trust and immutable provenance 

Architecturally, Convex is exceptionally simple and developer-friendly: 
- A single global consensus state avoids the problems and risks of cross-chain / cross-shard transactions - you get the benefits of high scalability without architectural complexity and operational risks
- An on-chain compiler makes it simple to submit and execute sophisticated transactions without external tools
- Transactions are atomic and Turing complete, so you can implement arbitrary logic with the safety of complete automatic rollbacks if anything fails
- Clients need only a standard Ed25519 key pair to transact (via the REST API or the binary protocol)




