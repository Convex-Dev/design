# CAD014: Convex Name System

The Convex name system (CNS) is a globally accessible naming service available on the CVM. It performs the important function of providing trusted names for user accounts and other services on the CVM, and acts as a root of trust for the broader ecosystem of lattice technology services.

CNS provides trusted mutable references to resources via user-friendly names. When you resolve
`convex.trust`, you get the CURRENT trusted implementation, not a frozen historical version.

## Motivation

Similar to DNS on the Internet, there is a need for a naming system which provides:

- Meaningful human readable names
- A mapping to resources on the network
- Trusted and secure facilities for managing this information

This is intentional: it allows ecosystem-wide upgrades without requiring
modifications to source code or changing stored identifiers.

## User API

The CNS user API is a library implemented as standard by the `*registry*` (account `#9`, or `@cns`). Users need not use this library to access CNS (alternative implementations are possible, as is direct usage of the CNS SPI), but it is the canonical way to do so and it recommended in most cases.

### `resolve`

The resolve function gets the value referred to by a CNS name. This is the most fundamental CNS function.

```clojure
(@convex.cns/resolve 'convex.asset)
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

### `read`

The `read` function is similar to `resolve, but returns the entire CNS record:

```clojure
(@convex.cns/resolve 'convex.asset)
```

## Specification

### CNS Base Address

CNS is defined to have a specific base address, the account `#9` in the genesis state, which is also specified by `*registry*`. This is the actor from which all standard CNS lookups begin.

### CNS Records

A CNS record is a logical entry in CNS.

A CNS record MUST contain the following logical values:
- **Value** : The entity referred to be the CNS record, which SHOULD be an address or a scoped reference e.g/ `[#45 :some-key]`
- **Controller** : The controller that enables access to update the CNS record, which SHOULD be a valid trust monitor
- **Metadata** : Optional metadata attached to the CNS Record
- **Child** : Optional CNS node that handles child namespaces (typically a scoped address)

Any of the logical values MAY be `nil`

### CNS paths

Records in CNS MUST be specified specified by a path. 

Paths can be represented in at least two forms:

- A dot delimited symbol e.g. `convex.asset`
- A vector of strings e.g. `["convex" "asset"]`

Normally the user API makes use of symbols, while the CNS internal SPI uses vectors of strings. The rationale for this is:
- Dot delimited symbols are preferred for conciseness and human readability
- A vector of strings is more convenient and efficient for programmatic manipulation and internal database representation.

### CNS Nodes

CNS nodes are elements of the CNS tree that maintain mappings of names to records.

Typically, a CNS Node stores a map of names to records, but different implementations MAY implement such mappings in any way they chose, including creating mapping dynamically.

Note: there is a correspondence between CNS records and nodes: each CNS record may optionally specify the CNS node (Child) that represents any children.

### CNS Root

The CNS root is the CNS Node indicated by the empty path `[]`.

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

Instead of CNS, it is perfectly legitimate to directly use addresses that are known and trusted:

```clojure
(call #16789 (known-actor-function :foo))
```

Commonly, actor code might `import` a library from CNS at compile/deploy time into the local environment, then use it in subsequent code without further CNS lookups:

```clojure
(import convex.asset :as asset)

(defn my-balance [token]
  (asset/balance token *address*))
```

### Static compilation

It is reasonable to statically compile resolved CNS addresses so that future uses do not actually perform CNS lookups (which can be a relatively expensive operation). This can be done by compile time resolution as follows:

```clojure
(defn my-function [x]
  (call ~(resolve my.actor) (actor-function x)))
```

Examination of the resulting CVM ops will confirm that the result of `~(resolve my.actor)` has been statically compiled into the function.

### Alternative CNS roots

Users and application developers SHOULD adopt canonical CNS names, as other systems may not be able to resolve against an unrecognised CNS root.

Alternative CNS implementations MAY however be deployed with a different CNS root. Users will need to refer to the correct entry point for the alternative implementation.

## Security Considerations

### Deploy-time binding

It is important to note that `import` typically resolves at deployment time (i.e. then the `deploy` command is executed). This is intended behaviour, as it ensure the current on-chain CNS value is used. However it does imply that the same source code deployed at different times MAY resolve to different implementations, if the CNS value is updated in the interim.

Developers SHOULD consider the following for production usage:
  - Pinning to a specific address e.g. `(import #5678 :as foolib)`
  - Asserting a particular version e.g. `(assert (= 0xa412bce98da16e4b6790069a108d2d902a9929df76af3bcabaf7cf22df470108 (hash (encoding (account foolib)))))`
  - Checking resolution is as expected post deployment e.g. `foolib` as defined in the account refers to the intended library.

### Controller Trust

CNS records are as secure as their controllers. 

For mission-critical actor code handling significant value, users SHOULD verify:
- Controller addresses match expectations and are trusted
- Controllers of parent nodes are similarly trusted
- Accounts referenced via CNS resolution are similarly secure 

### Root Control

CNS root namespace and some key libraries are controlled by secure governance accounts, at least for the Protonet stage (typically #6). It is likely some of these will be made completely immutable once fully battle-tested.