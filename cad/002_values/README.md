# CVM Values

Convex depends on a consistent representation of information values that are used within the CVM and Convergent Proof Of Stake Consensus. This document describes the values used and key design requirements that specify the available data types in the CVM and Convex Peers / Clients.

## Motivation

Fundamentally, all computing is dependent on the representation of information values (alongside the specification of programs that work with these values). This is particularly important in a decentralised context, where different systems must share and come to consensus over such values. We therefore need a consistent and meaningful definition of all such values.

We want data types for two primary purposes:
- Data on the Convex consensus network as part of the CVM
- Off-chain data in broader decentralised applications (the "Data Lattice")

Functional programming languages such as Clojure, Haskell and Scala have shown the effectiveness of **immutable** values expressed as persistent data structures. This is perhaps best illustrated with a simple example:

```clojure
;; Define a Vector
(def a [1 2 3 4])
=> [1 2 3 4]

;; Define a new Vector appending a new value
(def b (conj a 5))
=> [1 2 3 4 5]

;; Original Vector is unchanged
a
=> [1 2 3 4]
```

These immutable values have some important advantages for a decentralised network:

- Reasoning about code behaviour is easier with immutable values. If a value is immutable, you don't have to worry about concurrent updates. This has important security benefits too: you don't need to remember to perform defensive copies when passing references to other code (e.g. a potentially untrusted smart contract).
- Immutable values **compose** in a simple way that breaks down in the presence of mutable values. A collection of mutable values is conceptually mutable even if the collection itself is immutable, but if all values are immutable then you are guaranteed that any composed data structure is also immutable.
- When internally implemented as trees, persistent data structures have favourable computational complexity bounds, e.g. `O(1)` operations for common copy, update and append operations. Since decentralised systems may frequently operate on large data structures, these are extremely important for performance. A traditional approach using mutable data structures might require `O(n)` operations and memory to perform a copy, for example creating a full immutable snapshot of *any* data structure in Convex is always `O(1)`.
- Cryptographic hashes of immutable values are possible and safe: if values cannot change, neither can their hash. This makes it practical to use immutable values (but not mutable ones!) in data structures such as Merkle DAGs. Hashes can be used to efficiently determine if two entire data structures are identical and/or identify any differences.

## General  Principles

### Sound Definitions

Values (and their corresponding types) MUST have clear logical definitions, ideally corresponding to logical and mathematical constructs.

This is an important principle, since types with simple logical definitions are easier to implement correctly, less likely to require handling of special cases and less likely to require future changes.

### Useful Types

The available set of CVM Values SHOULD represent a generally useful set of data types with the following criteria:

- They should support common programming paradigms and idioms. As far a possible, prefer types that will be familiar to programmers
- They should facilitate the types of code likely to be run on-chain, particularly smart contracts dealing with digital assets
- They should allow for efficient implementation and execution performance
- Keep it simple: we should not have too many types. additional types will not be included without compelling use cases that cannot be adequately supported by existing types

### Immutability

All CVM values MUST be **immutable**. 

This restriction is necessary from the perspective of maintaining integrity of the decentralised state, where values can be identified by a hash of their encoding.

The property of immutability is also helpful from a performance perspective, since it means that CVM values can be safely cached and de-duplicated in memory or storage.

### Structural Sharing

All CVM values which are data structure MUST support structural sharing of sub components if they have greater than `O(1)` size. 

This ensures that we can offer better than `O(n)` performance bounds for reads and updates of immutable structures (i.e. avoiding copy-on-write costs). Typically these costs should be either `O(1)` or `O(log n)` for most operations.

This also ensures that Peers can safely store multiple versions of large data structures with minor changes while only incurring storage requirements that scale with the size of the changes. This is particularly important for Beliefs and their constituent Block Orderings, which may grow very large over time.

### Canonical Encoding

All CVM values MUST have a unique canonical **Encoding** as a fixed length sequence of bytes. See [Encoding CAD](/cad/003_encoding/README.md) for full specification.

CVM values are **defined to be equal** if and only if their Encoding is identical.

### Value ID

Each unique CVM value is defined to have a **Value ID** that is equal to the SHA3-256 hash of the value's Encoding.

The Value ID is important, since it makes it possible to refer to Values using a relatively small fixed-length reference type. 

## Types

### Primitive Types

#### Long

A Long is a 64-bit, signed integer.

Examples:

```clojure
1
-127
9223372036854775807   ;; The maximum Long value
```

Longs are the natural representation of small integer values within a fixed range. They are suitable for representing common concepts such as indices, quantities of items (including digital asset quantities). 

Longs are also used to represent quantities of native Convex Coins (which by the definition of the 10^18 max supply cap, are guaranteed to fit in 64 bits and not overflow when value quantities are added or subtracted).

#### Double

A Double is a 64-bit double precision floating point value as defined in the IEEE 754 standard.

Examples:

```clojure
1.0
-3.4e-20
##NaN
##Inf
```

Doubles are suitable for many applications that need to represent numerical values that can be very large or very small, but do not need to maintain absolute precision beyond a certain number of decimal places. 

While the lowest bits of precision may be lost, Double computations are still deterministic.

Doubles support some special values as per the IEEE 754 standard: Positive infinity, negative infinity, negative zero and NaN (not a number).

#### Byte

A Byte is an 8-bit, unsigned integer.

Bytes are suitable for representing small integer values efficiently, such as a small set of flags or short codes. They are also important as the individual elements of Blob data (equivalent to immutable byte arrays)

#### Character

A Character is a Unicode code point expressed as a 32-bit unsigned integer.

A Character can map to 1-4 bytes in UTF-8 encoding. For maximum efficiency, characters in the ASCII range should be used as these will map to a minimal 2-byte Encoding.

#### Boolean

A Boolean type contains only two values `true` and `false`.

In addition to their utility in general purpose programming, `true` and `false` are particularly efficient in the CVM, requiring only 1 byte of Encoding.

When considering truth values in the the CVM, any Value is considered "truthy" of "falsey". `false` and `nil` are the only Values that are considered falsey, all other values are truthy. The reason for this is that it is often useful to directly test for the presence or absence of a value in a conditional expression without converting to Boolean values first, e.g.

```clojure
(if (get {1 :foo 2 :bar} 1) "Found Foo" "No Foo")
=> "Found Foo"
```

#### Address

An Address is an identifier for a Convex Account. 

Examples:

```clojure
#1
#666
```

Addresses are logically equivalent 63-bit positive integers, though they are not intended for use in calculation. Note that Longs could have been used for this purpose, however a specialised Address value type has some additional advantages:

- A separate notation for Addresses makes them more clearly visible in code.
- We can apply additional security validation and prevent some user errors (e.g. getting argument orders wrong and passing an asset quantity instead of an address which might produce unexpected results...)
- The implementation can be made slightly more optimised

#### Blob

A Blob is an immutable sequence of Bytes, with a length up to what can be indexed with a Long.

Examples

```
0x1234                                                                ;; A 2 byte blob
0xd553110223c4e5217221aeab1319942163e57fffd4e89415c057ba031af6a8e0    ;; A very secret network key. Maybe?
0x                                                                    ;; The empty Blob (0 bytes)
```

Blobs are especially useful for storing opaque units of data that may be important to external systems (e.g. client data encodings) as well as cryptographic values such as keys, hashes or verification proofs. While is is possible to manipulate Blobs in CVM code, this is not usually recommended: such handling should normally be done off-chain.

#### String

A String is a sequence of bytes intended to represent the UTF-8 character encoding of text.

Examples:

```
"Hello Convex"
""                ;; The empty string
```

#### Symbol

A Symbol is a identifier used to name things: values stored in an Account environment, or meaningful symbolic values in code.

Example:

```clojure
a
count
hello
```

Symbols are 1-128 byes long, expressed in UTF-8 encoding. 

Symbols have special behaviour when evaluated: they perform a lookup of the value named by the symbol in the current environment. If this behaviour is not desired, they should be **quoted** with `'` to specify that the actual symbol is required, not the referenced value. An example of this usage:

```clojure
(def a 1234)                       ;; Define a in current Account
=> 1234

a
=> 1234                            ;; Symbol lookup is performed

'a
=> a                               ;; No lookup is performed for quoted symbol
```

Internally Symbols *may* contain arbitrary characters (including badly formed UTF-8), but some of these may not read correctly in an off-chain Parser - therefore it is up to users to ensure that the Symbols they define are readable if this is a requirement.

#### Keyword

A Keyword is similar to a Symbol, but generally should be used to specify fields or other meaningfully named categorical values in data structures.

Examples:

```clojure
:foo
:hello
```

Keywords are generally more convenient to use than Symbols as explicit values in user code since they do not need to be quoted.

### Collection Types

The CVM defines a number of persistent, immutable collection types.

#### Vector

A Vector is a fixed length indexed sequence of values.

Examples:

```clojure
[1 2 3 4]             ;; A Vector of Longs
[1 :foo true]         ;; Heterogeneous ector containing a Long, a Keyword and a Boolean
[]                    ;; The empty Vector
```

Vectors are the most natural way of expressing most sequences where array-like behaviour is required. They support Long indexes.

Vectors are particularly efficient when appending to the end of the Vector, which is always an `O(1)` operation. Indexed access and update is also guaranteed to be `O(1)`.

#### List

A List is a fixed length indexed sequence of values ntended to represent CVM code

Examples:

```clojure
(+ 2 3)                          ;; An arithmentic expression
()                               ;; The emplty List
```

Lists have special behaviour when evaluated: They are treated as expressions by the compiler to be executed, where the first element of the List specifies the function to be executed. As with Symbols, you can **quote** a List to prevent immediate evaluation:

```clojure
(+ 2 3)
=> 5                 ;; List is evaluated as an expression

'(+ 2 3)
=> (+ 2 3)           ;; Quoted list is not evaluated
```

Lists are particularly efficient when prepending to the front of the List, which is guaranteed to be an `O(1)` operation. This property is especially useful when constructing code, since a common pattern is to prepend a function to a List of arguments. Lists also guarantee `O(1)` indexed access and update - in this sense Convex Lists are considerably superior to traditional linked lists.

#### Map

A Map is a data structure that maps keys to values. Keys and values may be any valid Value (including other data structures). Examples:

```clojure
{}                     ;; The empty Map
{1 2}                  ;; Map of key 1 to value 2
{:a 1 :b [:foo]}       ;; Map with Keyword keys and heterogeneous value types
```

The map may also be considered as a sequential collection of Map entries, where each entry is a `[Key Value]` Vector. Examples of this usage:

```clojure
(first {1 2})
=> [1 2]
```

Internally, a Map is structured an efficient tree indexed with the the Value ID of values in the Map. All entries will therefore be ordered by the Value ID of Map keys.

#### BlobMap

A BlobMap is a specialised form of Map where the keys are enforced to be Blobs.

BlobMaps have some advantages over regular Maps:

- Entries are sorted according to the Blob keys (taken as unsigned, big-endian integers)
- They support efficient slicing and indexing using Blob keys

BlobMaps can be created using the core function `blob-map`

```
(blob-map)
```



#### Set

A Set is a data structure that contains zero or more values as **members** of the set. 

From a logical perspective, every Value is either present or excluded from the set. For this reason, you can consider a Set as a mapping from any value to the Boolean type. To reflect this, the standard function `get` returns `true` or `false` when used with sets:

```clojure
(get #{1} 1) 
=> true

(get #{1} 2) 
=> false
```

### Record Types

Records are specialised data structures that implement a defined sequence of fields.

Records behave like Maps when accessed using their field names as keys mapped to the corresponding field values. If updated, errors may occur if the update is inconsistent with the requirements on field values (e.g. attempting to put a value of the wrong Type into a field.

#### Block

#### Account

An Account record represents information regarding the current state of an Account. This includes:

| Key                    | Type    | Description |
| ---                    | ----    | ----        |
| :sequence              | Long    | The current sequence number. Next transaction must have this value plus one |


#### Peer

A Peer Record represents the current state of a Peer.

#### Ordering

An Ordering a special record type used by Peers to represent their Belief regarding:

- The sequence of all Blocks
- The current Consensus Point
- The proposed Consensus Point

Orderings are not normally used or accessible in CVM code.

#### State

The State represents a total global State of the CVM. This includes

- All Accounts
- All Peers
- Global settings and status flags
- The Schedule

### Transaction Types

Transaction types represent instructions to Convex that can be submitted by external Clients.

#### Invoke

An `Invoke` transaction is a request to execute some CVM code by a User Account. This is the most general type of transaction: any CVM code may be executed.

#### Call

A `Call` is a transaction requesting the execution of a callable function (typically a smart contract entry point) from a user Account.

Semantically, this is roughly equivalent to using an `Invoke` transaction to do the following:

`(call target-address (function-name arg1 arg2 .... argN)`

`Call` transaction types are mainly intended as an efficient way for user applications to invoke smart contract calls on behalf of the User.


#### Transfer

A `Transfer` is a transaction requesting the transfer of Convex Coins from a User Account to some other Account. 

## Implementation notes

### Equivalent host values

Implementations MAY make use of different host types to represent the same CVM values, subject to the condition that they MUST respect canonical encodings, Value IDs and Value identity rules.

The use of such different types MUST NOT result in CVM behaviour change, i.e. the distinction should not be visible to external observers.

This allowance is intended mainly to permit performance optimisations, where specialised types can be used to represent CVM values in appropriate circumstances.
