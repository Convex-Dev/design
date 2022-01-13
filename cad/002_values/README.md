# CVM Values

Convex depends on a consistent representation of information values that are used within the CVM and Convergent Proof Of Stake Consensus.

## General  Principles

### Immutability

All CVM values MUST be **immutable**. 

This restriction is necessary from the perspective of maintaining the integrity of the decentralised state. The property of immutability is also helpful from a performance perspective, since it means that CVM values can be safely cached and used in structural sharing of composite data structures.

### Structural Sharing

All CVM values which are data structures MUST support structural sharing of subcomponents if they have greater than `O(1)` size. 

This ensures that we can offer better than `O(n)` performance bounds for reads and updates of immutable structures (i.e. avoiding copy-on-write costs). Typically these costs should be either `O(1)` or `O(log n)` for most operations.

This also ensures that Peers can safely store multiple versions of large data structures with minor changes while only incurring storage requirements that scale with the size of the changes. This is particularly important for Beliefs and Block Orderings, which may grow very large over time.

### Canonical Encoding

All CVM values MUST have a unique canonical **Encoding** as a fixed length sequence of bytes. See [Encoding](encoding.md) for full specification.

CVM values are **defined to be equal** if and only if their Encoding is identical.

### Value ID

Each unique CVM value is defined to have a **Value ID** that is equal to the SHA3-256 hash of the value's Encoding.

The Value ID is important, since it makes it possible to refer to Values using a relatively small fixed-length reference type. 

## Types

### Primitive Types

#### Long

#### Double

#### Byte

#### Character

#### Address

#### Blob

#### String

#### Symbol

#### Keyword

### Collection Types

The CVM defines a number of persistent, immutable collection types.

#### Vector

#### List

#### Map

#### Set

### Record Types

Records are specialised data structures that implement a defined sequence of fields.

Records behave like Maps when accessed using their field names as keys mapped to the corresponding field values. If updated, errors may occur if the update is inconsistent with the requirements on field values (e.g. attempting to put a value of the wrong Type into a field..

#### Block

#### Account

#### Peer

#### Order

#### State

### Transaction Types

Transaction types represent instructions to Convex that can be submitted by external Clients.

#### Call

#### Invoke

#### Transfer

## Implementation notes

### Equivalent host values

Implementations MAY make use of different host types to represent the same CVM values, subject to the condition that they MUST respect canonical encodings, Value IDs and Value  identity rules.

The use of such different types MUST NOT result in CVM behaviour change, i.e. the distinction should not be visible to external observers.

This allowance is intended mainly to permit performance optimisations, where specialised types can be used to represent CVM values in appropriate circumstances.
