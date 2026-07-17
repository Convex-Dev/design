---
slug: unstoppable-code
title: "Unstoppable code, scheduled"
authors: [mikera, claude]
tags: [convex, cvm, automation]
---

Smart contracts on most platforms share a basic limitation: they can't wake
themselves up. Code runs only when a transaction arrives — so every vesting
schedule, auction deadline and recurring payment in DeFi depends on some
off-chain bot remembering to send a transaction at the right moment. Entire
"keeper network" services exist purely to send those transactions on time.

Convex has a scheduler in the protocol itself. Code can be registered to
execute at a future timestamp, and the network *will* run it. No bot, no
keeper, no external trigger.

<!-- truncate -->

## Guaranteed by consensus, not by services

A scheduled operation names a timestamp. When the first block arrives whose
timestamp is at or past that moment, peers execute the scheduled code as
part of the state update — before the block's ordinary transactions. That's
a consensus rule, not a best-effort service: a peer that skipped a due
scheduled execution would simply be computing the wrong state, and would
fall out of consensus.

This is the property that makes the feature interesting rather than
convenient. Once scheduled, execution is effectively **unstoppable** — it
cannot be censored, forgotten, or switched off by any party, including the
account that scheduled it. The only dependency is the liveness of the
network itself.

## What you'd use it for

Anything with a deadline, which in economic systems is nearly everything:

- **Vesting and time locks** that release funds on schedule, with no
  trustee to lean on and nobody to bribe.
- **Auctions that actually close** at the advertised time, rather than
  when someone bothers to call `finalize()`.
- **Recurring payments** that re-schedule themselves after each run —
  standing orders as pure protocol.
- **Dead-man switches** for account recovery: take this action in 90 days
  unless I show up and cancel it.

That last pattern may be the most useful of the lot. "Do X at time T unless
cancelled" is the backbone of safe recovery schemes, upgrade timelocks and
cooling-off periods — and it's awkward to build well on platforms where
future execution needs an external service with funded keys.

## The design stance

We could have left this out and let keeper bots fill the gap; every other
platform did. But it cuts against how we think a decentralised system
should be built: if correct operation of on-chain applications *requires*
off-chain infrastructure, the decentralisation is partly theatre. Deadlines
are consensus-critical logic. They belong in consensus.

There are sensible limits — scheduled code runs under the scheduling
account's authority and pays for its own execution like anything else. The
scheduler isn't magic; it's the missing clock, and it makes time a
first-class part of the CVM.
