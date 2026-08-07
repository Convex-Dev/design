# CAD049: Etch Garbage Collection

## Overview

Etch ([CAD047](../047_etch/index.md)) is append-only: entries are never mutated or deleted, so a long-running peer accumulates every Belief, State and intermediate value it has ever persisted. Garbage collection (GC) reclaims this space by **copying collection**: live data is copied into a fresh store, and the old file is discarded once the copy is verifiably complete.

This CAD specifies the collection procedure: what is retained, the lifecycle of a collection cycle, the invariant that makes online collection cheap, cancellation and crash recovery, and the related whole-store migration operation. It builds on the store abstraction and persistence-status semantics of [CAD048](../048_stores/index.md).

Beyond reclaiming space, copying collection also improves locality: the copy writes each subtree contiguously in depth-first order, so a collected store clusters related cells on adjacent pages instead of scattering them in historical write order.

## Design objectives

- **Online collection.** A store can be collected while in live use: new writes are redirected to the target store, and reads fall back to the old store for data not yet migrated.
- **Explicit retention.** What survives is exactly the root's reachable tree plus what was explicitly persisted — nothing is retained implicitly.
- **Bounded cost.** During a cycle, store operations cost at most ~2× normal (one extra lookup on the read path), and total migration work is proportional to live data, not to the number of writes.
- **Offline operation.** The same procedure can run as a standalone tool against a store not in use.
- **Migration as the general primitive.** Collection is a special case of store-to-store migration (into a fresh store, with cutover); the same machinery serves consolidating and moving stores.

## Non-goals

- **In-place compaction.** Etch is append-only by design; the existing file is never mutated or truncated. Collection always produces a new file.
- **Automatic scheduling.** When to collect and when to cut over are operator (or embedding application) decisions.
- **Concurrent multi-process access.** A store is owned by one process (Etch holds an exclusive lock); offline collection operates on an unopened store.

## Specification

### Retention contract

A completed collection MUST retain, and MUST retain only:

1. **The root tree** — the current root and everything reachable from it.
2. **Everything persisted after the cycle started** — all writes during the cycle go to the target, so any value stored during the cycle survives.
3. **Explicit keeps** — anything else the application persists during the cycle, or folds into the root before cutover.

Nothing is retained implicitly: reading a value during the cycle does NOT preserve it, and there is deliberately no copy-on-read. **Persisting a value is the "pin" operation** — no separate pinning API exists, and there is no store-level multi-root feature (a design decision: applications wanting several durable entry points, such as a peer serving recent historical states, reference them from the main root). This is the precise meaning of the garbage collection and pinning capability promised for stores in [CAD024](../024_data_lattice/index.md).

### Collection lifecycle

A cycle has four phases:

```
        start                sweep                        cutover
IDLE ──────────▶ COLLECTING ─────────▶ (verified complete) ─────▶ new store in use,
                     │                                            old store = legacy view
                     └── cancel ──▶ roll target back into old ──▶ IDLE (nothing lost)
```

**Start.** The implementation creates a fresh, empty target store carrying the current root hash. Starting MUST fail if a cycle is already in progress. From this point:

- **Writes** MUST go to the target.
- **Reads** MUST check the target first, then fall back to the old store — the source of the ≤2× read bound.
- A persist already in flight when the cycle starts MUST complete entirely against one store (linearising as before the cycle), never split one tree across both.
- All references handed out during the cycle remain bound to the collecting store: the target is internal until cutover, which is what keeps cancellation invisible to the application.

**Sweep.** The sweep persists the root's reachable tree into the target:

- Traversal is post-order depth-first — children immediately before their parent — which both establishes the persistence invariant below and produces the contiguous subtree layout. Sweep output SHOULD NOT be parallelised across subtrees, which would destroy that locality.
- Each entry MUST be transferred at the status it held in the old store (with *persisted* as the floor). Demoting *announced* entries would trigger spurious novelty re-broadcast after cutover; promoting entries to *announced* would forge peer commitments.
- The sweep MUST fail on missing source data rather than silently produce a smaller, apparently-complete store from a damaged source.

**The central invariant (INV-1).** *An entry present in the target with status ≥ persisted has its entire reachable tree present in the target.* To maintain it, persistence requests during a cycle MUST NOT be satisfied by entries found only in the old store — the write path descends and copies such trees into the target instead. INV-1 is what lets the sweep (and every live write touching an unmigrated tree) prune wherever it finds a target-resident persisted entry: no visited-set or mark state is needed, total migration work is bounded by live data, and shared subtrees are copied once.

**Cutover.** Completion MUST be verified before cutover — a walk of the current root resolving against the target only, reporting any missing hash — because the failure mode of premature cutover is silent data loss; an implementation MUST refuse to cut over unverified. Cutover yields a **new store** over the target; the old store remains a functional read view (falling back across both files, writes routing to the successor) until the caller closes it, at its own pace. Once the old store is closed, references bound to it fail with a store-closed error on uncached reads — even for values that were migrated: the binding is dead, not the data, and every retained value remains retrievable by hash from the new store. Callers MUST NOT retain references to old-store values across close; the correct handover is to re-persist the value into the new store while it is still resolvable (see CAD048, references and store identity).

**Cancellation.** Every write since the cycle started exists only in the target, so cancellation MUST NOT simply delete it: cancellation rolls the target's entire contents back into the original store (the reverse of migration, below), restores the root, and only then discards the target. Cancellation MUST be idempotent so that a failed cancel can be retried, and MUST be invisible to the application beyond the transient ≤2× read cost.

### Crash recovery

Opening a store MUST first reconcile any interrupted collection state, and recovery MUST be idempotent (a crash during recovery leaves a state the next run recognises). The required outcomes:

- **A completed cutover is adopted**: the collected store becomes the store, and the superseded file is deleted — this deletion is the space reclamation, and is safe precisely because cutover was gated on verified completeness.
- **A superseded or rolled-back file is deleted, never rolled back**: re-importing it would resurrect collected garbage. Implementations MUST record enough on-disk state to distinguish this case from the next one.
- **An abandoned cycle is rolled back, never discarded**: an interrupted target holds writes that exist nowhere else; its contents are migrated back into the original store, tolerating a torn tail at the crash point.

The original file is never modified during a cycle except by roll-back (which only adds entries and monotonically merges status), so a crash at any point loses at most the usual unflushed tail of writes.

### Store-to-store migration

Migration ensures **everything** in a source store is persisted in a destination store — not just the reachable tree — carrying each entry at its recorded status:

- The source MUST be write-quiescent for the duration (full-store enumeration is not reliable under concurrent writes); reads of the source are unaffected.
- The destination MAY be live and non-empty; migration composes with concurrent use through the destination's normal write path.
- The destination's root is not changed unless explicitly requested; merging two roots is a lattice-level operation above this layer.

Collection is then migration's special case: a fresh destination, root-tree coverage only, plus the cutover plumbing. Migration's own uses include consolidating archives into a live store and seeding a new store from several sources.

### Costs

| Operation | Normal | During a cycle |
|---|---|---|
| Cache-hit read | 1× | 1× |
| Read of migrated or new data | 1× | 1× |
| Read of unmigrated data | 1× | 2× |
| Write of novel data | 1× | ~1× |
| Write touching an unmigrated tree | 1× | one-off copy of that subtree (within the O(live data) total) |
| Disk usage | one file | both files, transiently |

Operators MUST have free disk space of at least the expected collected size before starting a cycle.

### Generalisation

The procedure assumes only the CAD048 store properties: content-addressed immutable entries, a single root, monotonic status, and a *persisted*-means-whole-tree status level. Any store with those properties can adopt the same four-phase scheme and the same INV-1 pruning — which is the portable core that makes online copying collection cheap enough to run on a live peer.

## Operations

The Convex CLI exposes the procedure for offline stores (exclusive locking enforces that the store is not in live use):

```bash
# Collect in place: the store file is rebuilt and replaced
convex etch gc -e store.etch

# Collect into a fresh file, leaving the source untouched
convex etch gc -e store.etch --output collected.etch

# Migrate everything from one store into another (existing) store
convex etch migrate -e source.etch --into dest.etch [--set-root]

# Run crash recovery explicitly (also runs automatically on every open)
convex etch recover -e store.etch
```

`etch gc` verifies completeness before cutover and fails with the source untouched if anything is missing; it reports sizes before and after. `etch validate` checks structural integrity of a store independently.

## Reference implementation notes

In the Convex JVM implementation:

- The lifecycle is `EtchStore.startGC()` / `transferGC()` / `verifyGC()` / `completeGC()` / `cancelGC()`; tree transfer with INV-1 pruning is `StoreTransfer.transfer`, whole-store migration `EtchUtils.migrate`, and recovery `EtchUtils.recover` (invoked by `EtchStore.create`).
- Target files are named generationally (`store.etch~`, `~1`, …) off the store's logical base file; a rewritten completion marker names the current file, and superseded files carry tombstones written before the marker so that every crash window reads unambiguously. Deletion of memory-mapped files may be deferred on Windows; recovery and subsequent cycles retry and reuse names.
- The full design rationale, invariant analysis and testing plan live in `convex-core/docs/ETCH_GC.md` in the [Convex repository](https://github.com/Convex-Dev/convex); regression coverage includes `StoreTransferTest` and `EtchStatusIntegrityTest`.

## See also

- [CAD047: Etch](../047_etch/index.md) — the on-disk format being collected
- [CAD048: Lattice Stores](../048_stores/index.md) — the store abstraction and status semantics this CAD builds on
- [CAD024: Data Lattice](../024_data_lattice/index.md) — the lattice capability this reclamation supports
