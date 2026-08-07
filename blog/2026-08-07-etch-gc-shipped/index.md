---
slug: etch-gc-shipped
title: "Etch GC has shipped"
authors: [mikera, claude]
tags: [convex, data-structures, lattice, developer-tools]
---

In July we [previewed garbage collection for Etch](/blog/etch-online-gc) while the cutover plumbing was still being finished. Convex **0.8.9** (released 17 July) shipped the whole thing: online collection with crash-safe recovery, and three CLI subcommands — `convex etch gc`, `migrate` and `recover`. The design is now also a formal specification: [CAD049](/docs/cad/etch_gc) covers the collector, and [CAD048](/docs/cad/stores) the store abstraction it rests on.

This post is the follow-up we owed you: what it looks like actually running.

<!-- truncate -->

## A real collection, start to finish

Everything below is genuine output from the released `convex.jar` 0.8.9 on Windows; only the directory prefix in paths has been shortened.

Start with a fresh genesis store, then write some values that nothing references — the kind of unreachable data a long-running peer accumulates as Beliefs and intermediate states pile up:

```bash
convex peer genesis -e demo.etch
convex etch write -e demo.etch -c "<LARGE_UNREFERENCED_VECTOR>"   # repeated six times
convex etch info -e demo.etch
```

```
Etch file:          ...\demo.etch
Etch version:       0x0001
Data length:        821,542
Data root:          0x377a18b5418f9c4f657e3b82a91c4a94f2e4007d28cb2cf271349a944a75d88d
Root memory size:   470,340
Root data type:     Map
Root element count: 1
```

Now collect:

```bash
convex etch gc -e demo.etch
```

```
Etch GC complete
Size before:  821,542 bytes
Size after:   740,604 bytes
Reclaimed:    9.852%
Store file:   ...\demo.etch~
The collected file could not yet be renamed to demo.etch (still pinned by this
process). It will be installed automatically the next time the store is opened.
```

The reclaimed bytes are exactly the six unreachable vectors. The retention contract is the whole story here: a collected store keeps the root and everything reachable from it, and nothing else — there is no heuristic, no reference counting, no "probably unused". If you want something kept, you reference it from the root or persist it explicitly; persisting *is* the pin operation.

That last message is worth reading rather than skipping: on Windows, a memory-mapped file can't be renamed while the JVM still holds mappings, so the collected file waits under a `~` name. This is documented behaviour, not a bug — and the promise it makes is kept on the very next open:

```bash
convex etch info -e demo.etch
```

```
Etch file:          ...\demo.etch
Etch version:       0x0001
Data length:        740,604
Data root:          0x377a18b5418f9c4f657e3b82a91c4a94f2e4007d28cb2cf271349a944a75d88d
Root memory size:   470,340
Root data type:     Map
Root element count: 1
```

Same root hash, smaller store, `~` file gone. That hash equality is not cosmetic: the root is a cryptographic commitment to the entire reachable tree, so an unchanged root ID after collection *proves* the collector preserved every retained value bit-for-bit.

## What you get beyond the demo

**Verified cutover.** `etch gc` walks the root tree against the collected file alone and refuses to cut over if a single hash is missing — the failure mode of a premature cutover is silent data loss, so it is hard-gated, and a failed verification leaves your original store untouched.

**Cancellation that never discards.** During an online cycle all new writes land in the target file, so cancelling a collection rolls those writes back into the original store rather than deleting them. A crash mid-cycle resolves the same way on the next open: completed cutovers are adopted, abandoned cycles are rolled back, and nothing is ever thrown away that exists nowhere else.

**Migration with the same machinery.** `convex etch migrate -e source.etch --into dest.etch` moves *everything* in one store into another (which may be live and non-empty) — consolidating archives, seeding a fresh store, or moving a peer between disks.

**A defragmented store.** The sweep copies each subtree contiguously in depth-first order, and in an append-only file write order is physical layout — so a collected store also reads faster. Details in the [July post](/blog/etch-online-gc).

## For peer operators

[CAD017](/docs/cad/peerops) has long said operators SHOULD arrange periodic garbage collection of the Etch store; as of 0.8.9 there is finally a supported way to do it: stop the peer (or work on a copy), run `convex etch gc`, restart. Online in-process collection — the peer collecting while participating in consensus — is what the [CAD049](/docs/cad/etch_gc) lifecycle specifies and the store machinery implements; surfacing a trigger for it through the peer admin API is the natural next step.

The full design rationale — invariants, cost model, crash-window analysis — remains public in [ETCH_GC.md](https://github.com/Convex-Dev/convex/blob/develop/convex-core/docs/ETCH_GC.md), now with the CAD pair as its normative distillation. An append-only store that keeps its guarantees and gives the disk back: the exercise is no longer left to the reader.
