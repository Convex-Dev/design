# CAD014: Convex Name System

The Convex Name System (CNS) is a globally accessible naming service available on the CVM. It performs the important function of providing trusted names for user accounts and other services on the CVM, and acts as a root of trust for the broader ecosystem of lattice technology services.

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

The CNS user API is a library implemented as standard by the `*registry*` (account `#9`, or `@convex.registry`). Users need not use this library to access CNS (alternative implementations are possible, as is direct usage of the CNS SPI), but it is the canonical way to do so and is recommended in most cases.

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

The `read` function is similar to `resolve`, but returns the entire CNS record as a `[value controller metadata child]` vector (or `nil` if the record does not exist):

```clojure
(@convex.cns/read 'convex.asset)
=> [#18 #6 nil nil]
```

### `create`

The `create` function creates or overwrites a CNS record at the given path, subject to authorisation (see Authority model below):

```clojure
(@convex.cns/create 'my.actor.name target-value)
(@convex.cns/create 'my.actor.name target-value controller metadata)
```

Any intermediate CNS nodes required by the path are created automatically. Where record values are not specified, existing values are preserved (or defaulted for a new record, with the controller defaulting to `*address*`).

### `update`

The `update` function changes the value of an existing CNS record, preserving its controller, metadata and child node. It fails with a `:STATE` error if the record does not exist.

```clojure
(@convex.cns/update 'my.actor.name new-value)
```

### `control`

The `control` function changes the controller of an existing CNS record:

```clojure
(@convex.cns/control 'my.actor.name new-controller)
```

Note: this changes the *record controller* only. It does not transfer ownership of any child CNS node associated with the record — see Authority model below.

## Specification

### CNS Base Address

CNS is defined to have a specific base address, the account `#9` in the genesis state, which is also specified by `*registry*`. This is the actor from which all standard CNS lookups begin.

### CNS Records

A CNS record is a logical entry in CNS.

A CNS record MUST contain the following logical values:
- **Value** : The entity referred to by the CNS record, which SHOULD be an address or a scoped reference e.g. `[#45 :some-key]`
- **Controller** : The controller that enables access to update the CNS record, which SHOULD be a valid trust monitor
- **Metadata** : Optional metadata attached to the CNS record
- **Child** : Optional CNS node that handles child namespaces (typically a scoped address)

Any of the logical values MAY be `nil`.

The standard registry represents a record as a 4-element vector `[value controller metadata child]`. Alternative node implementations SHOULD use the same representation for interoperability.

### CNS Paths

Records in CNS MUST be specified by a path.

Paths can be represented in at least two forms:

- A dot delimited symbol e.g. `convex.asset`
- A vector of strings e.g. `["convex" "asset"]`

Normally the user API makes use of symbols, while the CNS internal SPI uses vectors of strings. The rationale for this is:
- Dot delimited symbols are preferred for conciseness and human readability
- A vector of strings is more convenient and efficient for programmatic manipulation and internal database representation.

#### Segment syntax

Path segments are strings. Constraints on segment names are **node-implementation-defined**: each CNS node determines what names it accepts (e.g. a node selling user names may enforce a restricted charset and minimum length; the standard registry currently accepts any string).

However, since the canonical user API addresses records via dot-delimited symbols:

- Segment names SHOULD be non-empty strings that round-trip through the symbol representation (i.e. contain no `.` characters and form a valid symbol when joined with `.`).
- Node implementations SHOULD reject segment names that cannot be expressed as part of a dot-delimited symbol, since such records are unreachable via the standard user API and standard tooling.

### CNS Nodes

CNS nodes are elements of the CNS tree that maintain mappings of names to records.

Typically, a CNS node stores a map of names to records, but different implementations MAY implement such mappings in any way they choose, including creating mappings dynamically.

A node is identified by a scoped reference, e.g. `[#9 ["convex"]]` — an actor address plus an implementation-defined key (the standard registry uses the full path vector as the key).

Note: there is a correspondence between CNS records and nodes: each CNS record may optionally specify the CNS node (Child) that represents any children.

### Authority model

CNS separates two distinct authorities, **by design**:

- The **record controller** (element 1 of a record) — a trust monitor governing changes to *that record*: updating its value, metadata or child link, and transferring record control.
- The **node owner** — a trust monitor governing the *namespace structure* of a node: creating and deleting entries within it, creating child nodes, and transferring node ownership.

The two usually start out identical (creating a path sets both to the same controller) but MAY legitimately diverge. This supports **delegation**: a namespace owner can hand out records (names) to third parties, who control their own record values, while the namespace owner retains authority over the namespace itself — including the ability to revoke (delete) entries.

Consequences that users MUST understand:

- Transferring a name with `control` transfers the record only. The namespace *under* that name (the child node, if any) remains with its current owner. A complete handover of a name and its subtree is therefore **two** capability transfers:
  1. `(@convex.cns/control 'my.name new-controller)` — transfers the record;
  2. `(trust/change-control [#9 ["my" "name"]] new-owner)` — transfers ownership of the child node.
- Conversely, receiving control of a record does NOT grant authority to manage names beneath it. The node owner retains that, including deletion rights over records in the node.
- Subtree nodes are independently owned. A node MAY be referenced as the child of more than one record (shared subtrees), so deleting a record or node MUST NOT recursively delete nodes beneath it: those belong to their respective owners, who are responsible for deleting them.

Trust monitor actions used by the standard registry:

| Action | Checked against | Meaning |
|--------|----------------|---------|
| `:update` | record controller | update an existing record |
| `:create` | node owner | create a new entry (record or child node) in a node, with the segment name as object |
| `:delete` | node owner | delete an entry in a node, with the segment name as object |
| `:control` | node owner | transfer node ownership |

### CNS Root

The CNS root is the CNS node indicated by the empty path `[]`.

As such, it acts as the parent for all root namespaces (e.g. `convex`).

The CNS root SHOULD NOT be modifiable by any accounts other than those controlled by the governance body. Initially both root node ownership and root record creation are restricted to the network governance account `#6`.

### Root namespaces

The following root namespaces exist in the genesis state:

- `convex` - reserved for approved Convex libraries and tools. Typically these SHOULD be fully specified with a CAD (e.g. the `convex.asset` API as specified in CAD19). Governance approval required.
- `asset` - reserved for digital asset implementations. Names will be allocated subject to community / governance approval and/or audit.
- `torus` - reserved for validated open source marketplaces and trading contracts such as the Torus DEX. Community approval required.
- `currency` - reserved for fungible currency tokens (initially the genesis test currencies, managed under network governance).
- `init` - a root record referring to the network initialisation account `#1`.

The following root namespaces are planned but not yet provisioned:

- `user` - intended for developer user accounts. Open access, names / subdomains are assets obtainable for a fixed Convex Coin cost.
- `id` - reserved for decentralised IDs. Open access, names are assets obtainable for a small Convex Coin cost.
- `app` - reserved for decentralised application actors and contracts. Community approval required.
- `lab` - open access, for on-chain testing of actors and smart contracts.
- `peer` - reserved for established peer operators. Community or governance approval required, which will normally be granted to peer operators with a proven record of correctly maintaining at least 10,000 Convex Gold stake.

New root namespaces require Foundation governance approval.

### The `convex.cns` alias

The genesis state defines the record `convex.cns` with value `#9` (the standard registry) and child node `[#9 []]` — the CNS root itself. This makes `convex.cns` a named alias for the registry and the root namespace: `@convex.cns` resolves to the registry account, and `convex.cns.X` resolves identically to `X` for any name `X`. This provides a stable, named entry point for tooling that prefers not to hardcode `#9`.

### Node SPI

Any actor MAY act as a CNS node by implementing the following callable functions, invoked via scoped call on the node reference (the scope carries the node key). Alternative implementations MUST honour these signatures to interoperate with the standard user API:

- `(cns-read name)` — returns the record for the given segment name in this node, or `nil` if absent. SHOULD be freely readable.
- `(cns-write name record)` — creates or replaces the record for the segment name. MUST enforce the authority model: `:update` trust from the record controller for existing records; `:create` trust from the node owner for new records.
- `(cns-create-node name owner)` — creates (or returns, if already linked) a child node for the given segment name, owned by `owner`, returning its scoped reference. MUST enforce `:create` trust from the node owner.
- `(cns-delete-node name)` — deletes the entry (and node, where hosted by the same actor) for the given segment name. MUST enforce `:delete` trust from the node owner. MUST NOT recursively delete independently-owned descendant nodes.
- `(change-control controller)` — transfers node ownership. MUST enforce `:control` trust from the current node owner.

CNS records also function as trust monitors: the standard registry implements `check-trusted?` on scoped references, delegating trust decisions to the record controller (or the root controller for the root node). This allows a CNS path itself to be used wherever a trust monitor is expected.

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

It is important to note that `import` typically resolves at deployment time (i.e. when the `deploy` command is executed). This is intended behaviour, as it ensures the current on-chain CNS value is used. However it does imply that the same source code deployed at different times MAY resolve to different implementations, if the CNS value is updated in the interim.

Developers SHOULD consider the following for production usage:
  - Pinning to a specific address e.g. `(import #5678 :as foolib)`
  - Asserting a particular version e.g. `(assert (= 0xa412bce98da16e4b6790069a108d2d902a9929df76af3bcabaf7cf22df470108 (hash (encoding (account foolib)))))`
  - Checking resolution is as expected post deployment e.g. `foolib` as defined in the account refers to the intended library.

### Controller Trust

CNS records are as secure as their controllers.

For mission-critical actor code handling significant value, users SHOULD verify:
- Controller addresses match expectations and are trusted
- Controllers of parent nodes are similarly trusted
- **Owners of parent nodes** are similarly trusted: the node owner can delete or replace records within the node, so trusting a name means trusting the owner of every node on its path
- Accounts referenced via CNS resolution are similarly secure

### Delegated authority

Because record control and node ownership are separate capabilities (see Authority model), acquiring a name via `control` does NOT remove the previous owner's authority over the surrounding namespace. Parties acquiring names SHOULD verify node ownership (and obtain it, where full control of a subtree is required) as part of any transfer.

### Root Control

CNS root namespace and some key libraries are controlled by secure governance accounts, at least for the Protonet stage (typically `#6`). It is likely some of these will be made completely immutable once fully battle-tested.

## Implementation status and open issues

The standard registry (`convex-core/src/main/cvx/convex/core/registry.cvx`, account `#9`) implements this specification with the following known deviations, scheduled to be addressed via a network upgrade (the registry account is genesis state, so in-place source fixes are not possible for live networks):

1. **Record creation authority**: the registry currently checks the *parent record's controller* (rather than the node owner) when creating a new record in a node. Besides deviating from the authority model above, this means a node with no corresponding parent record (possible via direct `cns-create-node`, or after record deletion) has no authority able to create records in it.
2. **Orphaned nodes cannot be deleted**: deleting a node entry requires `:delete` trust from the *parent* node's owner. Once a parent node is deleted, its ownership entry is gone and any surviving descendant nodes become permanently undeletable — even by their own owners. A node owner SHOULD be able to delete their own node.
3. **No user-level `delete`**: records can currently only be removed via a direct SPI call.
4. Minor: segment names are not validated against the round-trip recommendation above; `cns-delete-node` takes an unused `owner` parameter.

See `CNS.md` in the `convex-core` repository documentation for the detailed design analysis and the proposed upgrade.
