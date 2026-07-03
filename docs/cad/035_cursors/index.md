# CAD035: Lattice Cursors

## Overview

Lattice Cursors provide mutable access points into immutable CVM data structures. They bridge the gap between Convex's immutable value semantics and the practical need for stateful updates in applications working with the Data Lattice.

A cursor can be thought of as a mutable pointer that references an immutable value. When the value is "updated", the cursor atomically switches to reference a new immutable value while the old value remains unchanged. This pattern preserves all benefits of immutable data (structural sharing, safe concurrency, Merkle verification) while providing a familiar mutable interface.

## Motivation

The Data Lattice (CAD024) provides decentralised storage using immutable, content-addressable data structures. While immutability offers strong guarantees for verification and replication, applications need practical mechanisms to:

1. **Track mutable state** - Applications need to maintain and update their current view of lattice data
2. **Navigate nested structures** - Complex data often requires access to deeply nested values
3. **Perform atomic updates** - Concurrent access requires safe compare-and-swap semantics
4. **Transform and cache values** - Expensive computations benefit from caching and lazy evaluation
5. **Synchronise changes** - Distributed systems need mechanisms to merge divergent states

Cursors solve these problems by providing a thin mutable layer over immutable data.

## Specification

### Cursor Concept

A **cursor** is a mutable container that holds a reference to an immutable CVM value (see CAD002). Cursors provide atomic operations for reading and updating this reference.

All CVM values are encoded according to the format specified in CAD003. Cursors operate on these values but do not affect their encoding or identity.

### Cursor Types

#### Root Cursor

A Root cursor is the fundamental cursor type providing atomic access to a CVM value.

Root cursors MUST support the following operations:

| Operation | Signature | Description |
|-----------|-----------|-------------|
| `get` | `() → V` | Returns current value |
| `set` | `(V) → void` | Sets value atomically |
| `getAndSet` | `(V) → V` | Sets value, returns previous |
| `compareAndSet` | `(expected, new) → bool` | Sets if current equals expected |
| `getAndUpdate` | `(fn: V→V) → V` | Applies function, returns old value |
| `updateAndGet` | `(fn: V→V) → V` | Applies function, returns new value |
| `getAndAccumulate` | `(x, fn: (V,V)→V) → V` | Combines with x, returns old |
| `accumulateAndGet` | `(x, fn: (V,V)→V) → V` | Combines with x, returns new |

All operations MUST be atomic with respect to concurrent access.

Root cursors MUST track their initial value (the value at cursor creation time) to support synchronisation patterns.

#### Path Cursor

A Path cursor provides atomic access to a nested value within a parent cursor.

Path cursors MUST:
- Maintain a reference to a parent cursor
- Store an array of path keys for navigation
- Delegate all operations atomically to the parent cursor
- Use standard CVM collection access semantics for navigation

Path navigation uses these semantics:
- Maps and Indexes: key lookup returns associated value
- Vectors and Lists: integer index returns element at position
- Other types: return nil for any path

Path updates use associative (`assoc` / `assocIn`) semantics:
- For maps: `assoc-in` style nested update
- For vectors: index-based update
- A missing intermediate is **not** silently promoted to a map: without a lattice, writing through a nil intermediate is an error; with a lattice (see [Lattice-Aware Cursors](#lattice-aware-cursors)) intermediates are created from the lattice's `zero()` value, so they take the correct type (e.g. an `Index`, not a hash map)

#### Forkable Cursor

A forkable cursor tracks its initial value, enabling optimistic concurrency and transactional update patterns. Forkable cursors MUST provide:

- `getInitialValue() → V`: the value at fork time
- `fork() → Cursor`: create an independent working copy
- `merge(detached) → bool`: attempt to merge a detached working copy back by compare-and-set

There are two ways to converge a working copy back to its parent:

- **`merge(detached) → bool` (compare-and-set)** — succeeds only if the parent still holds the value it had at fork time; returns `false` if the parent moved concurrently, leaving the caller to retry. This is the plain optimistic-concurrency path.
- **`sync() → V` (lattice merge)** — available on lattice-aware cursors (see [Lattice-Aware Cursors](#lattice-aware-cursors)). Instead of compare-and-set, it merges the working copy into the parent using lattice semantics, so it **always succeeds** and never needs a retry: concurrent forks converge by merge rather than one overwriting the other.

The **fork-modify-sync** pattern:
1. `fork()` a working copy (records the initial value)
2. Make one or more updates to the working copy, in isolation
3. `sync()` the changes back — lattice merge folds them into the parent, combining with any concurrent changes

### View Types

Views are read-only cursors that observe or transform underlying values.

#### View Base

Views MUST:
- Provide a `get()` operation returning the current viewed value
- Throw an error (or equivalent) for all mutation operations
- Support path navigation (returning new path cursors over the view)

#### Transformer

A Transformer applies a function to values from a source cursor.

Transformers MUST:
- Store a reference to a source cursor
- Store a transformation function
- Apply the transformation lazily on each `get()` call
- NOT cache results (see Time Cache for caching)

Transformers MAY support function chaining for composing multiple transformations.

#### Time Cache

A Time Cache provides TTL-based caching over a source cursor.

Time caches MUST:
- Store a TTL (time-to-live) duration
- Track the timestamp of the last cache update
- Return cached values if within TTL
- Fetch fresh values from source when cache expires
- Provide `invalidate()` to force cache refresh

Time caches SHOULD handle timestamp overflow gracefully (treat as never-expiring).

### Atomic Operation Semantics

All atomic operations MUST behave as if executed instantaneously with respect to other atomic operations on the same cursor.

**Compare-and-Set:** Returns true and updates if and only if the current value equals the expected value (using CVM value equality as defined in CAD002).

**Update operations:** The update function receives the current value and returns the new value. The function MAY be called multiple times if concurrent updates occur (implementations using CAS loops).

### Path Navigation

The `path` operation creates a new cursor focused on a nested location.

```
path(key1, key2, ...) → Cursor
```

Path semantics:
- Empty path returns the same cursor (or equivalent)
- Single key navigates one level into the structure
- Multiple keys navigate to arbitrary depth

Path keys are CVM values (see CAD002). Common key types:
- Keywords (e.g., `:data`, `:fs`)
- Integers (for indexed collections)
- Strings (for string-keyed maps)
- Any valid CVM value (maps support arbitrary keys)

### Value Conversion

Implementations SHOULD support automatic conversion from host language types to CVM values where unambiguous:
- Strings → CVM String
- Integers → CVM Long
- Floating point → CVM Double
- Booleans → CVM Boolean
- Null/nil → CVM nil

For complex types (maps, vectors, etc.), implementations SHOULD preserve CVM values and convert host equivalents using the encoding rules in CAD003.

### Thread Safety

**Root cursors:** MUST be thread-safe. Concurrent operations MUST be atomic.

**Path cursors:** Inherit thread-safety from their parent cursor's atomic operations.

**Views:** NOT required to be thread-safe. Implementations MAY require external synchronisation for concurrent access to cached values.

### Cursor Hierarchy

```
ACursor<V>
├── AForkableCursor<V>                 (fork; tracks initial value; merge/CAS)
│   ├── Root<V>                        (atomic CAS value holder)
│   ├── PathCursor<V>                  (non-lattice path navigation)
│   └── ALatticeCursor<V>             (lattice-aware: fork/sync, path/resolve)
│       ├── RootLatticeCursor<V>       (root of a lattice tree)
│       ├── ForkedLatticeCursor<V>     (independent working copy)
│       ├── DescendedCursor<V>         (navigated into a sub-path)
│       └── AUpdateCursor<V,S>         (update-on-write funnel)
│           ├── StampedCursor<V>       (V → V: stamp on write, LWW)
│           └── SignedCursor<V>        (V → SignedData<V>: sign on write)
└── AView<T>                           (read-only base)
    ├── ACachedView<V>                 (caching base)
    │   └── TimeCache<V>               (TTL caching)
    └── Transformer<S,T>               (lazy transformation)
```

### Lattice-Aware Cursors

Cursors that carry an `ALattice` — the `ALatticeCursor` family — understand lattice merge semantics. They add three capabilities over a plain cursor.

**Fork and sync.** `fork()` produces an independent working copy; `sync()` merges it back into the parent via the lattice merge function, and therefore always succeeds (see [Forkable Cursor](#forkable-cursor)). `merge(value)` folds an external value into the cursor the same way.

**Canonical vs logical keys — `path` vs `resolve`.** `path(keys...)` navigates using already-canonical keys and is the hot primitive; at each level it descends into the sub-lattice given by `ALattice.path(key)`. `resolve(keys...)` is the user-facing counterpart: it canonicalises external or logical keys (via the lattice's `resolveKey`) before navigating. Navigation copies on change only, reusing shared structure where keys are already canonical.

**Auto-initialising writes.** `assoc(key, value)` and `assocIn(value, keys...)` are the write primitives. On a lattice cursor a missing intermediate is created from the value lattice's `zero()` — the correctly typed empty value — rather than a default hash map, and an update function that would otherwise receive a missing value receives `lattice.zero()` in place of nil. Writing through a missing intermediate with no lattice present is an error, not a silent promotion.

**Write interception (update cursors).** Some lattice layers must transform a value on the way out — stamping it with a write time, or wrapping it in a signature. Rather than special-casing these in the navigation code, a lattice declares its own write boundary through generic hooks (`isWriteBoundary`, `createPathCursor`, `consumesPathKey`); crossing that boundary inserts an **update cursor** (`AUpdateCursor`), a shared funnel whose update-on-write step runs on every write. There are two instances:

- **`StampedCursor`** (`V → V`) — stamps the value with the context write clock on write; used by stamp-on-write regions such as DLFS node times.
- **`SignedCursor`** (`V → SignedData<V>`) — signs the value on write using the key from the merge context, so a `SignedLattice` boundary yields correctly signed data. Deferred through a fork, the value is signed once at `sync()` rather than on every intermediate edit.

Because signing and stamping are enforced by the cursor at the boundary — not by `instanceof` checks in the navigation code — new boundary behaviours can be added as new lattice layers without touching the cursor machinery.

## Lattice Integration

Cursors integrate with the Data Lattice (CAD024) for distributed state management.

### Lattice Merge Operations

When cursors are used with lattice-aware systems (see CAD036), merge operations combine values according to lattice semantics.

Each lattice type defines its merge function satisfying:
- **Commutativity**: `merge(a, b) = merge(b, a)`
- **Associativity**: `merge(merge(a, b), c) = merge(a, merge(b, c))`
- **Idempotency**: `merge(a, a) = a`

### Lattice Context

Lattice-aware cursors carry a `LatticeContext` — the ambient information a merge or write needs:

- **Timestamp**: the single write clock. Stamp-on-write regions read it to stamp values (the same clock DLFS uses for node update times); a `StampedCursor` with no context timestamp is an error
- **Signing Key**: used by a `SignedCursor` to sign values at a signing boundary
- **Owner Verifier**: used to authorise owners during merge (see [CAD038](../038_lattice_auth/index.md))

A cursor is given a context with `withContext(ctx)`, and context-aware merge takes the form `merge(context, own, other) → merged`.

## Encoding

Cursor values use the standard encoding format specified in CAD003:
- All CVM values have a unique canonical encoding
- Value identity is determined by encoding equality
- Value ID is the SHA3-256 hash of the encoding

Cursors do not have their own encoding format; they are runtime constructs that hold references to encoded values.

---

## Reference Implementation

A reference implementation is provided in the Convex `convex-core` module (Java).

### Classes

| Specification Concept | Java Class | Package |
|-----------------------|------------|---------|
| Cursor (abstract) | `ACursor<V>` | `convex.lattice.cursor` |
| Forkable cursor (fork/merge/CAS) | `AForkableCursor<V>` | `convex.lattice.cursor` |
| Root cursor (atomic CAS holder) | `Root<V>` | `convex.lattice.cursor` |
| Path cursor (non-lattice navigation) | `PathCursor<V>` | `convex.lattice.cursor` |
| Lattice-aware cursor | `ALatticeCursor<V>` | `convex.lattice.cursor` |
| Root of a lattice tree | `RootLatticeCursor<V>` | `convex.lattice.cursor` |
| Forked working copy | `ForkedLatticeCursor<V>` | `convex.lattice.cursor` |
| Descended sub-path cursor | `DescendedCursor<V>` | `convex.lattice.cursor` |
| Update-on-write funnel | `AUpdateCursor<V,S>` | `convex.lattice.cursor` |
| Stamp-on-write cursor | `StampedCursor<V>` | `convex.lattice.cursor` |
| Sign-on-write cursor | `SignedCursor<V>` | `convex.lattice.cursor` |
| View | `AView<T>` | `convex.lattice.cursor` |
| Cached View | `ACachedView<V>` | `convex.lattice.cursor` |
| Time Cache | `TimeCache<V>` | `convex.lattice.cursor` |
| Transformer | `Transformer<S,T>` | `convex.lattice.cursor` |
| Merge context (timestamp, key, verifier) | `LatticeContext` | `convex.lattice` |
| Lattice base + write-boundary hooks | `ALattice` | `convex.lattice` |
| Factory | `Cursors` | `convex.lattice.cursor` |

### Example (Java)

```java
// Plain root cursor (atomic CAS value holder)
Root<AInteger> counter = Root.create(CVMLong.ZERO);
counter.set(CVMLong.ONE);
CVMLong old = counter.getAndUpdate(v -> v.inc());

// Lattice-aware cursor: fork / modify / sync — always succeeds, merges concurrently
RootLatticeCursor<ASet<ACell>> root = Cursors.createLattice(SetLattice.create(), Sets.empty());
ALatticeCursor<ASet<ACell>> fork = root.fork();
fork.updateAndGet(s -> s.include(item1));
fork.updateAndGet(s -> s.include(item2));
fork.sync();                        // both items merged into root by set union

// Navigate to a sub-lattice with path(); merge folds a value in via lattice semantics
ALatticeCursor<ASet<CVMLong>> foo = mapRoot.path(Keywords.FOO);
foo.merge(Sets.of(CVMLong.create(2)));

// Cross a signing boundary — deferred signing via SignedCursor
ALatticeCursor<AVector<ACell>> drive = root2.path(
    Keywords.FS,        // KeyedLattice → OwnerLattice
    ownerKey,           // OwnerLattice → SignedLattice
    Keywords.VALUE,     // SignedLattice → SignedCursor (signing enforced here)
    driveName);         // MapLattice → DLFSLattice
ALatticeCursor<AVector<ACell>> dfork = drive.fork();
dfork.updateAndGet(state -> addFile(state, "a.txt"));   // local, unsigned
dfork.sync();                                           // signs once, merges into parent

// Transformer (lazy, no caching) and a 5-second time cache
Transformer<CVMLong, CVMLong> doubled =
    Transformer.create(counter, v -> CVMLong.create(v.longValue() * 2));
TimeCache<ACell> cached = new TimeCache<>(expensiveCursor, 5000);
```

### Implementation Notes

The Java implementation uses `java.util.concurrent.atomic.AtomicReference` for thread-safe root cursors. Other languages should use equivalent atomic primitives.

## See Also

- [CAD002: CVM Values](../002_values/index.md) - Immutable value types
- [CAD003: Encoding](../003_encoding/index.md) - Binary encoding format
- [CAD024: Data Lattice](../024_data_lattice/index.md) - Distributed storage
- [CAD028: DLFS](../028_dlfs/index.md) - Distributed filesystem using lattice
- [CAD036: Lattice Node](../036_lattice_node/index.md) - Networked lattice replication
