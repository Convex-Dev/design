# Trust Monitors

## Overview

Trust Monitors are composable, secure, on-chain authorisation modules that can be use to define arbitrary access rules for smart contracts, digital assets and other capabilities needed for open economic systems.

The core idea is that a Trust Monitor can grant or deny access based on three parameters:

- **Subject** - The entity attempting to perform an action (almost always an Account on Convex)
- **Action** - The specific action being performed (usually denoted by a human readable keyword e.g. `:update`)
- **Object** - The target object affected by the action (depends on context, but often the ID of an entity being accessed)

Examples of possible Trust Monitor implementations:
- A list of authorised users who may approve a smart contract action
- A time delay before an action may be performed
- Authorisation based on possession of a specific type of NFT

Trust Monitors are based on the reference monitor model, which was developed as part of United States military. It continues to be the case that systems evaluated at level B3 and above under the Trusted Computer System Evaluation Criteria (TCSEC) are required to use the reference monitor model to enforce access controls.

## Design Objectives

### Pluggable Architecture

Trust monitors are designed to be pluggable so that they can be re-used in different contexts. It is common that different systems may way to grant the same access rights, and hence the monitors themselves should be easily re-usable

### User controlled

Trust monitors should normally be specified by the person who has control rights over some resource. 

For example, if a user is running an auction, they might wish to provide a trust monitor to define who has the right to cancel the auction.

### Sandboxing

It is frequently desirable that access to trust monitors are fully sandboxed, in particular they should not be able to perform any on-chain action that might harm the caller (e.g. a re-entrancy attack). This danger is particularly acute given that:
- Trust monitors representation delegation to potentially untrusted code
- We want to be able to allow people to provide their own trust monitors

As such, we want to be able to use trust monitors in `query` mode.

### Efficiency

We wish to allow trust monitors to be widely and cheaply used. As such, they should be efficient in terms of both memory and juice costs.

## Specification

### Trust Monitor Reference

A trust monitor MUST be referenced as an account address with an optional scope.

Examples:

```
- #45               ;; A trust monitor as a account
- [#78 1467476]     ;; A trust monitor as a scoped account
```

The target account SHOULD exist. Attempts to use a trust monitor with a non-existent account are possible but likely to error.

The target account MAY be a user account.

### `check-trusted?` callable function

A Trust Monitor MUST implement the callable function `check-trusted?`

The `check-trusted?` function must accept three arguments: `subject`, `action` and `object`

The Trust Monitor SHOULD return true or false for all possible argument values.

The Trust Monitor MAY implement arbitrary access control logic.

The Trust Monitor SHOULD avoid excessive computation, stack depth usage.

The Trust Monitor MUST NOT rely on side effects, and should expect to be called within a `query` context.

### Trust checks

A trust monitor check MUST return a truthy or falsey result for any `[subject action object]` combination. 

When a trust monitor is required to check a `[subject action object]` combination the following procedure MUST be performed:

1. If the trust monitor is an account implementing a callable function `check-trusted?` then return the result of calling that function while protected with a query: `(query (call trust-monitor (check-trusted? subject action object)))`
2. If the trust monitor is an unscoped address, and is precisely equal to the `subject`, then return `true`
3. Return `false`

## Implementation notes

### `convex.trust` library

The `convex.trust` library provides a canonical interface to trust monitors via the `trusted?` function:

```clojure
(import convex.trust :as trust)

(trust/trusted? monitor subject)
(trust/trusted? monitor subject action)
(trust/trusted? monitor subject action object)
```

Action and object are optional: if omitted, they are passed to the Trust Monitor as the value `nil`
