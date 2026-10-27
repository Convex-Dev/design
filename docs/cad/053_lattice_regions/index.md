# CAD053: Lattice Regions

## Overview

The global lattice root is a [Keyed Lattice](../024_data_lattice/index.md) whose top-level keys are **regions**: `:fs` for the distributed filesystem, `:p2p` for peer co-ordination, and so on. This CAD is the official list of those regions. For each it gives the key, what the region is for, where its lattice is defined, and its status.

Root regions are ecosystem-owned and allocated by the Convex Foundation. They are typically facilities that many applications can use. State that belongs to a single application does not get a region: it lives under the `:app` region, keyed by application name ([CAD045](../045_lattice_apps/index.md)).

## Motivation

A root region key is shared by every application that uses it, so it needs one meaning: what the data under it is, and how it is represented. A key used without being recorded anywhere invites two pieces of software to give it different meanings. A single list, maintained by the Foundation, lets implementers see which keys are taken, what each means, and where to find its definition, and gives a new facility one place to be allocated.

The list does not decide what a node merges: that is for the lattice applications the node runs ([Hosting](#hosting)).

## Specification

### Region Keys

A region key MUST be a Keyword. It is the first path element when navigating from a node's root cursor, as in `[:kv <owner> ...]`.

A root region MUST be listed in this CAD before software uses it. A key that is not listed MUST NOT be used at the root: an application's own state belongs under `:app` instead ([CAD045](../045_lattice_apps/index.md)).

A key, once allocated, MUST NOT be given a different meaning. A region that is no longer used is marked Retired and stays in the list, so its key is not reused.

### Allocation

Regions are allocated by the Convex Foundation, by a change to this CAD. A region is allocated for a facility that more than one application can use, with a defined data representation. The allocation names where the region is defined: a CAD where one exists, otherwise the reference implementation until a CAD is written.

### Hosting

A node MAY host any subset of the allocated regions. The lattice applications it runs decide which of them it merges, and how ([CAD045](../045_lattice_apps/index.md)). An application MUST ignore incoming data it does not understand or does not serve, leaving what it already holds unchanged, so nodes hosting different sets of regions interoperate on the regions they share.

### Status

| Status | Meaning |
|---|---|
| **Standard** | Allocated, specified by its defining CAD, and present in the core root lattice. |
| **Allocated** | Allocated to a facility whose lattice is implemented, but whose specification is partial or still to be written, or which is not yet in the core root. |
| **Reserved** | Allocated, but not yet served by any application, so what arrives there is ignored. |
| **Proposed** | Anticipated for a facility, with neither the key nor the representation settled. Not to be used. |
| **In use, not allocated** | Used at the root by deployed software, but not allocated by this CAD. Listed so the key is not taken for anything else, pending a decision. |
| **Retired** | No longer used. The key is kept so it is never reassigned. |

## Regions

| Key | Region | Lattice | Defined by | Status |
|---|---|---|---|---|
| `:data` | Data | Content-addressable store of cells indexed by hash | [CAD024](../024_data_lattice/index.md) | Standard |
| `:fs` | Filesystem | Owner Lattice of named [DLFS](../028_dlfs/index.md) drives | [CAD028](../028_dlfs/index.md) | Standard |
| `:kv` | Key-Value | Owner Lattice of named key-value stores with per-entry merge | [CAD037](../037_kv_database/index.md) | Standard |
| `:queue` | Queue | Owner Lattice of topics of partitioned, append-only streams | [CAD040](../040_lattice_queue/index.md) | Standard; its structure is still being refined |
| `:p2p` | P2P | Peer-to-peer network state: the node registry, signed node records per node key | [CAD036](../036_lattice_node/index.md) for replication; the region's content in the `convex-p2p` reference implementation | Allocated; a specification is to be written |
| `:local` | Local | Peer-local state that is never replicated | [CAD024](../024_data_lattice/index.md) | Standard |
| `:id` | Identity | Owner Lattice of signed P2P user identity records, separate from node records | `convex-p2p` reference implementation | Allocated; a specification is to be written |
| `:kad` | Kademlia | Reserved for peer routing; merge semantics not decided | `convex-p2p` reference implementation | Reserved |
| `:social` | Social | Owner Lattice of per-user social state: feeds, profiles, follows | `convex-social` reference implementation; used as the running example in [CAD045](../045_lattice_apps/index.md) | Allocated; a specification is to be written |
| `:app` | Applications | Keyed Lattice of application lattices, keyed by application name | [CAD045](../045_lattice_apps/index.md) | Allocated; not yet in the core root |
| `:convex` | Convex networks | Map Lattice from network ID to each network's peer Orders, the content of a Belief | [CAD054](../054_convex_region/index.md) (draft) | Reserved; not yet hosted |
| `:sql` | SQL | Databases published for many applications to read, such as reference tables: each owner's signed [Convex SQL](../039_convex_sql/index.md) databases | [CAD039](../039_convex_sql/index.md) | Reserved; content not yet defined |

### In use, not allocated

| Key | Used by | What it holds |
|---|---|---|
| `:grid` | Covia venues | Venue state: per-venue signed records of assets, storage, users and their workspaces |
| `:dlfs` | Covia venues | Per-user DLFS drives, overlapping the purpose of `:fs` |

These keys appear at the root of the lattice Covia venues host. They are recorded here so they are not reused; whether each is allocated, moved under `:app`, or merged into an existing region is for the Foundation to decide.

## Reference Implementation

| Root | Regions | Class |
|---|---|---|
| Core root | `:data`, `:fs`, `:kv`, `:queue`, `:p2p`, `:local` | `Lattice.ROOT` in `convex.lattice` (convex-core) |
| P2P infrastructure | `:p2p`, `:id`, `:kad` | `P2PLattice.ROOT` in `convex.p2p` (convex-p2p) |
| P2P node default | the P2P infrastructure regions and `:social` | `P2PLattice.NODE_ROOT` in `convex.p2p` |
| Covia venue | `:grid`, `:dlfs` | `Covia.ROOT` in `covia.lattice` (Covia) |

Region keywords are defined with the region's lattice; core ones are in `Keywords` (`convex.core.cvm`), which also defines `:app`.

## See Also

- [CAD024: Data Lattice](../024_data_lattice/index.md) — the root lattice and how regions merge
- [CAD036: Lattice Node](../036_lattice_node/index.md) — hosting and replicating regions
- [CAD045: Lattice Applications](../045_lattice_apps/index.md) — application regions under `:app`
