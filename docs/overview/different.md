---
sidebar_position: 1
title: What Makes Convex Different
---

# What Makes Convex Different

Every platform claims to be fast and scalable. This page lists the specific design decisions where Convex departs from the mainstream — and links the evidence for each, so you can judge for yourself.

## It is not a blockchain

Convex reaches consensus without a chain of blocks. Peers share and merge *Belief* data structures — a [CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) — and the network converges on a single transaction ordering because lattice merges mathematically must converge. There is no leader election, no mining, no proof-of-work waste.

This is not a detail of implementation; it is where most of the other differences come from. See [Lattice Technology](/docs/overview/lattice) for how it works and the [White Paper](/docs/overview/convex-whitepaper) for the full treatment.

## Zero block delay

On most platforms, your transaction waits for someone's turn to make a block. On Convex, any peer publishes a block the instant it has a transaction — simultaneous blocks from different peers are simply merged and ordered by consensus. Combined with leaderless design, this gives sub-second finality and **built-in front-running resistance**: there is no privileged block producer to reorder your trade.

The numbers and the mechanism are on the [Performance](/docs/overview/performance) page.

## One global state

No shards, no bridges, no roll-ups, no cross-chain messaging to design around. Convex maintains a single consistent global state, and transactions against it are **atomic and Turing complete** — arbitrary logic with automatic rollback if anything fails. The engineering that makes one state scale (structural sharing, delta transmission, embedded encodings) is described in [Lattice Technology](/docs/overview/lattice).

## Memory is a tradeable resource

On-chain storage is usually an unpriced externality: users pay once to write, peer operators store forever. Convex has [memory accounting](/docs/cad/memory): every account holds a memory allowance, allocation consumes it, and **deleting data refunds it**. A global memory pool caps total state size and lets accounts buy and sell allowance for Convex Coins. Storage stays priced, bounded, and worth cleaning up.

Background and rationale: [Memory is money](/blog/memory-is-money).

## The compiler lives on-chain

You don't submit bytecode compiled by an external toolchain — you submit **source**, and the CVM expands and compiles it in consensus, juice-metered like any computation. That's why development on Convex is REPL-first (type an expression, it runs on the network), why `deploy` is a one-liner, and why there is no "verified source" problem: the chain compiled it, so the chain knows.

Details: [CAD008 (Compiler)](/docs/cad/compiler) and [The compiler lives on-chain](/blog/on-chain-compiler).

## Your address is not your key

A Convex address (`#1234`) is a permanent identity; the Ed25519 key attached to it is replaceable data. Rotate keys in one transaction without moving assets or updating anyone. Actors are simply accounts with no key, and accounts can designate controllers — enabling time-locked recovery and programmable custody, none of it requiring protocol changes.

Why this matters: [Your address is not your key](/blog/your-address-is-not-your-key).

## Networks that upgrade without forking

Protocol upgrades are scheduled **on-chain** and activate at a consensus timestamp: state migration applied in lock-step by every peer, protocol version incremented, genesis hash untouched. Peers that can't upgrade shed stake and step out cleanly rather than forking the network. Convex can keep improving for decades without ever becoming a different network.

How it works: [Networks that evolve](/blog/network-upgrades).

## The lattice is bigger than the chain

Consensus is one *region* of the Lattice. The same convergent-merge technology also runs a [replicated file system](/docs/cad/dlfs), a [SQL database](/docs/cad/convex_sql) with a PostgreSQL wire protocol, [Kafka-style streaming queues](/docs/cad/lattice_queue), and delegated, capability-based [authorisation](/docs/cad/lattice_auth) — plus [Covia](https://covia.ai), the federated AI orchestration grid built on Convex. One data model, on-chain and off.

The full map is in [Lattice Technology](/docs/overview/lattice).
