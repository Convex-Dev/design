---
slug: scoped-actors
title: "Scoped actors: one contract, a million markets"
authors: [mikera, claude]
tags: [convex, cvm, lisp, digital-assets]
---

Convex 0.7.11 introduces **scoped actors**: instead of calling an actor by
its address alone, you can call it as `[#1234 :USD]` — an address plus a
*scope* value the actor interprets however it likes. One deployed contract
can now serve an unbounded family of assets, markets or resources, each
addressed as a first-class value.

<!-- truncate -->

## The deployment tax

The traditional smart contract model has a quiet cost baked in: one asset,
one contract. Want a new token? Deploy a contract. A new derivative? Deploy
another. Each deployment is more code on-chain, more memory, more addresses
to track, more upgrade surface — and every copy is byte-for-byte the same
logic with different parameters.

That's backwards. The logic is the invariant; the parameters are data.
Scoped actors make the CVM agree.

## How it works

Anywhere Convex accepts an actor reference, it now also accepts a vector of
`[address scope]`. When the actor is called through that path, it sees the
scope as `*scope*` — a special symbol, alongside `*caller*` and friends —
and dispatches on it however it chooses:

```clojure
;; One actor, many currencies
[#123456 :USD]
[#123456 :EUR]

;; One actor, every possible put option: underlying, strike, expiry
[#98765 [[#123456 :USD] 12500 1741948885345]]

;; One actor, a market on any football match
[#8978 ["2023-06-06" "Manchester United"]]
```

Look at that middle example again. The scope is a *structured value* — a
vector containing another asset path, a strike price and an expiry
timestamp. The derivative contract doesn't store a registry of every option
series anyone might trade; the option *is its path*. Two bets on different
outcomes of the same match are different (non-fungible with each other)
assets automatically, because their paths differ.

## Why this is the right shape

We'd already proven the pattern the hard way: the multi-token library lets
a single actor manage many fungible tokens, and it worked well enough to
make the general case obvious. Scoped actors lift that pattern out of
library convention and into the CVM itself, which buys three things:

- **Uniformity** — asset paths like `[#actor scope]` work across the whole
  asset abstraction, so wallets, exchanges and libraries handle scoped and
  unscoped assets identically.
- **Economy** — one copy of the code, one audit, one upgrade point,
  regardless of how many instances exist. On a network with memory
  accounting, not deploying ten thousand identical contracts is real money.
- **Expressiveness** — scopes are arbitrary CVM values, so the space of
  addressable things is as rich as your data model, not your deployment
  budget.

One caveat: the actor defines what scopes mean, so a badly written
actor can still mishandle them. Scoping is a power tool, not a safety
feature. Design your scope space as carefully as your storage layout.

We think this small addition changes how contracts get designed on Convex:
stop deploying instances, start defining *families*. The interesting
question is no longer "what contract shall I deploy?" but "what's the shape
of every market my contract could ever serve?"
