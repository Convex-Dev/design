---
slug: concepts
title: Key Concepts
sidebar_position: 0
---

Actors are programmable, autonomous accounts that power automation on Convex. 

## Actor Accounts

Every Convex account can hold data and code in their own environment.

Actors extend this model by bundling code with state:

- **User Account**: controlled by an externally held key pair, executes transactions it receives as long as they are correctly signed
- **Actor**: autonomous account, exposes callable functions that other accounts or actors can call - it's `*key*` is typically set to `nil`

Use regular accounts when external users (humans, client software, AI agents etc.) need to submit transactions for the account. Use actors when you need trusted programmable or shared behaviour.

## Callable code

Actors are accessed via **callable functions**, which are just regular functions annotated with the metadata `^:callable`. A simple example might look like this:

```clojure
;; In account #1337
(defn ^:callable hello []
  (str "Hello " *caller* " from " *address*))
```

This can be called from another account as follows:

```clojure
;; In account #11
(call #101 (hello))
=> "Hello #11 from #1337"
```

Note that while the callable actor function is running `*caller*` is the account that called the function, and `*address*` is the actor (`*address*` always references the CVM account in which code is currently running)

## Lifecycle

1. **Authoring**: write Convex Lisp functions that return updated state and values.
2. **Deployment**: upload code to the lattice or global state and compile it on-chain.
3. **Evolution**: upgrade code or migrate state as requirements change.

Transactions against actors are atomic: either the whole call succeeds (with state updates) or it fails with no partial effects. This property makes complex coordination safe.

## Interaction Flow

Actors process calls atomically within the CVM:

1. A caller submits a transaction containing a `call` instruction with the actor address and function.
2. The CVM context switches to the actor, then evaluates the function.
3. Results and state changes are committed if evaluation succeeds, or rolled back otherwise.

Because calls are atomic and completely ordered, you can write deterministic logic without worrying about race conditions between transactions.


## Comparison to EVM contracts

For developers familiar with coding in Solidity on the EVM, the following differences may be helpful to note:

- Actors are typically more sophisticated than EVM contracts, e.g. a single actor might represent an entire class of digital assets (multiple tokens) rather than a single ERC20 token
- Actors are easy to upgrade, thanks to the dynamic nature of the CVM