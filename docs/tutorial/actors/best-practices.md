---
slug: best-practices
title: Best Practices
sidebar_position: 3
---

Below are some practical pointers and best practices for actor development.

## Efficiency

### Minimise O(n) memory

Memory is a scarce global resource. It's fine to use memory for your actor code and basic data structures, but you should be very careful about memory allocation that scales in an O(n) fashion (e.g. with number of users, number of NFTs issued).

You should aim for only a few bytes of storage when O(n) scaling is happening. Some hints:

- If data isn't needed on-chain, don't store it on-chain. The global state is not the place for `.png` avatar files. Have a small integer ID on-chain, and store the big data at a URI that incorporates the ID, e.g. `https://foo.com/user/10101/avatar.png`
- Store per-user data in a vector like `[name address age]` rather than a structured map like `{:name name :address address :age age}`. The extra key metadata wastes bytes.


### Allow garbage collection

CVM memory accounting rewards those who free up memory. Always allow methods to remove dead / redundant / expired records from the CVM state. You can call these yourselves, or let others call them.

## Security

### Distrust all inputs

Anyone can call a `:callable` function. Assume malicious inputs may be passed and consider:

- Can they corrupt the data in the actor with invalid values?
- Can they cause values to be stored in the actor which may be undesirable
- Can they modify state in any other way that might be harmful?

Best practices are:

- Validate all inputs
- `fail` if the input is wrong in any way (state changes will get rolled back, so this is safe)
- Do not store user-submitted content in the actor state (logging or producing return values is fine)
- Write adversarial unit tests that give invalid inputs and check that the actor rejects them appropriately

### Sandbox external calls

When making a `call` to an external actor where you only want the result and don't expect any state changes, it is safer to sandbox this in a `query`

```clojure
(defn price-from-oracle [oracle]
  (query (call oracle (current-price))))   ;; should be read-only, safe inside query
```

This advice is especially important if you are making an external call early, e.g. as part of a pre-condition check in the CEI model.

### Beware `eval`

If you ever use `eval` or `eval-as` then be extremely careful of code injection attacks: do not allow these to run on any untrusted input.

### Beware untrusted function arguments

Functional programming superpowers come with the danger that arbitrary code can be passed as first class values. Consider the following:

```clojure 
(def vals [1 2 3 4])

(defn ^:callable process-values [f]
  (mapv f vals))

(call *address* (process-values inc))
=> [2 3 4 5]
```

This is a massive vulnerability, since `f` is an arbitrary function and gets called in the context of this account. Anyone can take over this actor with something like:

```clojure
(call ... (process-values (fn [x] (set-controller *address*) (set-key nil) :HAHA)))
```

Solutions:
- Don't allow functions as arguments to `:callable` actor functions
- If you must take functions as inputs, always run them inside a `query` for safety. Any state changes will be rolled back, so you are safe whatever the function does.

### Apply CEI pattern

Always structure actor functions as **Checks -> Effects -> Interactions** .

- **Checks** are preconditions on inputs / current state. You want to fail early if anything is invalid.
- **Effects** are any mutations to the state of the current actor. Do these *before* any external interactions to eliminate risk of re-entrancy attacks - you do not want any external actor to be able to make a re-entrant call while this actor is in an inconsistent state.
- **Interactions** are any external calls (e.g. token transfers facilitated by other actors). If these all succeed, then everything is good. If anything fails, we want to roll back.

## Development Process

### Use Queries for testing

Anything executed in a `query` is safe (state changes are automatically rolled back). So they are very useful when:
- You want to test code in a specific environment
- You don't want to incur unnecessary fees 
- You don't want to risk causing damage




