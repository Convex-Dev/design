---
sidebar_position: 1
title: Key Concepts
authors: [convex]
tags: [convex]
---

# Overview

Convex is an open platform for building decentralised applications that require a high performance, trusted global state without needing to depend on centralised services.

It delivers the promise of the Internet of Value, offering flexibility and scalability far beyond the capabilities of traditional blockchains. In particular, it supports high volume, interactive applications used directly by end users such as mobile apps, payments and gaming.

## Lattice Technology

Convex is based on **lattice technology**. A lattice is a concept from mathematics: a set where every element can be merged with any other element with a "merge" function that is commutative, idempotent and associative.

A consequence of this is that distributed systems can share their lattice values and the lattice is guaranteed to converge to a single consensus value - this is the key idea behind a CRDT (conflict-free replicated data type). CRDTs are well known as a powerful way to build scalable, fault-tolerant distributed systems (e.g Redis).

Lattice technology builds on the idea of CRDTs in several key ways:
- Adding cryptographic security to enable secure decentralised operation (digital signatures and cryptographic hashes)
- Ability to create consensus over an ordering of transactions (essential for transaction security, e.g. the double-spend problem) 
- Use of powerful immutable persistent data structures as the lattice values. These can be of arbitrary size and contain arbitrary data, but only the differences need to be transmitted and processed - similar to the "git" version control system. 
- Lattice data structures are also Merkle trees, providing strong integrity guarantees and fast identity checking.

By combining the principles of CRDTs with cryptographic security, transactional ordering and immutable data structures, Convex offers a unique solution for building decentralised systems that can reliably converge to consensus, even in the face of network failures or malicious attacks.

## Convergent Proof of Stake (CPoS)

The consensus algorithm used by Convex to secure on-chain transactions is **Convergent Proof of Stake**, which is described in more detail in the [Convex White Paper](convex-whitepaper.md)

The main properties of CPoS are:
- Byzantine Fault Tolerance (similar to PBFT)
- Stake weighted voting by peers (67% required to ensure stable consensus)
- Leaderless design - peers can submit transactions in parallel
- Resistance to front-running

In general, users and developers don't need to care about CPoS happening: it is handled by peers participating in the consensus lattice. They just get to enjoy lightning fast, secure transactions.

## Core Building Blocks

The on-chain world of Convex is built from a small number of powerful primitives:

- **Accounts** are the fundamental unit of identity. Every account has an address (like `#42`), can hold coins and other assets, and is secured by an Ed25519 key pair. Accounts also act as programmable environments — each has its own namespace of definitions.
- **Transactions** are signed instructions executed atomically against the global state: transfers, smart contract calls, or arbitrary Convex Lisp code. If anything fails, the whole transaction rolls back automatically.
- **Actors** are autonomous accounts — the Convex equivalent of smart contracts. Once deployed, an actor's code executes deterministically on the [CVM](/docs/cad/cvmex) and can hold assets, enforce rules and provide services to other accounts.
- **Convex Coins (CVM)** are the native utility token, used to pay for transaction execution. Execution cost is metered in **juice**, and on-chain storage in **memory** — see [Convex Coins](/docs/tutorial/coins) for details.
- **Digital assets** of any kind — fungible tokens, NFTs, custom instruments — share a universal asset model ([CAD019](/docs/cad/assets)), so wallets and applications can handle them uniformly.

## Comparison with Blockchains

Convex is not a blockchain: Its unique lattice technology maintains consensus via a CRDT, rather than tying each block to the previous block. This allows significantly better realtime performance as it is a leaderless system with zero block delay.

However, comparisons are inevitable so it is worth noting that Convex can still do everything possible on a blockchain and more:
- Create and execute smart contracts (via the CVM)
- Enforce cryptographic security for digital assets and on-chain data
- Provide decentralised services such as identity, trust and immutable provenance 

Architecturally, Convex is exceptionally simple and developer-friendly: 
- A single global consensus state avoids the problems and risks of cross-chain / cross-shard transactions - you get the benefits of high scalability without architectural complexity and operational risks
- An on-chain compiler makes it simple to submit and execute sophisticated transactions without external tools
- Transactions are atomic and Turing complete, so you can implement arbitrary logic with the safety of complete automatic rollbacks if anything fails
- Clients need only a standard Ed25519 key pair to transact (via the REST API or the binary protocol)

## Beyond the Chain: the Lattice Ecosystem

Consensus is only one region of the Lattice. The same technology powers a growing family of decentralised capabilities, both on-chain and off-chain:

- **[DLFS](/docs/cad/dlfs)** - a decentralised file system with conflict-free replication and cryptographic verification
- **[Convex SQL](/docs/cad/convex_sql)** - relational tables with SQL queries over replicated lattice data
- **[Lattice Queue](/docs/cad/lattice_queue)** - Kafka-style streaming topics with CRDT merge semantics
- **[Lattice Authentication](/docs/cad/lattice_auth)** - signed, ownership-verified merges with UCAN-based capability delegation
- **[Decentralised Identity](/docs/cad/did)** - W3C DIDs for people, services and agents

Convex is also built for the agent economy: every peer ships with a built-in **[MCP server](/docs/products/convex-mcp)** so AI agents can query state and transact directly, and the **[x402 protocol](/docs/cad/x402)** enables HTTP-native micropayments between agents and services. See the [AI Agents guide](/docs/tutorial/agents) to get started, or explore [Covia](https://covia.ai) — the federated AI orchestration grid built on Convex lattice technology.




