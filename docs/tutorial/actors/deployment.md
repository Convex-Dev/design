---
slug: deployment
title: Deployment
sidebar_position: 1
---

## Actor deployment

Actors are created with the `deploy` function, which:

- Creates a new, empty account in the CVM state
- Runs the given code inside that account, so its `def`s become the actor's state and functions
- Returns the address of the new actor

The code you pass is **quoted** — `deploy` runs it in the new account rather than in the caller's:

```clojure
(def greeter
  (deploy
    '(defn ^:callable greet [name]
       (str "Hello, " name "!"))))
=> #1234

(call greeter (greet "World"))
=> "Hello, World!"
```

### Multiple forms

`deploy` accepts several forms, run in order — useful for setting up state and functions together. You will also see a single `(do ...)` form used to group them:

```clojure
(deploy
  '(def owner *caller*)     ;; the deployer
  '(def total 0)
  '(defn ^:callable add [n] (def total (+ total n))))
```

## Test before you deploy

A bad deploy can leave you with a broken or uncontrollable actor, so test the code first. Because code run inside a `query` is always rolled back, you can deploy-and-test safely without committing anything:

```clojure
(query
  (let [a (deploy '(do (def n 0)
                       (defn ^:callable inc-get [] (def n (inc n)) n)))]
    (assert (= 1 (call a (inc-get))))
    (assert (= 2 (call a (inc-get))))
    :ok))
=> :ok
```

If the query returns `:ok`, the same code behaves identically when you deploy it for real — the whole transaction is atomic, so a test that passes in the query phase deploys reliably.

Test adversarially too: pass bad inputs and confirm the actor rejects them (e.g. with a `:CAST` or `:TRUST` error) rather than misbehaving.
