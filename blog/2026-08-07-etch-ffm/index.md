---
slug: etch-ffm
title: "Etch on the FFM API"
authors: [mikera, claude]
tags: [convex, java, data-structures]
---

Convex 0.8.10 quietly swapped the engine under Etch's memory mapping: on Java 22 and above, stores now run on a backend built with the JDK's Foreign Function & Memory (FFM) API instead of `MappedByteBuffer`. `convex.jar` ships both backends as a multi-release jar and picks the right one at runtime, so nothing changes for operators — Java 21 keeps the classic backend, Java 22+ gets the new one automatically.

<!-- truncate -->

## Why replace something that worked?

`MappedByteBuffer` has carried Etch a long way, but it has two structural problems for a database that wants to be very large and very long-lived:

- **The 2 GB limit.** Buffers are `int`-indexed, so a large store must be quilted from overlapping mapped regions with careful margin handling at the seams. That scheme works, but it is complexity that exists purely to work around a 32-bit index.
- **Non-deterministic unmapping.** A mapped buffer's file mapping dies only when the buffer is garbage collected — Java offers no reliable way to release it explicitly. This is why, on Windows, [Etch GC](/blog/etch-gc-shipped) sometimes cannot rename or delete a collected file immediately: the old mapping is still pinned until the JVM gets around to collecting it.

The FFM API — final and stable since JDK 22 — addresses both: memory segments are `long`-indexed, and mapping lifetimes are owned by explicit arenas rather than the garbage collector.

## The 0.8.10 backend

The new mapper divides the store file into fixed 1 GiB regions. Completed regions stay mapped for the life of the store; growth replaces only the final, partial region. This bounds both the remapping work on growth and the unused allocation at the tail, while keeping the ordinary access path a direct region index — a 1 TiB store needs just 1,024 region entries.

None of this touches the file format: an Etch file written under one backend opens identically under the other, on either Java version. The format remains as specified in [CAD047](/docs/cad/etch).

## What it sets up

The remaining prize is deterministic unmapping: moving region lifetimes fully onto arena scopes would let a store *close* its mappings at the moment it closes the file — making the deferred deletions in Etch GC's file lifecycle unnecessary, and retiring the last of the 2 GB-era region plumbing. That step is tracked in [convex#636](https://github.com/Convex-Dev/convex/issues/636) and gated on the project's Java baseline moving to 25. The 0.8.10 backend is the foundation it will land on.
