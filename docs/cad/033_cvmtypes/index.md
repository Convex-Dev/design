# CAD033: Convex CVM Types

## Overview

Convex uses the CAD3 format to represent data.

CAD3 is an extensible format, so Convex data types are represented using CAD3 extensions. This CAD lists the extension types and specifications used.

## Format

### `0xB0` - `0xB1` Boolean

The possible Boolean values are `true` and `false`, which are coded as 1-byte Byte Flags.

```
Encoded as:
0xB0 <=> false
0xB1 <=> true
```

The two Boolean Values `true` or `false` have the Encodings `0xb1` and `0xb0` respectively. 

Note: These Tags are chosen to aid human readability, such that the first hexadecimal digit `b` suggests "binary" or "boolean", and the second hexadecimal digit represents the bit value.  

### `0xEA` Address

Addresses are used to reference sequentially allocated accounts in Convex, conventionally written as `#14567`. As such, they are conveniently encoded as CAD3 extension values with the tag `0xEA`

```
0xEA <VLQ Count = address number>
```

An Address is encoded by the tag byte followed by a VLQ Encoding of the 64-bit value of the Address. 

The address number MUST be positive, i.e. a 63-bit positive integer.

Since addresses are allocated sequentially from zero (and accounts can be re-used), this usually results in a short encoding.

Addresses MAY be used by implementations outside the CVM for other types of sequentially allocated values.