# Trust Monitors

## Overview

Trust Monitors are composable, secure, on-chain authorisation modules that can be used to define arbitrary access rules for smart contracts, digital assets and other capabilities needed for open economic systems.

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

A trust monitor SHOULD be referenced as an account address with an optional scope.

Examples:

```
- #45               ;; A trust monitor as a account
- [#78 1467476]     ;; A trust monitor as a scoped account
```

The target account SHOULD exist. Attempts to use a trust monitor with a non-existent account are possible but likely to error.

The target account MAY be a user account.

The reference MAY be `nil`, which behaves as a trust monitor that never provides any authorisation.

### `check-trusted?` SPI

A Trust Monitor MUST implement the callable function `check-trusted?` as a common SPI to support its use according to this standard.

The `check-trusted?` function must accept three arguments corresponding to `subject`, `action` and `object`. Example:

```
(defn ^:callable
  check-trusted?
  [subject action object]
  (boolean
    (and
      (= subject object)
      (= action :examine-self))))
```

The Trust Monitor SHOULD return `true` or `false` for all possible argument values. While CAD22 functionality will work with any results (via the truthiness or falsiness of all values), callers may expect the specific values `true` or `false`, so returning anything else may break compatibility with some potential applications.

The Trust Monitor MAY implement arbitrary access control logic on the basis of the arguments provided and the current CVM state. This might include looking up values in an on-chain database or calling other actors for confirmatory information.

The Trust Monitor SHOULD avoid excessive computation and stack depth usage. Ideally it SHOULD be guaranteed `O(1)` in both, with a small constant. Use of pre-computed Sets or Maps for lookups in data structures is recommended: it is unsafe to perform scans of arbitrary data structures in a trust monitor context, since this could enable DoS attacks. 

The Trust Monitor MUST NOT rely on side effects, and MUST operate correctly when called within a `query` context. This requirement is to ensure that callers can wrap a trust monitor call in a `(query ...)` or similar construct to avoid potential security risks (e.g. re-entrancy attacks from some malicious nested code).

### Trust checks

A trust monitor check MUST return a truthy or falsey result for any `[subject action object]` combination. It should never fail (except for hitting resource constraints like `:JUICE`)

When checking a `[subject action object]` combination against a trust monitor the following procedure SHOULD be performed:

1. If the trust monitor is an account implementing a callable function `check-trusted?` then return the result of calling that function while protected with a query: `(query (call trust-monitor (check-trusted? subject action object)))`
2. If the trust monitor is an unscoped Address, and is precisely equal to the `subject`, then return `true`
3. Return `false`

If the trust monitor is known and trusted, then the caller MAY simplify the above procedure and call the SPI directly:

```
(call trust-monitor (check-trusted? subject action object))
```

### Subjects

Subjects of Trust Monitor checks SHOULD be valid unscoped Convex account addresses. 

In most cases, the subject will be the `*caller*` of some actor code which needs to perform authorisation checks on the caller.

### Actions

Actions SHOULD be short human readable keywords, e.g. `:update`

Actions MAY be any CVM value, which could include a data structure descibing the action in more detail. We urge caution on making actions too complex: it would be easy to introduce tricky security bugs.

Actions SHOULD NOT depend on information provided by or subject to influence by untrusted users. In most cases, the action should be hard-coded to a specific value relevant to the context of the authorisation check being performed.

### Objects

Objects SHOULD be the caninical identifier of the object being acted upon. Thypically this is some information or resource which is protected by the authorisation check.

Most common object types are likely to be:
- A Convex address (possibly scoped)
- An integer ID

## Reference Implementation notes

### `convex.trust` library

The `convex.trust` library provides a canonical CAD22 compatible interface to trust monitors via the `trusted?` function:

```clojure
(import convex.trust :as trust)

(trust/trusted? monitor subject)
(trust/trusted? monitor subject action)
(trust/trusted? monitor subject action object)
```

Action and object are optional: if omitted, they are passed to the Trust Monitor as the value `nil`

### `convex.trust.monitors` library

The `convex.trust.monitors` library provides a set of lightweight standard trust monitor implementations.

These are designed to be *composed*, i.e. they are building blocks which can be used to create more sophisticated trust monitors and associated governance functionality.

```clojure
(import convex.trust.monitors :as mon)

;; Permit a specific set of subjects (effectively a fixed whitelist)
(trust/trusted? (mon/permit-subjects #3 #14 #17) #14)
=> true

;; Permit a specific set of actions only
(trust/trusted? (mon/permit-actions :open :close) #14 :delete :some-target)
=> false

;; Permit something that satisfies ALL of the given trust monitors
;; This is an example of composing trust monitors
(trust/trusted? (mon/all (mon/permit-actions :open :close) (mon/permit-subjects #13 #17)) #13 :open :some-target)
=> true

;; Permit based on calling a function on (subject, action, object)
;; This can be a good way to allow subjects to control resources that they logically "own" 
(trust/trusted? (mon/rule (fn [s a o] (= s o))) #16 :foo #16
=> true
```
