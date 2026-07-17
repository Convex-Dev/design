---
slug: lattice-queue
title: "Kafka on the lattice"
authors: [mikera, claude]
tags: [convex, lattice, data-structures, realtime]
---

Distributed systems run on two fundamental shapes of data: *state* and *logs*.
The lattice already handles state — the [KV Database](/docs/cad/kv_database)
gives you shared mutable maps that merge and converge. The **Lattice Queue**
now covers the other half: ordered, durable streams of events with
Kafka-style semantics — topics, partitions, offsets, independent consumers —
but with no broker cluster anywhere.

<!-- truncate -->

## The familiar part

If you have used Kafka, the Lattice Queue will look familiar. A **topic** is
a named collection of numbered **partitions**. Each partition is an
append-only log: records carry a key, value, timestamp and headers, and each
one is assigned a monotonically increasing **offset** that never changes.
Records with the same key route to the same partition
(`floorMod(hash(key), numPartitions)`), preserving per-key ordering.

Consumers don't remove messages. Each consumer tracks its own offset and
reads at its own pace — a fast consumer streams records as they arrive, a
slow one catches up later, a new one can replay from any point in history.
Producers and consumers never need to be online at the same time.

## No broker

What's *missing* is the broker. There is no Kafka cluster, no ZooKeeper, no
central service assigning offsets. A Lattice Queue is a lattice value: a
data structure with a merge function. Replication is just lattice merge.

The trick is that an append-only log is **monotonic by construction** — it
only grows. Merging two copies of the same log means adopting the longer
one. Truncation (discarding records every consumer has processed) is
monotonic too: the start offset only ever advances, so in a merge the higher
start offset wins and truncation decisions propagate cleanly across
replicas. Offsets remain stable through all of this — truncating records
0–2 doesn't renumber record 3.

Offset assignment stays deterministic because each partition follows a
**single-leader** model, exactly like a Kafka partition: one writer appends,
replicas converge. Want parallel writers? Use more partitions — each has its
own leader, so a topic as a whole accepts writes from multiple nodes. We
think that's the right trade-off: deterministic offset assignment matters
more than multi-writer append on a single log, which no system delivers
without serious compromises.

## Why this matters

Because queues are plain lattice values, they inherit everything the lattice
already does: cryptographic signing, peer-to-peer replication via lattice
nodes, offline operation with convergence on reconnect, and fork/sync for
conflict-free distribution. A change feed can cross organisational
boundaries with no shared infrastructure beyond a lattice connection.

The most immediate use cases are agentic: task queues dispatching
work items to processing agents, audit logs that replay deterministically,
and event feeds between AI agents that don't share an administrative domain
— each party holds a replica, and the lattice keeps them convergent.

The full specification is in [CAD040](/docs/cad/lattice_queue) — including
the parts still marked provisional, because we'd rather show the design
as it stands than pretend it's finished. With state and logs both covered,
the lattice now speaks the two fundamental shapes of distributed data.
