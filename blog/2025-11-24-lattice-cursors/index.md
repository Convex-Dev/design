---
slug: lattice-cursors
title: "Cursors: a programming model for the lattice"
authors: [mikera, claude]
tags: [convex, lattice, data-structures, java]
---

Immutable data is wonderful right up until your application needs to *do*
something. Convex 0.8.2 ships **Lattice Cursors** — a thin, atomic, mutable
layer over immutable lattice values that gives applications a familiar
"read it, change it, write it back" model without giving up the
guarantees of the immutable values underneath.

<!-- truncate -->

## The gap being bridged

Everything in the Data Lattice is an immutable, content-addressed value:
perfect for verification, replication and structural sharing; awkward for
an application that just wants to bump a counter. The classic answer is to
hand-roll an atomic reference and a compare-and-swap loop around your root
value — and then hand-roll it again, slightly differently, in the next
component. Cursors make that pattern a first-class, well-specified thing.

A **root cursor** is a mutable pointer to an immutable value, with the full
atomic toolkit: `get`, `set`, `compareAndSet`, `updateAndGet`,
`accumulateAndGet` and friends. When you "update" through a cursor, the
value isn't touched — the cursor atomically swings to a new immutable value,
and anyone still holding the old one keeps a perfectly consistent snapshot.

## Path cursors: zoom in, stay atomic

Real state is nested. A **path cursor** targets a value deep inside the
root — `["users" alice-key :balance]` — while delegating every operation
atomically to its parent. Updating a leaf rebuilds the path above it
(structural sharing keeps that cheap) in one atomic step at the root, so
two threads updating different branches never tear each other's writes.

Lattice-aware path cursors handle one subtle case well: writing
through a missing intermediate doesn't invent a generic hash map — the
intermediate is created from the lattice's own `zero()` value, so it has
the *type the lattice expects*. The type system of your replicated data
survives your write path.

## Fork, modify, sync

The pattern we expect to see everywhere is **fork–modify–sync**. Fork a
working copy of a cursor; make a batch of updates in isolation; then
`sync()` back. Here's the part that matters: sync doesn't compare-and-swap
and hope. It merges your working copy into the parent **using lattice merge
semantics** — so it always succeeds, with no retry loop, even if the parent
moved while you worked. Two concurrent forks don't race to overwrite each
other; they *converge*, exactly as lattice values are supposed to.

(The plain `merge()` compare-and-set variant exists too, for when you
genuinely want "my transaction or nothing". The point is that the choice is
explicit.)

## Why this matters beyond tidiness

DLFS already speaks this model, and every lattice application we're
building follows it: hold a cursor to your root, navigate with paths,
batch with forks, converge with sync. Getting the concurrency story right
*once*, in one specified layer, means application authors stop reinventing
it — and stop reinventing it subtly wrong.

The full specification is [CAD035](/docs/cad/cursors). It's a small
abstraction, deliberately boring on the surface — and it's fast becoming
the standard way every stateful thing on the lattice is written.
