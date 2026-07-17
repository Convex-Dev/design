---
sidebar_position: 3
title: Key Concepts
authors: [convex]
tags: [convex]
---

# Key Concepts

This page defines the building blocks you'll meet everywhere in Convex: the vocabulary of accounts, transactions and actors, and the economic model that keeps the network sustainable. For *why* the platform is built this way, see [What Makes Convex Different](/docs/overview/different); for the underlying technology, see [Lattice Technology](/docs/overview/lattice).

## Lattice technology in one paragraph

Convex is built on **lattice technology**: data structures with a merge function that is commutative, associative and idempotent, so distributed copies are mathematically guaranteed to converge — the idea behind CRDTs, extended with cryptographic security, transaction ordering, and immutable Merkle-tree data structures. Consensus itself is one application of this: peers merge signed *Beliefs* until the network agrees on a single transaction ordering. The full story is on the [Lattice Technology](/docs/overview/lattice) page.

## Convergent Proof of Stake (CPoS)

**CPoS** is the consensus algorithm securing on-chain transactions, described in detail in the [White Paper](convex-whitepaper.md). Its main properties:

- Byzantine fault tolerance (67% stake required for stable consensus)
- Stake-weighted voting by peers
- Leaderless design — peers submit transactions in parallel, with zero block delay
- Resistance to front-running

Users and developers don't need to think about CPoS in daily use: peers handle it, clients get fast, secure transactions.

## Core building blocks

- **Accounts** are the fundamental unit of identity. Every account has a permanent numeric address (like `#42`), can hold coins and other assets, and is secured by a replaceable Ed25519 key pair. Accounts also act as programmable environments — each has its own namespace of definitions.
- **Transactions** are signed instructions executed atomically against the global state: transfers, smart contract calls, or arbitrary Convex Lisp code. If anything fails, the whole transaction rolls back automatically.
- **Queries** read network state. They are free, unsigned, and change nothing — never confuse them with transactions.
- **Actors** are autonomous accounts — the Convex equivalent of smart contracts. Once deployed, an actor's code executes deterministically on the [CVM](/docs/cad/cvmex) and can hold assets, enforce rules and provide services to other accounts.
- **Convex Coins (CVM)** are the native utility token, used to pay for transaction execution. The smallest unit is the *copper*: 1 Convex Coin = 1,000,000,000 copper. See [Convex Coins](/docs/tutorial/coins).
- **Juice** meters execution cost: every CVM operation has a defined juice price, so computation is paid for in proportion to the work ([CAD007](/docs/cad/juice)).
- **Memory accounting** meters storage: allocating on-chain memory consumes an account's memory allowance, releasing data refunds it, and allowance trades against Convex Coins in a global pool ([CAD006](/docs/cad/memory)). This is how Convex avoids unbounded state growth — see [Memory is money](/blog/memory-is-money).
- **Digital assets** of any kind — fungible tokens, NFTs, custom instruments — share a universal asset model ([CAD019](/docs/cad/assets)), so wallets and applications handle them uniformly.

## Where next

- [What Makes Convex Different](/docs/overview/different) — the design decisions behind these primitives
- [Use Cases](/docs/overview/use-cases) — what people build with them
- [User Guide](/docs/tutorial) — start building
