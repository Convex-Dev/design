---
slug: exabyte-sparse-files
title: "Supporting Exabyte Sparse Files in DLFS"
authors: [mikera, claude]
tags: [convex, dlfs, data-structures, lattice, java]
---

DLFS — the Decentralised Lattice File System — now supports sparse files up to
**9.2 exabytes** (Long.MAX_VALUE bytes). Creating one is instant. Writing a
single byte into the middle takes microseconds. Here's how we made that work
with a handful of elegant tricks in Convex's immutable data layer.

<!-- truncate -->

## Immutable Data with Structural Sharing

All data in Convex is **immutable**. Once created, a value never changes —
you produce a new version instead. This is fundamental to how the lattice
works: immutability enables content-addressing (every value has a unique
cryptographic hash), safe concurrent access, and automatic deduplication
across the network.

But immutability has a cost. If updating a single byte in a large structure
means copying the entire thing, performance collapses. The classic solution
is **structural sharing**: when you create a new version of a tree, you
reuse all the subtrees that didn't change. Only the path from the root to
the modified leaf is rebuilt — everything else is shared between old and
new versions, by reference.

This is how Convex vectors, maps, and sets already work. A million-element
vector can be "modified" by rebuilding just a handful of tree nodes while
the other thousands of nodes are shared with the previous version. Each
node is wrapped in a `Ref` (reference) that caches its content hash lazily,
so identical structures are always recognised as equal regardless of how
they were constructed.

The question was: could we push structural sharing to its absolute limit —
making it work for *sparse* data where the vast majority of the structure is
identical empty space?

## The Challenge

A sparse file is mostly empty — zeroes that don't actually consume storage.
Unix filesystems have supported them for decades; you can `truncate` a file
to a terabyte and it takes almost no space until you write real data into it.

We wanted the same capability in DLFS, Convex's decentralised file system.
DLFS stores file contents as immutable **BlobTree** structures — persistent
16-way trees where every node is content-addressed by its cryptographic hash.
A naive implementation of a 9.2 EB zero-filled blob would require building a
tree with over two quintillion leaf nodes. That's clearly not going to work.

But with structural sharing, identical subtrees can be the *same object*.
And in a zero-filled file, every subtree at every level is identical to its
siblings. The entire exabyte file can collapse down to one shared node per
tree level.

Making this work required four interlocking techniques.

## 1. Structural Sharing via a Single Empty Chunk

BlobTree is a 16-way radix tree. Each internal node has up to 16 children.
Leaf nodes are flat `Blob` objects of exactly 4096 bytes (the chunk size).
Each level of the tree multiplies capacity by 16, so the tree depth grows as
log₁₆ of the file size.

The key insight for sparse files: **every chunk in a zero-filled region is
identical.** And since Convex data structures are immutable, identical values
can be shared.

We start with a singleton:

```java
public static final Blob EMPTY_CHUNK = Blob.wrap(new byte[CHUNK_LENGTH]);
```

From this single 4096-byte allocation, `Blobs.createZero()` builds an
arbitrarily large zero blob through recursive structural sharing:

```java
public static ABlob createZero(long length) {
    if (length <= Blob.CHUNK_LENGTH) {
        return Blob.EMPTY_CHUNK.slice(0, length);
    }
    long csize = BlobTree.childSize(length);
    int n = BlobTree.childCount(length);
    ABlob fullChild = createZero(csize);  // shared across all full children
    Ref<ABlob> fullRef = fullChild.getRef();

    @SuppressWarnings("unchecked")
    Ref<ABlob>[] children = new Ref[n];
    for (int i = 0; i < n - 1; i++) {
        children[i] = fullRef;            // same Ref object
    }
    // last child may be smaller
    long lastSize = length - csize * (n - 1);
    children[n - 1] = createZero(lastSize).getRef();
    return BlobTree.create(children, length);
}
```

Every full child at every level shares a single Java object. A 9.2 EB zero
blob (2⁶³ − 1 bytes) has a tree depth of 13 levels — and contains only
**~26 unique node objects** in memory. Creation is instant.

## 2. Tree-Aware replaceSlice

Creating a sparse file is only half the problem. You need to be able to
**write into it** efficiently. In DLFS, `DLFileChannel.write()` ultimately
calls `replaceSlice(position, data)` on the file's BlobTree.

The default implementation in `ABlob` slices the blob into head and tail
segments around the write position and rejoins them with two appends:

```java
// Default: splits and rebuilds — O(n) for large blobs
Blob h = slice(0, position);
ABlob r = h.append(b).append(slice(position + blen, count));
```

For a 1 GB file, even a single-byte write in the middle rebuilds the entire
tree spine twice. For an exabyte file, it's completely hopeless.

Our tree-aware override navigates directly to the affected children:

```java
@Override
public ABlob replaceSlice(long position, ABlob b) {
    long csize = childLength();
    int firstChild = (int)(position / csize);
    int lastChild = (int)((end - 1) / csize);

    Ref<ABlob>[] newChildren = null;  // lazy clone

    for (int i = firstChild; i <= lastChild; i++) {
        ABlob oldChild = getChild(i);
        // ... compute slice of b for this child ...
        ABlob newChild = oldChild.replaceSlice(replaceStart, piece);
        if (newChild != oldChild) {
            if (newChildren == null) newChildren = children.clone();
            newChildren[i] = newChild.getRef();
        }
    }

    if (newChildren == null) return this;  // nothing changed
    return new BlobTree(newChildren, shift, count);
}
```

This has several nice properties:

- **O(log₁₆ n)** — descends only through the affected branch of the tree
- **Identity preservation** — unchanged children keep their existing `Ref`,
  so their subtrees aren't touched at all
- **Lazy clone** — the children array is only copied if something actually
  changed
- **Recursive** — a write spanning a chunk boundary naturally splits across
  two children, each recursing independently

Writing a single byte into a 9.2 EB sparse file touches exactly 13 nodes
(one per tree level) plus one leaf chunk. Everything else is preserved.

## 3. Hash-Based Equality for Shared Structures

There's a subtle trap with structural sharing. When two independently created
sparse blobs share the same logical content but aren't the *same Java object*
(e.g. two calls to `Blobs.createZero(Long.MAX_VALUE)`), comparing them for
equality must not devolve into visiting every node.

Convex values are wrapped in `Ref` objects that cache their content hash
lazily. When two `RefDirect` instances hold different Java objects, the
natural approach is to recurse into `value.equals(va)`. But for a BlobTree
with fanout 16 and depth 13, that fans out to 16¹³ ≈ 10¹⁵ recursive calls
— even though there are only ~26 unique nodes.

The fix is to fall back to **hash comparison** when object identity doesn't
match:

```java
// RefDirect.equals — the critical path
if (value == va) return true;           // identity: instant
if (this.hash != null && a.hash != null)
    return this.hash.equals(a.hash);    // cached hashes: instant
return getHash().equals(a.getHash());   // force lazy computation
```

Because every shared node computes its hash exactly once and caches it, the
total work for comparing two independently created exabyte zero blobs is
proportional to the number of *unique* nodes — about 26 hash computations,
not 10¹⁵ recursive comparisons.

This is a general improvement: any Convex data structure with structural
sharing benefits from the same O(unique nodes) equality check.

## 4. Overflow Protection

When you can represent 9.2 EB blobs, you're operating at the edge of 64-bit
arithmetic. Appending two large blobs can silently overflow `Long.MAX_VALUE`,
wrapping to a negative count and producing a corrupt data structure.

We added explicit overflow guards:

```java
if (count > Long.MAX_VALUE - dlen) {
    throw new IllegalArgumentException("Blob append would exceed maximum size");
}
```

This check is O(1), costs nothing in the normal case, and prevents a class
of subtle corruption bugs that would be extremely difficult to diagnose.

## Putting It Together

The result is a file system primitive with remarkable properties:

| Operation | Complexity | Example (9.2 EB file) |
|-----------|------------|----------------------|
| Create sparse file | O(log₁₆ n) | ~26 node allocations |
| Write single byte | O(log₁₆ n) | ~13 tree nodes + 1 chunk |
| Read any byte | O(log₁₆ n) | ~13 tree traversals |
| Compare two sparse files | O(unique nodes) | ~26 hash computations |
| Memory for empty file | O(log₁₆ n) | ~26 objects total |

All of this composes with the rest of the Convex lattice stack. Every node
is content-addressed, so identical subtrees are automatically deduplicated
in storage. Writes produce new tree spines that share structure with the old
version — giving you full version history for free. And because BlobTree is
just another `ACell`, it participates in Convex's lattice merge semantics,
consensus protocol, and persistence layer without special cases.

The entire implementation is under 100 lines of new code across three files.
Sometimes the most powerful abstractions come from taking an existing design
seriously — and then simply not allocating memory for things that don't
need to exist.

---

*The sparse file support is available in Convex 0.8.x. The full source is
at [github.com/Convex-Dev/convex](https://github.com/Convex-Dev/convex).*
