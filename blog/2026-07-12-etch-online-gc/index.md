---
slug: etch-online-gc
title: "Garbage collecting an immutable universe"
authors: [mikera, claude]
tags: [convex, data-structures, java, lattice]
---

For years, a comment in `EtchStore.java` read: *"Garbage collection is left
as an exercise for the reader."* We're finally doing the exercise. Coming in
Convex 0.8.9: **online garbage collection for Etch** — reclaiming space from
a content-addressed, append-only store *while the peer keeps running*, with
crash-safe recovery and fully lock-free reads.

<!-- truncate -->

## Why an immutable store needs GC

Etch is the storage engine under every Convex peer: an append-only file of
content-addressed entries — every value keyed by its hash, indexed by a
radix tree. Append-only is a wonderful property: writes are sequential,
corruption can't touch history, and identical values are stored exactly
once.

The flip side is that nothing is ever reclaimed. A long-running peer
accumulates every Belief, every State, every intermediate value it has ever
persisted — the current consensus state is a tiny fraction of the file
carrying it. That's tolerable for months of operation. It isn't tolerable
for years.

## Copying collection, lattice style

You can't compact an append-only file in place, and we don't try. Etch GC is
a **copying collector**: build a fresh store, copy everything reachable from
the root, then cut over. The lattice data model makes the reachability walk
unusually cheap — `Ref` status levels are monotonic, and `PERSISTED` carries
a strong guarantee: *the cell and its entire reachable tree are already in
the store*. The sweep can prune whole subtrees the moment it sees that flag,
instead of descending millions of cells one by one.

The *online* part is a disciplined split: once a GC cycle starts, new writes
are redirected to the target store, while read misses fall back to the old
one. Marginal cost during a cycle is bounded — roughly one extra index
lookup on the read path — so a peer can collect without leaving consensus.

## Locality for free

One property of the design costs nothing extra. The copy runs as a
post-order, depth-first traversal, and in an append-only file **write order
is physical layout**. So after GC, every subtree occupies one contiguous
byte range with parents adjacent to children. State reads, Belief merges and
sync serving stop scattering across the file in historical write order and
start hitting sequential pages. GC doesn't just shrink the store; it
*defragments* it, as a side effect of the traversal order.

## Migration and recovery, same machinery

Because "GC into a fresh store" is just a special case of "ensure everything
reachable exists in that store over there", the same primitives give us
store-to-store **migration** and **recovery** for free. The CLI grows three
subcommands — `convex etch gc`, `convex etch migrate` and
`convex etch recover` — for offline collection, moving stores between
locations, and salvaging what's reachable from a damaged file.

## Where it stands

This is a feature in the works, and we're sharing it that way. The core
transfer, migration and verification primitives are implemented and tested;
the online cutover plumbing is being completed for 0.8.9, and the full
design — invariants, proofs and all — is public in
[ETCH_GC.md](https://github.com/Convex-Dev/convex/blob/develop/convex-core/docs/ETCH_GC.md).
Etch reads have already gone fully lock-free on the development branch,
which the online collector builds on.

An append-only store that keeps its guarantees and gives the disk back —
the exercise was worth doing.
