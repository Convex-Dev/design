# CAD035: Lattice Cursors

## Overview

Lattice Cursors provide mutable access points into immutable CVM data structures. They bridge the gap between Convex's immutable value semantics and the practical need for stateful updates in applications working with the Data Lattice.

A cursor can be thought of as a mutable pointer that references an immutable value. When the value is "updated", the cursor atomically switches to reference a new immutable value while the old value remains unchanged. This pattern preserves all benefits of immutable data (structural sharing, safe concurrency, Merkle verification) while providing a familiar mutable interface.

## Scope

This CAD specifies **storage and update mechanisms** used by application
components. [CAD024](/docs/cad/data_lattice) defines abstract merge semantics;
[CAD038](/docs/cad/lattice_auth) defines authorisation; and
[CAD045](/docs/cad/lattice_apps) defines the components that bind those rules to
storage, domain operations and publication. A cursor does not choose application
policy, discover an owner resolver or own persistence.

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

A root holds its current value. Reconciliation baselines belong to forks; a root need not retain its creation-time value or a publication callback.

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
- A missing intermediate is an error for a plain path write. A component may supply a projection that constructs the correct container atomically on a changed write; construction and reads MUST NOT create state. A path MUST NOT write through a signed envelope as if it were an ordinary record.

#### Forkable Cursor

A forkable cursor can create independent working storage. In the Java
implementation, `fork()` returns a `ForkedCursor`, and `sync(merge)` supplies the
reconciliation function for each publication. Only the fork retains its
destination and reconciliation baseline; it MUST NOT retain the supplied merge
function between sync operations. A detached snapshot can instead use independent
root storage.

On sync, an unchanged working value adopts the destination; an unchanged
destination accepts the working value. If both changed, the fork applies its
operation-supplied reconciliation function. It publishes by compare-and-set and retries
when concurrent writes require it. A successful sync returns the published
snapshot; later edits may remain pending. A failed preparation or merge MUST NOT
install a partially prepared value.

Ordinary writable cursors, including paths and transformed views over forks,
implement `sync(merge)` as a read-only operation. They MUST NOT invoke the merge
function or publish enclosing storage. An empty path returns the same cursor and
therefore retains that cursor's sync behaviour.

The fork stops at its destination and MUST NOT invoke publication on an enclosing
component or host. Components choose this boundary and supply reconciliation and,
where needed, stored-value conversion functions. Signing failure and storage or
validation errors may prevent publication; sync is not guaranteed to succeed for
arbitrary inputs or unavailable capabilities.

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

The Java implementation separates atomic storage, projections and write views:

```text
ACursor<V>
  AForkableCursor<V>
    Root<V>
    PathCursor<V>
    ProjectionCursor<S,V>
    ForkedCursor<V>
    AUpdateCursor<V,S>
      SignedCursor<V>
      StampedCursor<V>
      DefaultCursor<V>
  AView<T>
    ACachedView<V>
      TimeCache<V>
    Transformer<S,T>
```

### Component-supplied views

A projection takes explicit read and write functions. The owning component
supplies any construction rule for absent storage. Plain cursor update functions
receive the actual stored value, including nil; no ambient lattice substitutes a
zero value for them.

A component may explicitly opt into `cursor.withDefault(value)`. This returns a
`DefaultCursor` whose reads and atomic update functions see the supplied value
in place of nil. Reading or writing back that default MUST leave absent storage
absent. A changed value is stored normally; writing nil clears storage and restores
the default view. The caller chooses the default's type. For example, a record can
supply an empty map before exposing ordinary paths to its fields, while a set
component handles its own absent field as an empty set. No lattice policy or
container type is inferred by navigation.

`SignedCursor` takes an explicit authoring function and exposes an unsigned view
over signed storage. `StampedCursor` takes a clock and stamp function. Components
bind authorisation and other policy before exposing these views. Path navigation
does not insert either view automatically. Incoming signed data is merged at its
envelope boundary, and incoming timestamps are preserved rather than re-stamped.

## Lattice Integration

Components may use abstract lattice definitions from CAD024 for merge, validation,
key resolution and correctly typed empty values. A cursor operates on the
functions the component supplies; it does not need a lattice object or a
`LatticeContext` field. External keys may be canonicalised through lattice
`resolveKey` operations before constructing a view.

### Lattice Context

The Java `LatticeContext` is component policy, normally supplying signing
capabilities and a write clock. A component passes policy to newly constructed
children or captures it in a write function. Existing shared children retain their
policy. Dynamic capabilities MUST be thread-safe when shared. Owner verification
is bound to the ownership boundary as specified by CAD038 and CAD045; context
inheritance through cursor parent links is not required.

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

| Mechanism | Java class |
|---|---|
| Atomic storage interface | `ACursor`, `AForkableCursor` |
| Root storage | `Root`, `TransactionalRootCursor` |
| Existing-path access | `PathCursor` |
| Supplied read/write projection | `ProjectionCursor` |
| Independent working state and reconciliation | `ForkedCursor` |
| Write transformation | `AUpdateCursor`, `SignedCursor`, `StampedCursor` |
| Read-only or cached views | `AView`, `ACachedView`, `TimeCache`, `Transformer` |

These classes are in `convex.lattice.cursor`. Application component classes and
their policy are described in CAD045.

### Example (Java)

This complete example uses a supplied set-union merge function. It performs no
network or store publication.

```java
import convex.core.data.ASet;
import convex.core.data.Sets;
import convex.core.data.prim.CVMLong;
import convex.lattice.cursor.Root;
import convex.lattice.generic.SetLattice;

public class CursorExample {
    public static void main(String[] args) {
        var lattice = SetLattice.<CVMLong>create();
        Root<ASet<CVMLong>> root = Root.create(Sets.empty());
        var draft = root.fork();
        draft.updateAndGet(values -> values.include(CVMLong.ONE));
        root.updateAndGet(values -> values.include(CVMLong.TWO));
        draft.sync(lattice::merge);
        if (!root.get().equals(Sets.of(1, 2))) throw new AssertionError();
    }
}
```

### Implementation Notes

The Java implementation uses `java.util.concurrent.atomic.AtomicReference` for thread-safe root cursors. Other languages should use equivalent atomic primitives.

## See Also

- [CAD002: CVM Values](/docs/cad/values) - Immutable value types
- [CAD003: Encoding](/docs/cad/encoding) - Binary encoding format
- [CAD024: Data Lattice](/docs/cad/data_lattice) - Distributed storage
- [CAD028: DLFS](/docs/cad/dlfs) - Distributed filesystem using lattice
- [CAD036: Lattice Node](/docs/cad/lattice_node) - Networked lattice replication
