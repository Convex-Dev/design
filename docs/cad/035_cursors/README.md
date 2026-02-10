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

Path updates use associative semantics:
- For maps: `assoc-in` style nested update
- For vectors: index-based update
- Creates intermediate structures as needed

#### Branched Cursor

Branched cursors track their initial value, enabling optimistic concurrency patterns.

Branched cursors MUST provide:
- `getInitialValue() → V`: Returns value at cursor creation time
- `sync(detached) → bool`: Attempts to merge a detached cursor back

The **detach-modify-sync** pattern:
1. Create a detached copy of a cursor (records initial value)
2. Modify the detached cursor independently
3. Attempt to sync back: succeeds if parent still has the initial value
4. If sync fails, the parent was modified concurrently

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
Cursor<V>
├── BranchedCursor<V>              (tracks initial value)
│   ├── RootCursor<V>              (atomic value container)
│   └── PathCursor<V>              (nested path access)
└── View<T>                        (read-only base)
    └── CachedView<V>              (caching base)
        ├── TimeCache<V>           (TTL caching)
        └── Transformer<S, T>      (lazy transformation)
```

## Lattice Integration

Cursors integrate with the Data Lattice (CAD024) for distributed state management.

### Lattice Merge Operations

When cursors are used with lattice-aware systems (see CAD036), merge operations combine values according to lattice semantics.

Each lattice type defines its merge function satisfying:
- **Commutativity**: `merge(a, b) = merge(b, a)`
- **Associativity**: `merge(merge(a, b), c) = merge(a, merge(b, c))`
- **Idempotency**: `merge(a, a) = a`

### Lattice Context

Merge operations MAY require context including:
- **Timestamp**: For conflict resolution in time-based lattices
- **Signing Key**: For creating cryptographic signatures on merged values

Context-aware merge: `merge(context, own, other) → merged`

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
| Branched Cursor | `ABranchedCursor<V>` | `convex.lattice.cursor` |
| Root Cursor | `Root<V>` | `convex.lattice.cursor` |
| Path Cursor | `PathCursor<V>` | `convex.lattice.cursor` |
| View | `AView<T>` | `convex.lattice.cursor` |
| Cached View | `ACachedView<V>` | `convex.lattice.cursor` |
| Time Cache | `TimeCache<V>` | `convex.lattice.cursor` |
| Transformer | `Transformer<S,T>` | `convex.lattice.cursor` |
| Factory | `Cursors` | `convex.lattice.cursor` |

### Example (Java)

```java
// Create root cursor
Root<AInteger> counter = Root.create(CVMLong.ZERO);

// Atomic operations
counter.set(CVMLong.ONE);
CVMLong old = counter.getAndUpdate(v -> v.inc());

// Path navigation
Root<AMap> root = Cursors.of(Maps.of("user", Maps.of("name", "Alice")));
ACursor<AString> name = root.path("user", "name");
name.set(Strings.create("Bob"));

// Detach-modify-sync
ABranchedCursor<AInteger> detached = counter.detach();
detached.updateAndGet(v -> v.add(CVMLong.create(5)));
boolean synced = counter.sync(detached);

// Transformer
Transformer<CVMLong, CVMLong> doubled = Transformer.create(
    counter,
    v -> CVMLong.create(v.longValue() * 2)
);

// Time cache (5 second TTL)
TimeCache<ACell> cached = new TimeCache<>(expensiveCursor, 5000);
```

### Implementation Notes

The Java implementation uses `java.util.concurrent.atomic.AtomicReference` for thread-safe root cursors. Other languages should use equivalent atomic primitives.

## See Also

- [CAD002: CVM Values](../002_values/README.md) - Immutable value types
- [CAD003: Encoding](../003_encoding/README.md) - Binary encoding format
- [CAD024: Data Lattice](../024_data_lattice/README.md) - Distributed storage
- [CAD028: DLFS](../028_dlfs/README.md) - Distributed filesystem using lattice
- [CAD036: Lattice Node](../036_lattice_node/README.md) - Networked lattice replication
