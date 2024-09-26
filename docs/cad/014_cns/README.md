# CAD014: Convex Name System

The Convex name system (CNS) is a globally accessible naming service available on the CVM. It performs the important function of providing trusted names for user accounts and other services on the CVM, and acts as a root of trust for the broader ecosystem of lattice technology services.

## Motivation

Similar to DNS on the Internet, there is a need for a naming system which provides:

- Meaningful human readable names
- A mapping to resources on the network
- Secure facilities for managing this information


## User API

The CNS user API is a library implemented as standard by the `*registry*` (account `#9`, or `@cns`). Users need not use this library to access CNS (alternative implementations are possible, as is direct usage of the CNS SPI), but it is the canonical way to do so and it recommended in most cases.

### `resolve`

The resolve function gets the value referred to by a CNS name. This is the most fundamental CNS function.

```clojure
(@cns/resolve 'convex.asset)
=> #18
```

This is equivalent to using the core macro `resolve`:

```clojure
(resolve convex.asset)
=> #18
```

And is also equivalent to just using the resolution symbol `@` directly:

```clojure
@convex.asset
=> #18
```

The resolve function returns `nil` if the CNS name referred to does not exist.

## Specification

### CNS Base Address

CNS is defined to have a specific base address, the account `#9` in the genesis state, which is also specified by `*registry*`. This is the actor from which all standard CNS lookups begin.

### CNS Records

A CNS record is a logical entry in CNS.

A CNS record MUST contain the following logical values:
- **Value** : The entity referred to be the CNS record, which SHOULD be an address or a scoped reference e.g/ `[#45 :some-key]`
- **Controller** : The controller that enables access to update the CNS record, which SHOULD be a valid trust monitor
- **Metadata** : Optional metadata attached to the CNS Record
- **Child** : Optional CNS implementation that handles child namespaces (typically a scoped address)

Any of the logical values MAY be `nil`

### CNS paths

Records in CNS MUST be specified specified by a path. 

Paths can be represented in at least two forms:

- A dot delimited symbol e.g. `convex.asset`
- A vector of strings e.g. `["convex" "asset"]`

Normally the user API makes use of symbols, while the CNS internal SPI uses vectors of strings. The rationale for this is:
- Dot delimited symbols are preferred for conciseness and human readability
- A vector of strings is more convenient and efficient for programmatic manipulation and internal database representation. 

### CNS Root

The CNS root is the record indicated by the empty path `[]`.

As such, it acts as the parent for all root namespaces (e.g. `convex`).

The CNS root SHOULD NOT be modifiable by any accounts other than those controlled by the governance body. Initially full control is restricted to the governance address `#6`, and namespace management to the genesis account `#11`.

### Root namespaces

The following root namespaces are initially available:

- `convex` - reserved for approved convex libraries and tools. Typically these SHOULD be FULLY specified with a CAD (e.g. `convex.asset` API as specified in CAD19). Governance approval required.
- `asset` - reserved for digital asset implementations. Names will be allocated subject to community / governance approval and/or audit
- `user` - intended for developer user accounts. Open access, names / subdomains are assets obtainable for a fixed Convex coin cost.
- `torus` - reserved for validated open source marketplaces and trading contracts such as the Torus DEX. Community approval required.
- `lab` - open access, for on-chain testing of actors and smart contracts
- `app` - reserved for decentralised application actors and contracts. Community approval required.
- `peer` - reserved for established peer operators. Community or governance approval required, which will normally granted to peer operators with a proven record of correctly maintaining at least 10,000 Convex Gold stake.
- `id` - reserved for decentralised IDs. Open access, names are assets obtainable for a small Convex Coin cost

New root namespaces require Foundation governance approval.


## Alternatives

Nothing in Convex requires the use of CNS. It MUST be possible to create working systems on the CVM without relying on CNS.

### Direct addressing

Instead of CNS, it is perfectly legitimate to directly use addresses that are known:

```clojure
(call #16789 (known-actor-function :foo))
```

Commonly, actor code might `import` a library from CNS at compile time into the local environment, then use it in subsequent code without further CNS lookups:

```clojure
(import convex.asset :as asset)

(defn my-balance [token]
  (asset/balance token *address*))
```

### Static compilation

It is reasonable to statically compile resolved CNS addresses so that future uses do not actually perform CNS lookups (which could be a relatively expensive operation). This can be done by compile time resolution as follows:

```clojure
(defn my-function [x]
  (call ~(resolve my.actor) (actor-function x)))
```

Examination of the resulting CVM ops will confirm that the result of `~(resolve my.actor)` has been statically compiled into the function.

### Alternative CNS roots

Users and application developers SHOULD adopt canonical CNS names, as other systems may not be able to resolve against an unrecognised CNS root.

Alternative CNS implementations MAY however be deployed with a different CNS root. Users will need to refer to the correct entry point for the alternative implementation.