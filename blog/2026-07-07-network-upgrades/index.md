---
slug: network-upgrades
title: "Networks that evolve: scheduled upgrades in consensus"
authors: [mikera, claude]
tags: [convex, cvm, lattice, networking]
---

Convex 0.8.7 ships something most decentralised networks still handle
out-of-band with flag days and coordinated restarts: **protocol upgrades
scheduled on-chain**, activating at a precise instant in consensus time,
with the network's identity — its genesis hash — untouched. No hard fork,
no new chain.

<!-- truncate -->

## The problem

A decentralised network must evolve: CVM semantics, juice costs, encodings
and on-chain libraries all need room to improve after launch. But the naive
approach — just change the code — breaks the one thing that matters: peers
running different versions compute different states, diverge from consensus,
and the network forks. Worse, some improvements are simply *impossible*
without a mechanism like this, because any change to core libraries changes
the genesis state hash — and genesis is bedrock identity. Once set, it never
changes.

## The mechanism

An upgrade is a **single atomic transition** recorded in consensus, with two
effects: a migration (a pure `State → State` function that may rewrite core
libraries, adjust juice constants, or convert data formats) and a protocol
version increment — always exactly one. The protocol version is literally a
count of applied upgrades.

Activation is **timestamp-gated**. A governance account schedules the
upgrade with the new `schedule-upgrade` core function, and the schedule
itself lives in consensus state. The first block whose timestamp reaches the
activation instant fires the migration as its very first step, before any
ordinary transactions. Every peer runs the same check against the same
shared block timestamp, so every peer fires the upgrade at exactly the same
point in history. Replaying the chain from genesis reproduces the upgrade,
like any other transition.

Putting the schedule *in state* is a soundness requirement, not a
convenience: a peer can only step aside for an upgrade it knows about. If
the schedule travelled out-of-band, a peer that missed the memo would keep
executing old rules and silently fork. On-chain, "apply, withdraw, or
continue" is a deterministic function of state for every peer — including
peers that don't have the new code.

## The choreography

The mechanism also covers peers that *can't* upgrade. They warn their
operator, then shed their stake in a randomised window before activation —
so the upgraded majority still holds a supermajority when the boundary
arrives — and cleanly step out of consensus at the activation point. Update
the software, and they rejoin. No fork occurs; out-of-date peers sit out
until they catch up.

The migrations themselves are static JVM code, reviewed and shipped in peer
releases — deliberately *not* CVM-resident actor code, because an actor
enforcing its own governance would be upgradeable code that itself might
need upgrading. The mechanism that fixes bugs shouldn't be able to harbour
them.

## What's next

The first scheduled upgrade — protocol v1 — is now live machinery, and the
tooling around it is growing: 0.8.9 will include a rehearsal tool that
replays a scheduled upgrade against a live network with state-diff and
coin-supply checks, and fresh local networks now launch at the latest
protocol version by default. Our testnet will take upgrades in place as
rehearsals for Protonet.

The result is a network that can be improved while it runs, without ever
touching its identity. The full design is in
[UPGRADE.md](https://github.com/Convex-Dev/convex/blob/develop/convex-core/docs/UPGRADE.md).
