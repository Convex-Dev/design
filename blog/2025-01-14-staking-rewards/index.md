---
slug: staking-rewards
title: "Stake, delegate, earn"
authors: [mikera, claude]
tags: [convex, tokenomics, networking]
---

With Protonet live, Convex 0.8.0 switched on something the network's
economics have been designed around from the start: **automatic reward
distribution to peers and delegated stakers**, computed and paid entirely
in consensus. No claiming transactions, no reward contracts to poke, no
operator scripts — participation itself is the payout mechanism.

<!-- truncate -->

## Two ways to stake

Convex consensus is stake-weighted: a peer's influence in CPoS is
proportional to the total stake behind it. That stake comes in two flavours
with deliberately different risk profiles.

**Peer stake** is placed by the operator on their own peer. It's a warranty
that the peer key is properly secured and the peer will maintain consensus
honestly — and it's at risk if that warranty fails.

**Delegated stake** is placed by any coin holder on a peer they trust. It's
a bet on the *operator*: delegated stake isn't at risk if the peer machine
crashes or is compromised, but it does share the operator's fate if the
peer's controller account is compromised. Delegators do real work for the
network — evaluating operators and concentrating stake behind the
trustworthy ones — and the reward mechanism pays them for it.

Note the consequence: security scales with the coin supply, not with the
number of servers. A holder who never runs infrastructure still
strengthens consensus by choosing good operators.

## Where rewards come from

Stakers earn a share of Convex Coins from two sources: **transaction fees**
accumulated from executed blocks, and **reward pools** funded over time by
the Convex Foundation. Distribution is proportional to stake — but weighted
by something more interesting than mere size.

## Rewards require participation

Rewards scale with **active time**: the consensus-time elapsed between a
peer's successfully executed blocks, capped in proportion to the peer's
share of total stake. Concretely, a peer carrying 1% of staked supply must
land a block roughly every ten minutes to bank its full active time; a
larger stake tightens the requirement.

The effect is that rewards flow to peers that actually *do the work of
consensus* — continuously, correctly, at a cadence matching their weight.
A peer can't park a large stake, go quiet, and collect; idleness dilutes
its own yield and nobody else's. And because all of this is computed inside
the state transition function, there's nothing to claim and nothing to
game: if the consensus ran, the accounting ran.

## What to expect

Staking on Convex is not passive yield — it's paid work with skin in the
game. Peer operators are paid for keeping secure, live infrastructure;
delegators are paid for allocating trust well. Both can lose stake if they
do their job badly. We think that's exactly what a security budget should
look like: every coin of reward traceable to a coin of risk taken and a
service rendered.

Full details are in [CAD016 (Peer Staking)](/docs/cad/peerstake) and
[CAD020 (Tokenomics)](/docs/cad/tokenomics). If you hold coins, find a peer
operator worth vouching for — the protocol handles the rest.
