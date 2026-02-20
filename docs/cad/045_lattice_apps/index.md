# CAD045: Lattice Applications

## Overview

Lattice Applications are decentralised, self-sovereign data applications built on the [Data Lattice](../024_data_lattice/index.md). They use [Lattice Cursors](../035_cursors/index.md) as their primary interface for reading, writing, navigating and synchronising state, and compose [Lattice Types](../024_data_lattice/index.md) to define merge semantics for their domain data.

Unlike traditional client-server applications where a central authority mediates access, lattice applications operate in a peer-to-peer environment where each participant owns and controls their own data. Conflict resolution is automatic — the algebraic properties of the lattice (commutativity, associativity, idempotence) guarantee that peers always converge to the same state without coordination.

This CAD defines the architecture, composition rules and best practices for building lattice applications, using a social networking application (`convex-social`) as a running example.

## Motivation

The Data Lattice provides a powerful substrate for decentralised applications, but the raw lattice primitives (merge functions, lattice types, cursors) leave significant design decisions to application developers. Without clear guidance, common mistakes include:

- **Incorrect merge semantics** — choosing merge strategies that violate CRDT properties or lose data
- **Type mismatches** — writing through uninitialised paths that create wrong container types
- **Missing signing boundaries** — forgetting that self-sovereign data requires cryptographic ownership enforcement
- **Monolithic state** — failing to decompose state into independently mergeable components

This CAD establishes patterns that ensure lattice applications are correct, composable and secure by construction.

## Specification

### Application Architecture

A lattice application MUST be structured in four layers:

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Application API** | Domain-specific operations | `Social.post()`, `Feed.delete()` |
| **Cursor Chain** | Navigation, atomic writes, signing | `path()`, `updateAndGet()`, `fork()`/`sync()` |
| **Lattice Hierarchy** | Merge semantics, type information | `SocialLattice`, `IndexLattice`, `LWWLattice` |
| **Node Infrastructure** | Networking, persistence, replication | `NodeServer`, `LatticePropagator` |

The application layer MUST NOT call lattice merge functions directly. All reads and writes MUST go through cursors, which handle atomic updates, lattice-aware writes and transparent signing.

The lattice hierarchy MUST NOT have knowledge of cursors. Lattice types define merge semantics only — they are pure functions over immutable values.

### Lattice Design

#### Composition from Primitives

Applications SHOULD compose their lattice hierarchy from the standard lattice types defined in [CAD024](../024_data_lattice/index.md):

| Primitive | Merge Semantics | Zero | Use Case |
|-----------|----------------|------|----------|
| **LWW Lattice** | Higher timestamp wins | `nil` | Mutable registers (profiles, individual records) |
| **Index Lattice** | Union of keys, child merge per entry | Empty Index | Ordered collections (feeds, logs, time-series) |
| **Map Lattice** | Union of keys, child merge per entry | Empty Map | Unordered collections (follow lists, metadata) |
| **Set Lattice** | Set union | Empty Set | Grow-only memberships (tags, permissions) |
| **Owner Lattice** | Per-key merge with signature verification | Empty Map | Self-sovereign per-owner namespaces |
| **Signed Lattice** | Signature verification, delegate to child | `nil` | Cryptographic ownership enforcement |
| **Keyed Lattice** | Per-key dispatch to distinct child lattices | Empty Index | Root-level sections with heterogeneous children |

Composition reads bottom-up from the data model. For example, a social feed is an ordered collection of posts where each post uses last-write-wins for edits:

```
Feed = IndexLattice(LWWLattice)
       ↑ union of posts    ↑ per-post conflict resolution
```

#### Custom Lattice Types

When a data structure has multiple named children with different merge strategies, applications SHOULD define a custom lattice type. A custom lattice type MUST implement:

- **`merge(own, other)`** — the core merge function, satisfying commutativity, associativity and idempotence as specified in [CAD024](../024_data_lattice/index.md)
- **`zero()`** — the identity element, used by cursors for auto-initialisation of empty paths
- **`path(key)`** — returns the child lattice type for a given key, enabling lattice-aware cursor navigation

The `path()` method is essential for the cursor system. It tells cursors what merge semantics exist at each level of the data hierarchy, and enables `assocIn` to create correctly-typed containers when writing through uninitialised paths (see [CAD035 § Lattice Integration](../035_cursors/index.md#lattice-integration)).

Example: a social user record with feed, profile and follows — each with distinct merge semantics:

```
SocialLattice
  path(:feed)    → IndexLattice(LWWLattice)     ordered posts, LWW per entry
  path(:profile) → LWWLattice                    single register
  path(:follows) → MapLattice(LWWLattice)        unordered map, LWW per entry
  zero()         → Empty Index
```

#### CRDT Properties

Every custom merge function MUST satisfy the three CRDT properties:

- **Commutativity**: `merge(a, b) = merge(b, a)`
- **Associativity**: `merge(merge(a, b), c) = merge(a, merge(b, c))`
- **Idempotence**: `merge(a, a) = a`

Violation of these properties causes divergence between peers — nodes that have received the same data in different orders will hold different state, with no mechanism for convergence.

Applications SHOULD use deterministic tiebreakers (e.g. hash comparison) when timestamps are equal, to preserve commutativity. A merge function that picks "first argument on tie" is not commutative.

Applications MUST handle null values in merge: `merge(nil, x) = x` and `merge(x, nil) = x`. This is required for the lattice identity law and for correct initialisation of new entries.

#### Zero Values and Container Types

The `zero()` method MUST return the correct container type for the lattice level. Cursors use `zero()` to auto-initialise empty paths during writes. If `zero()` returns the wrong type (e.g. a hash map where an index is expected), subsequent merge operations will fail with type mismatches.

For container lattices (Index Lattice, Map Lattice, Keyed Lattice), `zero()` MUST return the appropriate empty container. For leaf lattices (LWW Lattice), `zero()` SHOULD return `nil`.

#### Lattice Continuity

The lattice hierarchy MUST be a continuous tree. Once `path(key)` returns `nil` at some level, no child lattice exists at or below that key. There is no mechanism for lattice semantics to resume after a gap, because there is no lattice object to call `path()` on. See [CAD035 § Lattice Integration](../035_cursors/index.md#lattice-integration) for how cursors handle navigation beyond the lattice boundary.

If an application requires lattice merge semantics at a deeper level, the lattice hierarchy MUST be extended to be continuous through the intervening path.

### Self-Sovereign Data

#### Owner Lattice

Applications that manage per-user data SHOULD wrap their application lattice with an Owner Lattice. This partitions the state by owner public key, with each owner's data wrapped in signed data ([CAD038](../038_lattice_auth/index.md)).

The resulting structure is:

```
Application Section (e.g. :social)
  └── OwnerLattice
        └── <ownerKey> → SignedData<V>
              └── Application Lattice (e.g. SocialLattice)
```

This structure enforces that only the holder of the owner's private key can create or update values within their partition. During network merge, the Owner Lattice verifies that the signer key matches the owner key and rejects forgeries.

#### Signing Boundary

Applications MUST NOT attempt to handle signing directly. The cursor system inserts a Signed Cursor automatically when `path()` crosses a Signed Lattice boundary. All writes through the cursor chain are signed transparently using the key pair from the Lattice Context.

Applications MUST set a Lattice Context with a valid signing key pair before performing writes that cross a signing boundary. Failure to do so will result in an error at the Signed Cursor.

#### Local Trust vs Network Verification

Applications SHOULD understand the two-level trust model:

- **Local writes** are always trusted. A cursor allows any write to any path — the signing boundary signs whatever it is given. This is correct because local state is under the operator's own control.
- **Network merges** are verified. When data is received from another peer, the Owner Lattice checks that the signer is authorised for the owner key. Forgeries are silently rejected.

This means an application can write data under any owner's key locally, but that data will be rejected by every other peer if the signing key doesn't match. Applications SHOULD NOT rely on local-only state for security guarantees — security is enforced at the merge boundary.

### Cursor Patterns

#### The Wrapper Pattern

Each level of the data model SHOULD have a corresponding wrapper class that holds a cursor and exposes domain-specific operations:

```
Social       → cursor at OwnerLattice level
  SocialUser → cursor at SocialLattice level (through signing boundary)
    Feed     → cursor at IndexLattice level
    Follows  → cursor at MapLattice level
```

Each wrapper navigates one level deeper via `cursor.path(key)`. Signing, type management and merge semantics are handled transparently by the cursor chain.

Wrapper classes SHOULD:
- Hold a single cursor field (the entry point for their level)
- Expose domain verbs (`post()`, `follow()`, `delete()`) rather than cursor primitives
- Return domain types (post records, follow sets) rather than raw CVM values
- Provide a `cursor()` accessor for escape-hatch access to the underlying cursor

#### Writing Data

Applications SHOULD use `updateAndGet` (or `getAndUpdate`) for read-modify-write operations. When a lattice is present, the update lambda receives the lattice's zero value instead of null for uninitialised paths, eliminating the need for null guards:

```
cursor.updateAndGet(feed -> feed.assoc(key, post))
// feed is auto-initialised to Index.EMPTY if it was null
```

For simple key-value writes, applications MAY use `assoc(key, value)` or `assocIn(value, keys...)` on the cursor.

Applications MUST NOT use raw `RT.assocIn` or equivalent non-lattice-aware write utilities to update lattice state. These may create containers of the wrong type (e.g. hash maps where indexes are expected), causing merge failures. All writes through cursors are lattice-aware by construction.

#### Reading Data

`get()` returns `nil` for uninitialised paths — the zero-substitution only applies within update lambdas. Read-side code SHOULD handle null appropriately.

#### Fork and Sync

Applications that perform batch operations SHOULD use the fork/sync pattern:

1. **Fork** — `cursor.fork()` creates an isolated working copy
2. **Modify** — perform multiple writes on the fork
3. **Sync** — `cursor.sync()` merges changes back to the parent atomically

Sync always succeeds when a lattice is present (see [CAD035](../035_cursors/index.md)). For the signing use case, forking from below a Signed Cursor gives unsigned local storage — signing is deferred to the single `sync()` call, reducing cryptographic overhead for batch operations.

Application wrappers SHOULD expose `fork()` and `sync()` on top-level wrapper classes where batch operations are a use case.

#### Connecting to Node Infrastructure

Applications SHOULD provide two factory methods:

- **Standalone** — creates its own root cursor, useful for testing and isolated operation
- **Connected** — navigates from a node's root cursor via `path()`, useful for participation in the lattice network

The connected pattern is how applications participate in peer-to-peer replication. Writes propagate up through the cursor chain to the node's root, where the propagator broadcasts deltas to peers (see [CAD036](../036_lattice_node/index.md)).

### Data Model

#### Record Design

Applications using LWW Lattice for conflict resolution MUST include a `:timestamp` field in every record. The default LWW merge function extracts the timestamp from this field to determine the winner.

Applications SHOULD use Keyword keys for record fields. Keywords are interned, compact, and provide fast comparison.

#### Ordered Collections

Applications that need chronological ordering (feeds, logs, event streams) SHOULD use Index with blob keys encoding the timestamp in big-endian format. Big-endian encoding ensures lexicographic blob ordering matches chronological ordering.

#### Tombstone Deletion

Lattice merge is union-based — merged collections contain the union of all entries from both sides. This means removing an entry from one replica does not remove it from others; the next merge would restore it.

Applications MUST use tombstone deletion rather than entry removal. A tombstone is a marker (e.g. a `:deleted` field) added to the existing entry. The entry remains in the collection but is filtered out in read paths.

When tombstoning, applications MUST update the `:timestamp` field so that the tombstoned version wins over older non-deleted versions via LWW merge.

#### Container Choice

| Need | Container | Reason |
|------|-----------|--------|
| Lattice-level containers (where `path()` and `zero()` matter) | `Index` | Sorted, JSON-compatible key resolution, correct `zero()` type |
| Leaf records (post data, profile fields) | Hash Map | Efficient for small unordered maps |
| Dynamic key sets (follow lists) | Hash Map | Hash-based, unordered |
| Ordered sequences (feeds, logs) | `Index` with blob keys | Lexicographic ordering |
| Single mutable values | Direct value with LWW Lattice | Simple register semantics |

Applications SHOULD prefer `Index` for lattice-level containers and `AHashMap` for leaf data records. `Index` resolves `Keyword` and `AString` identically (same blob comparison), which matters for JSON interoperability.

### Registration

Applications SHOULD register their lattice under a Keyword in the root Keyed Lattice, enabling nodes to opt in to hosting the application's data:

```
root = Lattice.ROOT.addLattice(:social, socialLattice)
```

The keyword becomes the first path element when navigating from the node's root cursor. Different nodes may host different combinations of applications by composing different sets of lattice sections.

### Testing

#### Unit Tests

Applications SHOULD test domain operations in standalone mode (own cursor, no node infrastructure). This verifies application logic in isolation.

#### Integration Tests

Applications SHOULD test that writes propagate to the root cursor when connected to a node. This verifies the cursor chain is correctly wired.

#### Fork/Sync Tests

Applications SHOULD test that forked changes are invisible until sync, and that sync correctly merges changes back.

#### Multi-User Tests

Applications with per-user data SHOULD test that different users' state is independent and does not interfere.

#### Adversarial Tests

Applications using Owner Lattice MUST include adversarial tests that verify forgery rejection. These tests SHOULD:

1. Construct forged state at the raw data level (data signed by key A placed under key B's owner slot)
2. Merge the forged state with legitimate state using `OwnerLattice.merge(context, own, other)`
3. Assert that the forgery is rejected and the legitimate data survives

This tests the [authentication boundary](../038_lattice_auth/index.md) that protects self-sovereign data in production.

## Reference Implementation

The reference implementation is provided in the Convex `convex-core` and `convex-social` Java modules.

### Core Classes

| Concept | Class | Package |
|---------|-------|---------|
| Abstract cursor | `ACursor<V>` | `convex.lattice.cursor` |
| Lattice-aware cursor | `ALatticeCursor<V>` | `convex.lattice.cursor` |
| Lattice-aware write utility | `LatticeOps` | `convex.lattice` |
| Abstract lattice type | `ALattice<V>` | `convex.lattice` |
| Merge context | `LatticeContext` | `convex.lattice` |
| Standard lattice types | `IndexLattice`, `MapLattice`, `LWWLattice`, `SetLattice`, `OwnerLattice`, `SignedLattice`, `KeyedLattice` | `convex.lattice.generic` |
| Root lattice definition | `Lattice` | `convex.lattice` |

### Application Classes (convex-social)

| Concept | Class | Package |
|---------|-------|---------|
| Top-level application wrapper | `Social` | `convex.social` |
| Per-user wrapper | `SocialUser` | `convex.social` |
| Feed operations wrapper | `Feed` | `convex.social` |
| Follow list wrapper | `Follows` | `convex.social` |
| Custom lattice type | `SocialLattice` | `convex.social` |
| Record construction helpers | `SocialPost` | `convex.social` |
| Timeline and query helpers | `SocialHelpers` | `convex.social` |

### Lattice Hierarchy (convex-social)

```
:social → OwnerLattice
            └── <ownerKey> → SignedLattice
                  └── SocialLattice (Index<Keyword, ACell>)
                        ├── :feed    → IndexLattice(LWWLattice)
                        ├── :profile → LWWLattice
                        └── :follows → MapLattice(LWWLattice)
```

### Cursor Chain (navigating to a user's feed)

```
RootLatticeCursor                    [KeyedLattice]
  → DescendedCursor([:social])       [OwnerLattice]
    → DescendedCursor([ownerKey])    [SignedLattice]
      → SignedCursor                 ← signing enforcement point
        → DescendedCursor([:feed])   [IndexLattice(LWWLattice)]
```

Design documents for cursor internals (path collapsing, auto-initialisation, fork/sync mechanics) are in `convex-core/docs/LATTICE_CURSOR_DESIGN.md` and `convex-core/docs/LATTICE_APPLICATIONS.md`.

## See Also

- [CAD024: Data Lattice](../024_data_lattice/index.md) — Lattice merge foundations and standard lattice types
- [CAD035: Lattice Cursors](../035_cursors/index.md) — Cursor specification and lattice integration
- [CAD036: Lattice Node](../036_lattice_node/index.md) — Networked lattice replication
- [CAD038: Lattice Authentication](../038_lattice_auth/index.md) — Owner verification and signing boundaries
- [CAD037: KV Database](../037_kv_database/index.md) — Example lattice application (key-value store)
- [CAD028: DLFS](../028_dlfs/index.md) — Example lattice application (distributed filesystem)
