# Encoding Format

## Overview

Convex implements a standard **Encoding** format that represents any valid Convex data Values as a **sequence of bytes**. Encoding is an important capability for Convex because:

- It allows Values to be efficiently **transmitted** over the network
- It provided a standard format for **durable data storage** of Values
- It enables the definition of a cryptographic **Value ID** to identify any Value as a "decentralised pointer", which also serves as the root of a Merkle DAG that is the Encoding of the complete Value.

The Encoding model breaks Values into a Merkle DAG of one or more **Cells** that are individually Encoded. Cells are immutable, and may therefore be safely shared by different Values, or used multiple times in the the same DAG. This technique of "structural sharing" is extremely important for the performance and memory efficiency of Convex. 



## Basic Rules

### Cells

The fundamental entities that are encoded are called Cells.

Cells may contain other Cells by Reference, and therefore a top-level Cell can be regarded as a directed acyclic graph (DAG). Since Cell Encodings contain cryptographic hashes of the Encodings of any externally Referenced  Cells, this is furthermore a Merkle DAG.

### Encoding

The Encoding MUST be a sequence of bytes.

Any given Cell MUST map to one and only one Encoding. 

Any two distinct (non-identical) Cell MUST map to different Encoding

It MUST be possible to reconstruct the Cell from its own Encoding, to the extent that the Cell represents the same Value (it is possible for implementations to use different internal formats if desired, providing these do not affect the CVM Value semantics)

The Encoding MUST have a maximum length of 8191 bytes. This ensure that an Encoded Cell will always fit within a reasonable fixed size buffer, and guarantees that most operations on Cells are `O(1)` complexity.

### Value ID

The Value ID of a Cell is defined to be the unique SHA3-256 hash of the Encoding of the Cell.

Since all Cells have a unique Encoding in bytes, they therefore also a unique Value ID (subject the the assumption that the probability of SHA3-256 collisions is extremely low).

A Reference may be considered as a "decentralised pointer" to an immutable Value. 

### References 

A Cell Encoding MAY contain a Reference to another Cell. There are two types of Reference:

- Embedded, there the Embedded Cell's Encoding in included in the parent Cell Encoding 
- External, where a Reference is encoded by a byte sequence that includes the Value ID of the referenced Cell. 

From a functional perspective, the difference between an Embedded Cell and a External Cell is negligible, with the important exception that following an External Reference will require accessing a separate Encoding (typically cached in memory, or if necessary loaded from storage).

From a performance perspective however, this distinction is extremely important:

- It allows multiple Values to be included in the Encoding of a single Cell. For example a small Vector like `[1 2 3 4 5]` will be Encoded within a single top level Cell Encoding, with the individual element values being Embedded.
- It reduces the number of SHA3-256 hash operations that need to be performed, since typically these need only be computed on non-embedded Cells.
- It reduces the overall number of nodes in Merkle DAGs of Cells, reducing the number of individual calls to network and storage functionality.

#### Embedded References

A Cell may be defined as Embedded in which case a Reference to the Cell will be encoded by inserting the Encoding of the Cell into in the Encoding of the containing Cell.

If a Cell is Embedded, it MUST NOT be included in the Encoding of another Cell by External Reference. This restriction is required to guarantee uniqueness of Encoding (if not enforced, child Cells might be Encoded as either an Embedded Reference or by External Reference, thus giving two different Encodings).

An Embedded Cell MUST have an Encoding of 140 bytes or less. This restriction helps ensure that Cell encodings which may contain many child Embedded References cannot exceed the overall 8191 byte limit. 

#### External References

An External Reference is a Reference to a Cell that is not Embedded. 

An External Reference MUST be encoded using the Value ID of the target Cell. This requirement ensures the integrity of a complete Merkle DAG of Cells.

### CVM Values

Many Cells represent valid CVM values, i.e. are permitted as first class values in the Convex Virtual Machine. 

Not all Cells represent true CVM values, since Cells may also be used for internal data structures within larger CVM values, or represent values that are only used outside the CVM.


### Valid and Invalid Encodings

A sequence of bytes is a Valid Encoding is there exists a Cell which produces the same sequence of bytes as its Encoding. Conversely, a sequence of bytes is an Invalid Encoding if there is no Cell which produces the same sequence of bytes as its Encoding.

Implementations MUST be able to reconstruct a Cell from any Valid Encoding.

Implementations MUST recognise an Invalid Encoding, and in particular:

- Implementations MUST recognise an Invalid Coding if the byte sequence contains additional bytes after the end of a Valid Encoding
- Implementations MUST recognise an Invalid Encoding if the byte sequence terminates before enough bytes are obtained to complete a Valid Encoding 

Implementations MUST be able to produce the unique Valid Encoding for any Cell.

### Cell life-cycle

Cells may be constructed in 3 ways:
- Created during local processing
- Received as external input and decoded (will already have encoding)
- Loaded from storage (will have encoding, hash, and storage flags)

## Encoding Format

### Tag Byte

The first byte of the Encoding is defined to be the Tag, which designates the type of the data value, and determines how the remainder of the Encoding should be interpreted.

Implementations MUST reject an Encoding as Invalid if the Tag byte is not recognised as one defined in this document.

### VLC Integers

Integers are normally encoded using a Variable Length Coding (VLC) format. This ensure that small integers have a 1-byte Encoding, and most 64-bit values encoded will have an encoded length shorter than 8 bytes, based on the expected distributions of 64-bit integers encountered in the system.

Encoding rules are:
- The high bit of each byte is `1` if there are following bytes, `0` for the last bytes.
- The remaining bits from each byte are considered as a standard big-endian two's complement binary encoding.
- The highest two's complement bit (i.e. the 2nd highest bit of the first byte) is considered as a sign bit.
- The Encoding is defined to be the shortest possible such encoding for any given integer.

It should be noted that this system can technically support arbitrary sized integers, but in most contexts in Convex it is used for 64-bit Long values.

### `0x00` Nil

The single byte `0x00` is the Encoding for  `nil` Value.

### `0x01` Byte

```
Encoding:
0x01 <Byte>

Where:
- <Byte> is a single byte value
```

A Byte Value is representation naturally, with the byte value following the Tag byte `0x01`.

### `0xb0` - `0xb1` Boolean

```
Encoding:
0xb0 <=> false
0xb1 <=> true
```

The two Boolean Values `true` or `false` have the Encodings `0xb1` and `0xb0` respectively. 

Note: These Tags are chosen to aid human readability, such that the first hexadecimal digit `b` suggests "binary" or "boolean", and the second hexadecimal digit represents the bit value.  

### `0x10` - `0x18` Long

```Encoding
0x1n <n bytes of numeric data>
```

A Long Value is encoded by the Tag byte followed by `n` bytes representing the signed 2's complement  numeric value of the Long. The Long must be represented in the minimum possible number of bytes (can be 0 additional bytes for the specific value `0`).

### `0x19` Integer (BigInt)

```Encoding
0x19 <VLC Length of Integer = n> <n bytes of data>
```

An Integer is represented by the Tag byte followed by the VLC encoded length of the Integer in bytes. 

The length MUST be at least `9` (otherwise the integer MUST be encoded as a Long).

With the eception of the Tag byte, The encoding of an Integer is defined to be exactly equal to a Blob with `n` bytes.

### `0x0c` Character

```Encoding
0x0c <2 Byte UTF16>
```

A Character Value is encoded by the Tag byte followed by 2 bytes representing a standard UTF16 Character. All 16-bit values are considered valid by the CVM, it is the responsibility of the application to interpret Characters.

Note: A switch to UTF8 is being considered, see: https://github.com/Convex-Dev/convex/issues/215

### `0x0d` Double

```Encoding
0x0d <8 bytes IEEE 764>
```

A Double Value is encoded as the Tag byte followed by 8 bytes standard representation of an IEEE 754 double-precision floating point value.

### `0x20` Ref

```Encoding
0x20 <32 bytes Value ID>
```
A Reference is Encoded as the Tag byte follwed by the 32-byte Value ID (which is in turn defined as the SHA3-256 hash of the Encoding of the referenced Value).

Refs Encodings are special for a number of reasons:
- They are not themselves Cell Values, rather they represent a Reference to a Cell
- They MUST be used as substitutes for child Values contained withing other Cell Encodings, whenever the child is not Embedded

### `0x21` Address

```Encoding
0x21 <VLC Long>
```

An Address Value is encoded by the Tag byte followed by a VLC Encoding of the 64-bit value of the Address. 

Since Addresses are allocated sequentually from zero (and Accounts can be re-used), this usually results in a short Encoding.

### `0x30` String

```Encoding
If String is 4096 UTF-8 bytes or less:

0x30 <VLC Length = n> <n bytes UTF-8 data>

If String is more than 4096 Bytes:

0x30 <VLC Length = n> <Child String Value>(repeated 2-16 times)
```

Every String Encoding starts with the Tag byte and a VLC-encoded length.

Encoding then splits dpeending on the String length `n`.
- If 4096 characters or less, the UTF-8 bytes of the String are encoded directly (`n` bytes total)
- If more than 4096 bytes, the String is broken up into a tree of child Strings, where each child except the last is the maximum sized child possible for a child string (1024, 16384, 262144 etc.), and the last child contains all remaining characters. Up to 16 children are allowed before the tree must grow to the next level.

Because child strings are likely to be non-embedded (because of Encoding size) they will usually be replaced with Refs (33 bytes length). Thus a typical large String will have a top level Cell Encoding of a few hundred bytes, allowing for a few child Refs and a (perhaps Embedded) final child. 

Importantly, this design allows:
- Arbitrary length Strings to be encoded, while still keeping each Cell Encoding within a fixed size
- Structural sharing of tree nodes, giving O(log n) update with path copying
- Relatively low overhead, because of the high branching factor: not many branch nodes are required and each leaf note will compactly store 1024 characters.

Note with the exception of the Tag byte, String encoding is exactly the same as a Blob

### `0x31` Blob

```Encoding
If Blob is 4096 bytes or less:

0x31 <VLC Length = n> <n bytes>

If Blob is more than 4096 bytes:

0x31 <VLC Length = n> <Child Blob Value>(repeated 2-16 times)
```

Every Blob Encoding starts with the Tag byte and a VLC-encoded Long length.

Encoding then splits dpeending on the Blob length `n`.
- If 4096 bytes or less, the bytes of the Blob are encoded directly (`n*2` bytes total)
- If more than 4096 byte, the Blob is broken up into a tree of child Blobs, where each child except the last is the maximum sized child possible for a child Blob (4096, 65536, 1048576 etc.), and the last child contains all remaining Bytes. Up to 16 children are allowed before the tree must grow to the next level.

Because child Blobs are likely to be non-embedded (because of Encoding size) they will usually be replaced with Refs (33 bytes length). Thus a typical large Blob will have a top level Cell Encoding of a few hundred bytes, allowing for a few child Refs and a (perhaps Embedded) final child. 

Importantly, this design allows:
- Arbitrary length Blobs to be encoded, while still keeping each Blob Encoding within a fixed size
- Structural sharing of tree nodes, giving O(log n) update with path copying
- Relatively low overhead, because of the high branching factor: not many branch nodes are required and each leaf note will compactly store 4096 bytes.

### 0x32 Symbol

```Encoding
0x32 <VLC Length = n> <n bytes UTF-8 String>
```

A Symbol is Encoded with the Tag byte, a VLC Symbol length `n`, and `n` bytes of UTF-8 encoded characters.

The Symbol must have a length of 1-64 UTF-16 characters (TODO: may change to UTF-8)

### 0x33 Keyword

```Encoding
0x32 <VLC Length = n> <n bytes UTF-8 String>
```

A Keyword is Encoded with the Tag byte, a VLC Symbol length `n`, and `n` bytes of UTF-8 encoded characters.

The Keyword must have a length of 1-64 UTF-16 characters (TODO: may change to UTF-8)

### 0x80 Vector

```Encoding
If a Leaf Count:

0x80 <VLC Count = n> <Prefix Vector> <Value>(repeated 0-16 times)

If a non-Leaf Count:

0x80 <VLC Count = n> <Child Vector>(repeated 2-16 times)
```

A Leaf Count `n` is defined as 0, 16, or any other positive integer which is not an exact multiple of 16.

A Vector is defined as Packed if its Count is `16 ^ level`, where `level` is any positive integer. Intuitively, this represents a Vector which has the maximum number of elements before a new level in the tree must be added.

All Vector Encodings start with the Tag byte and a VLC Count of elements in the Vector.

Subsequently:
- For Leaf Vectors, a Prefix Vector is Encoded (which may be `nil`) that contains all elements up to the highest multiple of 16 less than the Count, followed by the Values
- For non-Leaf Vectors, Child Vectors are encoded where each child is the maximum size Packed Vector less than Count in lenth, except the last which is the Vector containing all remaining Values.

This Encoding has some elegant properties which make Convex Vectors particularly efficient in regular usage:
- Short Vectors (0-16 Count) are always encoded in a single Cell, which may require no further Cell encodings in the common case that all elements are Embedded.
- The last few elements of the Vector are usually in a Leaf Vector, which allows `O(1)` access and update to Elements
- Append is always `O(1)` (since either it is a Leaf Vector, or the append creates a new Leaf Vector with the origibal Vector as its Prefix)
- Generally, access and update is O(log n) with a reasonably high branching factor

### TODO: More tags

## Implementation Notes

In the Convex JVM implementation, Cells are represented by subclasses of the class `convex.core.data.ACell`. Having a common abstract base class if helpful for performance, allows for convenient implementation of common Cell functionality, and ensures that all Cell instances are designed to work with a common abstract interface.

The JVM `null` value is interpreted as the Convex `nil` Value. This is an implementation decision, chosen for efficiency and performance reasons. However there is no strict requirement that `nil` must be represented this way (for example, it could alternatively be a singleton value). 
