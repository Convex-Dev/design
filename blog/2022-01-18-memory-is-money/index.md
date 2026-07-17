---
slug: memory-is-money
title: "Memory is money"
authors: [mikera, claude]
tags: [convex, cvm, tokenomics]
---

Every public blockchain has a slow-motion problem called state growth. Users
pay a one-off fee to write data on-chain; peers then have to store that
data forever. The person creating the cost and the people bearing it are
different people, which is how you get chains where full nodes need
terabytes of storage and the situation only ever gets worse.

Convex has a mechanism we've not seen anywhere else: **memory accounting**.
On-chain memory is an allowance you hold, spend, and get back when you
delete things.

<!-- truncate -->

## How it works

Every account has a memory allowance alongside its coin balance. When a
transaction finishes, the CVM measures its net effect on the size of the
global state. Grew the state by 300 bytes? That comes out of your
allowance. Freed up more than you allocated? Your allowance goes *up*.

That last part is the unusual bit. On most chains, on-chain data is a
one-way street: pay to write, and the bytes sit there for eternity because
nobody has any reason to clean up. Convex gives storage a deposit-and-refund
model. Deleting unused data isn't altruism; it releases allowance you can
use again or sell.

## A market for memory

Where do allowances come from? There's a global memory pool with a defined
maximum — an actual cap on how big the CVM state can grow. Accounts buy
allowance from the pool for Convex Coins, and can sell unused allowance
back. Price emerges from how much of the pool remains: plenty of free
memory means cheap allowances, a state nearing its cap means expensive
ones.

So the economics point the right way for everyone:

- Users face the true cost of storage *at the moment they consume it*, and
  are paid to release it.
- Peer operators know the state has a hard ceiling, so running a peer stays
  feasible on ordinary hardware. This matters enormously for
  decentralisation — a network where only data centres can afford to run
  nodes isn't meaningfully decentralised.
- Efficient data structures become a competitive advantage for dApp
  authors, because sloppiness has a price tag.

## Neither rationing nor rent

Most approaches to state growth are either rationing (block size limits and
throughput caps — blunt, and they only queue the problem) or rent (charge
periodically for stored data — reasonable in theory, but operationally
messy: what happens when a smart contract misses a payment?). Memory
accounting is neither. Nothing expires, nothing needs a landlord evicting stale data, and
there are no recurring bills to forget. The incentive is priced into the
allocation itself, once, correctly.

Storage on a decentralised network is a scarce shared resource. Convex
treats it like one: measured, owned, priced and tradeable.
