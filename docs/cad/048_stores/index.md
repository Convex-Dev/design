# CAD048: Lattice Stores

## Overview

A **lattice store** holds cells — the immutable, content-addressed Merkle-tree nodes defined in [CAD002](../002_values/index.md) — keyed by their [Value ID](../003_encoding/index.md). Every Convex component that persists or exchanges data does so through a store: peers persist consensus state, clients cache query results, lattice nodes ([CAD036](../036_lattice_node/index.md)) replicate shared values.

This CAD specifies the store abstraction: the model of keys, values, roots and persistence status that all store implementations share, and the rules that make values safe to move between stores. It deliberately says nothing about physical storage: the standard durable implementation is Etch, whose on-disk format is specified in [CAD047](../047_etch/index.md), and whose garbage collection is specified in [CAD049](../049_etch_gc/index.md). In-memory stores implementing the same abstraction are equally valid (and are used for testing and for client-side caching).

## Design objectives

- **Content addressing.** A cell's key is the cryptographic hash of its encoding, so a store never needs cache invalidation, versioning or update-in-place: a key's value is immutable by construction.
- **Structural sharing.** Storing a large structure that shares subtrees with already-stored data must cost only the novel cells.
- **Verifiable persistence.** A caller must be able to establish — and later rely on — the guarantee that an entire tree, not just a single cell, is durably stored.
- **Efficient novelty detection.** Writes must be able to report which cells are newly persisted, so that network layers can broadcast exactly the data other parties have not yet seen.
- **Substitutability.** Stores must be interchangeable behind one abstraction, and values must be movable between stores without weakening any persistence guarantee.

## Specification

### Store model

A store is a mapping from Value ID to a cell encoding together with a **status**. Implementations:

- MUST treat entries as immutable: once a key holds a value, the value never changes. (This is automatic if keys are Value IDs and encodings are canonical per [CAD003](../003_encoding/index.md).)
- MUST allow an entry's status to be upgraded monotonically, and MUST NOT downgrade it.
- SHOULD store each cell's encoding at most once, relying on structural sharing for composite values.

### Root

A store MUST maintain a single **root**: a designated value (identified by its hash) representing the store's durable entry point — for a peer, typically its latest Belief and derived state. Updating the root MUST first ensure the new root's entire tree is persisted in the store.

The root is the basis of the retention contract: a store MUST retain the root and everything reachable from it; any other entry MAY be reclaimed (for the Etch reclamation procedure, see [CAD049](../049_etch_gc/index.md)). Applications requiring multiple durable entry points reference them from the root value; there is deliberately no store-level multi-root feature.

### Persistence status

Each entry carries a status on a monotonic ladder. The levels, in increasing order:

| Level | Guarantee |
|-------|-----------|
| **unknown** | No claim: the value may or may not be present |
| **stored** | This cell's encoding is present in the store |
| **persisted** | This cell **and its entire reachable tree** are present in the store |
| **announced** | Additionally, the value has been shared with the network (a peer-level commitment) |

Two rules make status trustworthy:

1. **Status is store-relative.** A status is a claim about one specific store. A reference that carries status earned in one store MUST NOT have that status accepted as evidence by another store.
2. **A store records only what it can prove.** The status recorded by a write is exactly the level the write itself achieved — a write that stored a single cell records *stored*, a write that descended and verified all children records *persisted* — never a level imported from the incoming reference. A store MAY merge monotonically with the entry's own existing flags, since those were earned in this store.

The *persisted* level is load-bearing: "persisted implies the whole tree is here" is the invariant that lets garbage collection, transfer and verification prune their traversals instead of visiting every cell (see CAD049).

### Reads

A read has exactly three outcomes, and implementations MUST distinguish them:

1. **The value** — present in the store (or its cache).
2. **Proven absence** — the store looked and the entry is not there.
3. **Failure** — the store cannot look (it is closed, or the underlying medium failed).

A failure MUST be reported as an error distinct from absence, and MUST NOT be treated as evidence that data is missing: it indicates broken infrastructure assumptions, not a missing value.

Reads MUST be free of side effects on the store's contents.

### Writes and novelty

A write requesting *persisted* status MUST ensure all reachable children are persisted before recording the parent's status (post-order descent). Writes SHOULD accept a novelty callback, invoked for each cell that reaches the requested status for the first time — this is what allows a peer to broadcast precisely the novel portion of a Belief, rather than whole trees the network already holds.

### Caching

Stores MAY cache decoded cells in memory. Because entries are immutable, a cache never requires invalidation; implementations SHOULD make cache entries evictable under memory pressure rather than strongly retaining them. A cache MUST NOT serve a reference bound to a different store (see below).

### References and store identity

In-memory references to stored values are bound to the store that holds them; all references within one cell tree MUST be bound to the same store. Moving a value to another store is a **re-persist, not a pointer swap**: the value MUST be persisted into the destination (descending its tree through the normal write path), yielding a reference bound — and honestly flagged — for the destination. Merely rebinding a reference's store pointer would carry over status claims the destination cannot back, creating latent missing-data failures; implementations SHOULD NOT expose rebinding as application API.

Transfer of a tree between stores SHOULD preserve each entry's status up to the level the destination write can prove, and MUST NOT record any level beyond it.

## Reference implementation notes

In the Convex JVM implementation (`convex.core.store`):

- `AStore` is the abstraction: `storeRef`/`storeTopRef` (write with status and novelty handler), `refForHash` (read), `setRootData`/`getRootHash` (root). `EtchStore` is the durable implementation over the CAD047 format; `MemoryStore` is the in-memory equivalent.
- Status levels are the `Ref` constants `UNKNOWN`, `STORED`, `PERSISTED`, `ANNOUNCED`; the write-boundary capping rule is enforced in `EtchStore.storeRef`, with regression coverage in `convex.etch.EtchStatusIntegrityTest`.
- The three read outcomes map to a value, `null`, and unchecked `StoreException` (with `MissingDataException` signalling proven absence at higher levels).
- Caching is the two-level `RefCache`/soft-reference design in `ACachedStore`; store binding of references is `RefSoft`, with tree consistency checkable via `Refs.checkConsistentStores`.
- Tree transfer between stores is `StoreTransfer.transfer`; `Cells.persist(value, store)` is the application-level "ensure this tree is persisted there" operation.

## See also

- [CAD047: Etch](../047_etch/index.md) — the standard durable store format
- [CAD049: Etch Garbage Collection](../049_etch_gc/index.md) — reclamation and migration for stores
- [CAD024: Data Lattice](../024_data_lattice/index.md) — replication built on stores
