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

It must be possible to reconstruct the Cell from its own Encoding.

The Encoding MUST have a maximum length of 8191 bytes. This ensure that an Encoded value will always fit within a reasonable fixed size buffer.

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

## Encoding Format

### Tag Byte

The first byte of the Encoding is defined to be the Tag, which designates the type of the data value, and determines how the remainder of the Encoding should be interpreted.

Implementations MUST reject an Encoding as Invalid if the Tag byte is not recognised as one defined in this document.

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

A Boolean values `true` or `false` have the Encodings `0xb1` and `0xb0` respectively. 

Note: These Tags are chosen to aid human readability, such that the first hexadecimal digit `b` suggests "binary" or "boolean", and the second hexadecimal digit represents the bit value.  

### TODO: More tags

## Implementation Notes

In the Convex JVM implementation, Cells are represented by subclasses of the class `convex.core.data.ACell`. Having a common abstract base class if helpful for performance, allows for convenient implementation of common Cell functionality, and ensures that all Cell instances are designed to work with a common abstract interface.

The JVM `null` value is interpreted as the Convex `nil` Value. This is an implementation decision, chosen for efficiency and performance reasons. However there is no strict requirement that `nil` must be represented this way (for example, it could alternatively be a singleton value). 
