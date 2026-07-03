---
title: Building an Actor
sidebar_position: 2
---

# Building an Actor

This walkthrough builds a small but complete actor — a shared counter that anyone can increment, but only its owner can reset. Every step runs in the [Sandbox](/docs/tutorial/quickstart) or a REPL; the `=>` lines show the expected result.

## 1. Deploy

We deploy in one step, defining the owner, the initial state, and three callable functions:

```clojure
(def counter
  (deploy
    '(do
       (def owner *caller*)        ;; the account that deploys becomes the owner
       (def count 0)

       (defn ^:callable increment []
         (def count (inc count))
         count)

       (defn ^:callable get-count []
         count)

       (defn ^:callable reset []
         (when-not (= *caller* owner)
           (fail :TRUST "Only the owner may reset"))
         (def count 0)))))
=> #1234
```

`deploy` runs the quoted code inside a brand-new account and returns its address. `owner` captures `*caller*` — the deployer — as the trusted account.

## 2. Call it

Anyone can increment and read the count:

```clojure
(call counter (increment))
=> 1
(call counter (increment))
=> 2
(call counter (get-count))
=> 2
```

Inside each call, `*caller*` is the calling account and `*address*` is the counter itself.

## 3. Owner-only actions

The owner can reset:

```clojure
(call counter (reset))
=> 0
```

If a **different** account calls `reset`, the `:TRUST` check fails — and because a failed call rolls back completely, the count is left untouched:

```clojure
;; called from some other account
(call counter (reset))
=> Exception: :TRUST Only the owner may reset

(call counter (get-count))
=> 0      ;; unchanged — the failed reset had no effect
```

That is the core actor-safety pattern: **authorise against `*caller*`, and let `fail` roll back on rejection** (see [Key Concepts → Authorisation](concepts.md#authorisation)).

## 4. Where next

- **[Coin Distributor](../recipes/coin-distributor/index.md)** — a complete actor that distributes coins, using these same patterns
- **[Account Control](../recipes/account-control/index.md)** — controllers and multi-signature
- **[Evolution](evolution.md)** — upgrading a live actor
- **[Best Practices](best-practices.md)** — checklists for safe actors
