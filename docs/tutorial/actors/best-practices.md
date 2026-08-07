---
slug: best-practices
title: Best Practices
sidebar_position: 3
---

Practical guidance for building applications and actors on Convex: architecture choices, security, efficiency, and development process.

## Architecture

### Prefer pure dApps

The ideal model for a decentralised application is a "pure" dApp: a client-side front end using only decentralised services such as Convex as its back end. This keeps users fully self-sovereign and avoids operating and maintaining a server back end.

That said, there are legitimate reasons to include a traditional back end: integration with other services, large-scale off-chain data storage and analytics, custodial solutions where keys and assets are managed on a user's behalf, or private data unsuitable for a public network.

### Don't roll your own

Many needs are met "out of the box" on Convex, and sophisticated dApps can often be built **without writing any actor code at all**. Prefer existing, reviewed on-chain services to writing your own — it removes both development cost and security risk:

- General purpose fungible tokens: `convex.fungible` and `convex.multi-token`
- Automated market maker / token exchange: `torus.exchange`
- W3C-compatible decentralised identity registry: `convex.did`
- Trust monitors for authorisation and governance: `convex.trust` and related libraries ([CAD022](/docs/cad/trustmon))

See the [Recipes](/docs/tutorial/recipes) for worked examples — issuing a fully featured token is a one-liner.

## Security

### Distrust all inputs

Anyone can call a `:callable` function. Assume malicious inputs may be passed and consider:

- Can they corrupt the data in the actor with invalid values?
- Can they cause values to be stored in the actor which may be undesirable?
- Can they modify state in any other way that might be harmful?

Best practices are:

- Validate all inputs
- `fail` if the input is wrong in any way (state changes will get rolled back, so this is safe)
- Do not store user-submitted content in the actor state (logging or producing return values is fine)
- Write adversarial unit tests that give invalid inputs and check that the actor rejects them appropriately

Typical validation patterns:

**Check authorisation of the caller.** Use a trust monitor rather than hard-coding authorisation logic — it keeps access rules manageable and replaceable:

```clojure
;; In environment setup
(import convex.trust :as trust)

;; In checking code
(when-not (trust/trusted? trust-monitor *caller* :some-action)
  (fail :TRUST "Unauthorised"))
```

**Check IDs refer to real entities.** If an identifier refers to an asset or record, check the target exists — usually a map lookup:

```clojure
(defn ^:callable do-something [id]
  (let [entity (get map-of-entities id)]
    (or entity (fail "Invalid ID"))
    (do-internal-stuff entity)))
```

**Check numeric types and ranges.** A cast fails on invalid types and guarantees the expected type afterwards; re-binding the cast value in a `let` is idiomatic:

```clojure
(let [amount (integer amount)]
  (or (<= 0 amount max-amount) (fail "Amount out of range"))
  ...)
```

**Enforce data shape.** If a structured argument will be stored, check its shape before storing: vector lengths, required map keys, and constraints on the values inside. You do not want an attacker able to corrupt stored data structures with unexpected content.

### Prefer `*caller*` over `*origin*`

Authorisation checks in actor code should almost always test `*caller*` — the account that made the decision to call your function — not `*origin*`, the account that signed the transaction.

Checking `*origin*` opens a serious attack: if an attacker can trick a user into executing any of the attacker's code (for example via an innocent-looking library call), that code can then call your actor and pass every `*origin*`-based check while impersonating the user. A `*caller*`-based check attributes the request to the account that actually made it.

### Sandbox external calls

When making a `call` to an external actor where you only want the result and don't expect any state changes, it is safer to sandbox this in a `query`:

```clojure
(defn price-from-oracle [oracle]
  (query (call oracle (current-price))))   ;; should be read-only, safe inside query
```

`query` discards any state changes made by the enclosed form, so even if the untrusted code attempts a re-entrant attack, its side effects are thrown away. This advice is especially important if you are making an external call early, e.g. as part of a pre-condition check in the CEI model.

### Beware `eval`

If you ever use `eval` or `eval-as` then be extremely careful of code injection attacks: do not allow these to run on any untrusted input. If you must execute code from a potentially untrusted source, wrap it in `query` (safe if you only need the result), or run it in an isolated account that controls no economic assets, limiting the downside of a compromise.

### Beware untrusted function arguments

First-class functions come with the danger that arbitrary code can be passed as values. Consider the following:

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

Always structure actor functions as **Checks -> Effects -> Interactions**:

- **Checks** are preconditions on inputs / current state. You want to fail early if anything is invalid. If a check needs data from another actor, wrap the call in `query`.
- **Effects** are any mutations to the state of the current actor. Do these *before* any external interactions to eliminate risk of re-entrancy attacks - you do not want any external actor to be able to make a re-entrant call while this actor is in an inconsistent state.
- **Interactions** are any external calls (e.g. token transfers facilitated by other actors). If these all succeed, then everything is good. If anything fails, we want to roll back. If you make more than one external call, take extra care that the assumptions behind later calls still hold after earlier ones.

## Efficiency

### Minimise on-chain work

No matter how efficient the CVM is, off-chain computation and storage will always be cheaper. Keep on-chain code and data to what strictly needs consensus:

Good candidates for being on-chain:
- Economic transactions
- Ownership and control of digital assets
- Data relating to trust and authorisation
- Hashes allowing authentication / provenance of off-chain data
- Metadata intended for public consumption

Bad candidates for being on-chain:
- Large files or content blobs (use off-chain storage or the data lattice)
- User interface data (belongs in the front end)
- Textual information for human consumption (privacy risks, and internationalisation belongs in the front end)
- Secondary data structures used for analytics, e.g. indexes
- Logs of historical data

### Minimise O(n) memory

Memory is a scarce global resource. It's fine to use memory for your actor code and basic data structures, but you should be very careful about memory allocation that scales in an O(n) fashion (e.g. with number of users, number of NFTs issued).

You should aim for only a few bytes of storage when O(n) scaling is happening. Some hints:

- If data isn't needed on-chain, don't store it on-chain. The global state is not the place for `.png` avatar files. Have a small integer ID on-chain, and store the big data at a URI that incorporates the ID, e.g. `https://foo.com/user/10101/avatar.png`
- Store per-user data in a vector like `[name address age]` rather than a structured map like `{:name name :address address :age age}`. The extra key metadata wastes bytes.
- `nil`, `true`, `false` and the integer `0` need only one byte — prefer them where possible.
- A `Set` is more memory efficient than a `Map` if you only need keys.
- Allocate integer IDs from a monotonically incrementing counter: memory-efficient and collision-free.

### Avoid O(n) operations

Most CVM operations are cheap — typically O(1) or O(log n) — which scales to large data sets. Operations that scan every element of a structure are O(n), and their juice cost grows until at some point they cannot execute at all. Actor code should essentially never perform O(n) work. Alternatives:

- Replace with an O(1) formulation, which is usually possible
- Move the O(n) analysis off-chain and submit its (cheap to verify) result
- Break the work into smaller steps across transactions
- Enforce a strict small bound on `n`

### Minimise separate transactions

It is much cheaper to do several things in one transaction than to split them across many. If users commonly perform multi-step operations, provide a library function that performs the steps in a single transaction, or use a multi-transaction to combine them.

Related: there is no point paying the on-chain compiler when you don't need to. Pre-compile transaction code where you can — especially code containing macros, which may expand to much larger bodies — and statically link fixed references (`#1234/foo`) rather than paying for dynamic lookups when the target is not going to change.

### Allow garbage collection

CVM memory accounting rewards those who free up memory. Always allow methods to remove dead / redundant / expired records from the CVM state, and delete data eagerly when an update makes it redundant — for example, remove a zero balance's map entry entirely rather than storing a `0` against the key. The memory refund makes this cleanup economically positive for whoever triggers it.

Where *finding* expired records is expensive (e.g. scanning for old timestamps would be O(n)) but removing a known record is cheap, expose a `:callable` cleanup function and let third parties do the finding off-chain: the caller collects the memory refund, which typically more than covers the transaction cost, so redundant data gets cleaned up without the actor author doing anything.

## Development Process

### Use Queries for testing

Anything executed in a `query` is safe (state changes are automatically rolled back). So they are very useful when:
- You want to test code in a specific environment
- You don't want to incur unnecessary fees 
- You don't want to risk causing damage

## Next steps

- [Actor concepts](/docs/tutorial/actors/concepts) — the execution model behind these rules
- [Recipes](/docs/tutorial/recipes) — worked examples using the standard libraries
- [CAD022: Trust Monitors](/docs/cad/trustmon) — the authorisation model referenced above
