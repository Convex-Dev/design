# CAD045: Lattice Applications

## Overview

Lattice applications implement domain operations over the immutable values and
merge semantics defined in [CAD024](/docs/cad/data_lattice). Components are the
normal implementation mechanism: they bind domain behaviour, policy, incoming
delivery and publication to a cursor at a chosen path.

## Scope

This CAD specifies **application implementation and composition**. CAD024 defines
abstract lattice semantics; [CAD038](/docs/cad/lattice_auth) defines signed
ownership rules. Abstract lattice definitions remain useful specifications and
reusable implementations. Applications SHOULD normally compose components that
use those definitions, rather than reimplement standard merges or depend on
cursor navigation to discover application policy.

[CAD035](/docs/cad/cursors) defines the storage mechanisms components use.
[CAD036](/docs/cad/lattice_node) defines replication, and
[CAD053](/docs/cad/lattice_regions) allocates shared region names. These concerns
do not require one global lattice object or one publication boundary.

## Specification

### Application Architecture

| Part | Responsibility |
|---|---|
| Domain component | Domain operations, incoming merge policy and a chosen publication boundary |
| Lattice definition | Value semantics, validation and reusable merge functions |
| Cursor | Atomic storage, projection and reconciliation using supplied functions |
| Host | Published state, delivery to configured applications and optional persistence |
| Node infrastructure | Network transport and replication of published state |

A component MUST affect only its supplied destination on publication. If it owns
an aggregate, its merge policy MUST handle the whole aggregate correctly. A
component managing only `[:region :a]` SHOULD be bound at that path. Merely giving
a root-bound component a partial lattice does not narrow its publication scope.

Components may delegate merge to lattices or implement domain-specific policy
consistent with the served region's semantics. Lattice definitions MUST NOT own
cursors or application lifecycles.

### Region composition

Named regions SHOULD normally be implemented by a collection of child components.
Whole-value and path deliveries MUST apply the same child policy. Unknown regions
are ignored on delivery; publication MUST preserve unrelated destination paths,
including their concurrent updates or removal. An empty collection is a no-op.

Each child publishes only at its own boundary. Publication across independent
children is not implicitly atomic. Applications requiring an atomic aggregate
MUST use a component whose boundary contains that aggregate.

An application MAY construct its children or accept existing components. Sharing
an instance shares its pending state and publication destination; registration
MUST NOT rebind it or replace its policy. Separate staged instances instead have
independent working state and reconcile on publication.

The Java implementation supplies `AKeyedRegions`, `Regions` and `SingleRegion`.
Registrations are fixed by the first merge, path delivery or sync. Components may
be nested in regions without synthesising a lattice tree from their classes.

### Lattice Design

#### Composition from Primitives

Applications SHOULD compose their lattice hierarchy from the standard lattice types defined in [CAD024](/docs/cad/data_lattice):

| Primitive | Merge Semantics | Zero | Use Case |
|-----------|----------------|------|----------|
| **LWW Lattice** | Higher timestamp wins | `nil` | Mutable registers (profiles, individual records) |
| **Index Lattice** | Union of keys, child merge per entry | Empty Index | Ordered collections (feeds, logs, time-series) |
| **Map Lattice** | Union of keys, child merge per entry | Empty Map | Unordered collections (follow lists, metadata) |
| **Set Lattice** | Set union | Empty Set | Grow-only memberships (tags, permissions) |
| **Owner Lattice** | Per-owner merge with signer authorisation and signature verification | Empty Map or Index | Per-owner namespaces |
| **Signed Lattice** | Verify envelope; select an input or authorise a signed payload merge | `nil` | Cryptographic ownership enforcement |
| **Keyed Lattice** | Per-key dispatch to distinct child lattices | Empty Index | Root-level sections with heterogeneous children |

Composition reads bottom-up from the data model. For example, a social feed is an ordered collection of posts where each post uses last-write-wins for edits:

```
Feed = IndexLattice(LWWLattice)
       ↑ union of posts    ↑ per-post conflict resolution
```

#### Custom Lattice Types

A custom lattice definition is appropriate when the data needs a reusable merge
rule. Multiple named children alone do not require one: a region collection can
dispatch to components with their own rules.

Definitions expose merge, validation, zero values and any declared child shape
as specified by CAD024. In Java these are represented by `ALattice`, including
`merge`, `checkForeign`, `zero` and `path`. A component may use the declared shape
to construct a correctly typed projection; the lattice itself creates no cursors.

An abstract expression such as `OwnerLattice(SignedLattice(ProfileLattice))`
describes the data and merge rules. It does not prescribe a component class for
each layer or require automatic navigation through a signed envelope.

#### Merge Properties

Every custom merge function MUST satisfy the merge properties defined by CAD024:

- **Commutativity up to tie preference**: swapping operands produces the same
  result whenever their ordering priority differs; exact ties retain `own`
- **Associativity**: `merge(merge(a, b), c) = merge(a, merge(b, c))`
- **Idempotence**: `merge(a, a) = a`

Violation of associativity or idempotence causes order-dependent or unstable state.
The documented own-value tie preference is intentional: two peers with distinct
equal-priority values may each retain their current value until a later non-tied
update resolves the conflict.

Applications SHOULD normally use the standard own/current preference when timestamps
are equal. A custom lattice MAY instead define a canonical symmetric tiebreaker when
its domain requires immediate convergence of independently produced equal-time values.

Merge MUST handle absent values. The identity laws apply to valid, authorised inputs; an empty destination MUST NOT bypass foreign-value validation or owner verification.

#### Zero Values and Container Types

A lattice's zero MUST have the correct container type for that level. Components
may use it to construct missing state atomically on a changed write. Construction,
navigation and reads MUST NOT mutate state. Plain update functions receive actual
nil values; application code or an explicit projection handles initialisation.

#### Lattice Continuity

A declared lattice tree ends where its child lookup returns nil. Components may
compose separately declared boundaries, so their object graph need not be one
continuous lattice tree. An incoming path cannot use such composition to bypass
a signing boundary: a complete signed envelope is required at its slot.

### Self-Sovereign Data

#### Owned collections

Applications with per-owner signed data SHOULD use an owned-map component. It
holds the map's working state, its value lattice and its authorisation rule.
Owners may be public keys, addresses or DIDs. The map key identifies the owner;
the public key in the envelope identifies the signer. CAD038 defines which
signers may author values for that owner.

The Java implementation provides `OwnedMap` for hash maps, `OwnedIndex` for index
keys, and `KeyOwnedIndex` for public-key equality. `AOwnedMap` supplies their common
behaviour. Indirect identities require an explicit verifier supplied by the
component, commonly backed by locally available resolver data. Signing context
cannot replace this rule. The same rule governs whole-map delivery, owner-path
delivery and authoring.

Owned-map constructors take no signing context. Their incoming merges and
publication conflicts use public information only: signatures, owner verification
and the payload merge rule. They preserve selected envelopes and retain their
established value if payload merging would require a new signature. Installing a
context on the containing collection MUST NOT introduce implicit signing.

#### Signing Boundary

Domain components SHOULD extend `ASignedComponent` when edits should be signed
immediately. Applications construct them directly with a signed storage path,
the owner-bound rule and a signer function `V -> SignedData<V>`, commonly
`user::signData`. The base exposes an unsigned cursor for domain operations and
handles validation, signing and incoming envelope merges. Repeated components
at the same path share working state. The same supplied function governs local
edits and any re-signing; it may resolve keys dynamically when called. It is not
implicitly inherited from a containing map or host. Changing available keys
cannot replace the bound owner rule. No signing context or generic view factory
is required.

The signing boundary MUST check that a signer result contains exactly the
requested payload, a valid signature and an authorised public key. A null result
means signing is unavailable. Local edits and draft publication then fail without
changing the destination; merge synthesis retains the established envelope. An
incorrect payload or invalid signature MUST be rejected before storage. Unchanged
writes and selection of an existing envelope do not invoke the signer.

The Java `SignedLattice.merge(own, other)` operation never signs. Authoring uses
`sign(value, signer)` or explicitly permits synthesis with
`mergeAndSign(own, other, signer)`. Context overloads remain for legacy callers.

An owned map's `path(owner)` supplies the signed slot and creates a missing map
only on the first changed write. A plain cursor path also suffices when the
containing map already exists. Navigation itself neither signs nor grants
authority. A live signed component's sync does not publish its containing map.

An independent `SignedComponent` draft keeps unsigned edits private until its
own sync signs and publishes into its supplied destination. If that destination
is an owned map's working state, the map must subsequently publish outward.
The map's `draft(owner, signer)` helper requires an explicit signer function.
Opening a view or draft creates no entry. Map sync MUST NOT implicitly publish
outstanding drafts. Path navigation alone MUST NOT manufacture signing authority.

#### Local Trust vs Network Verification

Incoming envelopes MUST pass the CAD038 checks before acceptance. Standard local
authoring MUST use the same ownership rule and the value lattice's validator.
Raw cursor access remains an operator-controlled escape hatch; it is not an
authorisation mechanism. Selecting a received envelope preserves its signature;
synthesising a new value requires an authorised signer.

### Cursor Patterns

#### The Wrapper Pattern

A domain component binds a supplied working cursor at its own level and exposes
domain verbs. Ordinary cursor-binding constructors MUST NOT create another fork.
Components MAY offer explicit staged construction over a host or signed
destination. Wrappers bound to the same fork share its publication boundary;
ordinary roots, paths and transformed views have no independent publication step.
Existing children retain their supplied policy; components explicitly configure
new children rather than inheriting policy through cursor parent links.

A component MAY implement a protected `rebind(cursor)` hook to reconstruct its
domain operations over supplied working storage. Rebinding MUST preserve the
component's configuration and recreate mutable child views against that storage.
It MUST NOT fork the supplied cursor or retain child views bound to the original
storage. Component `fork()` uses this hook with a fork of its bound storage.
Containers managing independently staged children need not support rebinding.

The bound storage defines the component's publication boundary. Its `cursor()`
accessor MAY expose an editing view, such as timestamping, without moving that
boundary. Component sync MUST use bound storage rather than searching through
editing views for an enclosing fork. Its result is the bound value, which may be
nil even when the editing view supplies a default. In Java, transaction adapters
may delegate `withCursor(cursor)` to the same protected rebinding hook.

#### Writing Data

Components SHOULD use atomic update functions for read-modify-write operations.
They MUST supply correct container construction where missing state is permitted.
Generic associative writes MUST NOT silently create a different container type
or write through a signed envelope. Signing and stamping views are constructed
explicitly by components as described in CAD035.

#### Reading Data

Reads return actual state, including nil for absent values. A region collection's
cursor shows its destination; pending edits are read through its staged children.

#### Fork and Sync

A staged component's sync supplies its reconciliation policy to its bound fork
and reconciles one working snapshot into the destination, stopping at that cursor. It MUST NOT implicitly publish enclosing state or persist
a host. Concurrent edits may require retries; signing, validation or storage
failure may prevent publication. Applications requiring one atomic multi-step
edit may use a transaction over an enclosing component's working state.

#### Connecting to Node Infrastructure

Applications are assembled over a host and configured before node launch. The
host delegates incoming roots and paths to the configured application components.
Receipt does not by itself publish staged edits. Application publication updates
the host's state; host persistence and replication publication are separate steps.
This permits the same component to run over an in-memory host for tests or a
store-backed host served by a node, without giving the node domain merge policy.

### Data Model

#### Record Design

Applications using LWW Lattice for conflict resolution MUST include a `:timestamp` field in every record. The default LWW merge function extracts the timestamp from this field to determine the winner.

Applications SHOULD use Keyword keys for record fields. Keywords are interned, compact, and provide fast comparison.

#### Timestamped Components

The standard Java `Timestamped` component combines local timestamping with
whole-record ordering. `Timestamped.create(storage, getTimestamp)` uses hash-map
records with a `CVMLong` `:timestamp` field. Its shared `Timestamped.lattice()`
selects the higher timestamp, retaining the own/current record on a tie, and
rejects records without a valid timestamp. Custom record representations may
supply their own ordering lattice and stamping function.

`cursor()` supplies the local editing view, implemented by `StampedCursor`.
Changed descendant edits stamp the enclosing record atomically, using one clock
reading across retries. Unchanged writes MUST preserve existing timestamps.
Incoming merges use the underlying storage and MUST NOT re-stamp the selected
record. Delivery supplies a complete record, not a partial path beneath it.

This wrapper creates no independent working copy or publication boundary. An
enclosing staged component uses the same ordering for publication conflicts.
When composed inside a signed owner record, local edits stamp before signing;
incoming delivery verifies and selects complete signed envelopes through the
owner-bound rule using that same payload ordering. The winning envelope retains
its original signature. Clearing the whole record to nil is not a replicated
tombstone; a stamped record can represent deletion of its contents.

#### Ordered Collections

Applications that need chronological ordering (feeds, logs, event streams) SHOULD use Index with blob keys encoding the timestamp in big-endian format. Big-endian encoding ensures lexicographic blob ordering matches chronological ordering.

#### Tombstone Deletion

Under a union-based merge, removing an entry from one replica does not remove it from others; a later merge can restore it.

Applications using a union merge MUST represent deletion with a tombstone or another explicit removal rule. A whole-value LWW register may instead publish a newer value with the entry removed, as specified in CAD024. Container shape alone does not determine deletion semantics.

When tombstoning, applications MUST update the `:timestamp` field so that the tombstoned version wins over older non-deleted versions via LWW merge.

#### Container Choice

| Need | Container | Reason |
|------|-----------|--------|
| Lattice-level containers (where `path()` and `zero()` matter) | `Index` | Sorted, JSON-compatible key resolution, correct `zero()` type |
| Leaf records (post data, profile fields) | Hash Map | Efficient for small unordered maps |
| Dynamic key sets (follow lists) | Hash Map | Hash-based, unordered |
| Ordered sequences (feeds, logs) | `Index` with blob keys | Lexicographic ordering |
| Single mutable values | Direct value with LWW Lattice | Simple register semantics |

Applications SHOULD prefer `Index` for lattice-level containers and `AHashMap` for leaf data records. `Index` resolves `Keyword` and `AString` identically (same blob comparison), which matters for JSON interoperability.

### Registration

The root Keyed Lattice holds two kinds of section: ecosystem regions directly under the root, and application regions under `:app`.

#### Ecosystem Regions

Sections directly under the root are ecosystem-owned and allocated by the Convex Foundation. A root region is typically a facility that many applications can use, such as storage (`:fs`, `:kv`), peer-to-peer co-ordination (`:p2p`) or a social graph (`:social`). [CAD053: Lattice Regions](/docs/cad/lattice_regions) is the official list: each region's key, its status, and where its data representation is defined, so every application that uses it agrees on what its data means. Which regions an application merges, and how, is for the application; it ignores data it does not understand or serve.

An application MUST NOT register a section of its own directly under the root. An application that uses a facility reads and writes that facility's region, through the facility's components, under the rules its definition sets.

The abstract composition of the ecosystem regions a node hosts can be written as follows (notation, not a required API):

```
root = Lattice.ROOT.addLattice(:social, socialLattice)
```

#### Application Regions

State that belongs to a single application MUST be registered under `:app`, a Keyed Lattice whose keys are application names and whose children are each application's own lattice:

```
apps = KeyedLattice(:myapp, myAppLattice)
root = Lattice.ROOT.addLattice(:app, apps)
```

The application's state is then found at `[:app <name> ...]`. An application name is a Keyword chosen by the application, not allocated by the Foundation, and SHOULD be distinctive enough not to collide with other applications a node might host.

`:app` composes as the root does, one level down. A node registers the applications it hosts; on merge, an application it does not know is ignored and one it already holds is retained, so hosting one application never requires hosting another, and adding an application never requires a new root region.

These expressions describe semantic composition. Implementations normally assemble the corresponding region components under the host, using the same names and merge rules; no monolithic root lattice object is required. The allocation rules concern the shared ecosystem namespace, not arbitrary keys inside an isolated application test fixture.

### Testing

#### Unit Tests

Applications SHOULD test domain operations in standalone mode (own cursor, no node infrastructure). This verifies application logic in isolation.

#### Integration Tests

Applications SHOULD test each explicit publication boundary and then delivery through a node. Staged edits must remain private until published, and publication must preserve unrelated paths.

#### Fork/Sync Tests

Applications SHOULD test that forked changes are invisible until sync, and that sync correctly merges changes back.

#### Multi-User Tests

Applications with per-user data SHOULD test that different users' state is independent and does not interfere.

#### Adversarial Tests

Applications using Owner Lattice MUST include adversarial tests that verify forgery rejection. These tests SHOULD:

1. Construct forged state at the raw data level (data signed by key A placed under key B's owner slot)
2. Deliver it through the application component, both in a whole map and directly at the owner path
3. Assert that the forgery is rejected and the legitimate data survives

This tests the [authentication boundary](/docs/cad/lattice_auth) that protects self-sovereign data in production.

## Reference Implementation

The reference implementation is provided in the Convex `convex-core` and `convex-social` Java modules.

### Core Classes

| Concern | Java classes in `convex.lattice` |
|---|---|
| Component base and ordinary lattice-backed component | `ALatticeComponent`, `LatticeComponent` (concrete) |
| Named region composition | `AKeyedRegions`, `Regions`, `SingleRegion` |
| Owned collections | `AOwnedMap`, `OwnedMap`, `OwnedIndex`, `KeyOwnedIndex` |
| Independent unsigned draft with signed publication | `SignedComponent` |
| Published state and delivery | `LatticeHost` |
| Explicit component capabilities | `LatticeContext` |
| Reusable abstract value semantics | `ALattice` and `convex.lattice.generic` implementations |

CAD035 lists the cursor mechanisms these classes use. A named abstract lattice
in a region specification need not correspond to an application superclass.

### Executable application examples

The local `convex-core/src/test/java/convex/lattice/app` testbed contains favourites
using `KeyOwnedIndex`, DID-keyed scores using `OwnedIndex` with a supplied resolver,
a signed notebook, and a transactional task-board aggregate. These exercise
component composition, shared state and explicit publication without a node.
Production domain modules may migrate independently while preserving their
region's abstract merge and authorisation rules.

The implementation guide is `convex-core/docs/LATTICE_APPLICATIONS.md` in the
Convex repository. These examples demonstrate the component API; they do not
allocate new shared root regions.

## See Also

- [CAD024: Data Lattice](/docs/cad/data_lattice) — Lattice merge foundations and standard lattice types
- [CAD035: Lattice Cursors](/docs/cad/cursors) — Cursor specification and lattice integration
- [CAD036: Lattice Node](/docs/cad/lattice_node) — Networked lattice replication
- [CAD038: Lattice Authentication](/docs/cad/lattice_auth) — Owner verification and signing boundaries
- [CAD053: Lattice Regions](/docs/cad/lattice_regions) — The official list of root regions
- [CAD037: KV Database](/docs/cad/kv_database) — Example lattice application (key-value store)
- [CAD028: DLFS](/docs/cad/dlfs) — Example lattice application (distributed filesystem)
