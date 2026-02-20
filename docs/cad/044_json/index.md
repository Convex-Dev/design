# CAD044: JSON on the Lattice

## Overview

JSON (JavaScript Object Notation) is a widely-used data interchange format for web applications and APIs. Convex provides native support for JSON-compatible data structures, enabling seamless interoperability between the CVM, the Lattice and external systems.

**Key Highlight**: JSON is a *strict subset* of CVM data types, meaning any valid JSON structure can be represented directly in Convex without difficulty.

## JSON as a Subset of CVM Types

The CVM data type system includes all types necessary to represent JSON:

- **Numbers**: JSON numbers map to CVM `Integer` (integers) or `Double` (floating point) values
- **Strings**: JSON strings map directly to CVM `String` values
- **Booleans**: JSON `true`/`false` map to CVM `Boolean` values
- **Null**: JSON `null` maps to CVM `nil`
- **Arrays**: JSON arrays map to CVM `Vector` values
- **Objects**: JSON objects map to CVM `Map` values with `Keyword` or `String` keys

This means that any valid JSON structure can be represented as a native CVM value without any loss of information or structural changes.

## Conversion: Convex → JSON

Converting CVM values to JSON format is straightforward for JSON-compatible data structures:

### Directly equivalent Types

The following CVM types convert directly to JSON and can be reliably round-tripped:

- `Long` and `Double` → JSON numbers
- `String` → JSON strings  
- `Boolean` → JSON booleans
- `nil` → JSON `null`
- `Vector` → JSON arrays
- `Map` with `Keyword` or `String` keys → JSON objects

### CVX to JSON Conversion

CVX to JSON translation is:
- **complete** - any CVX value can be mapped to JSON
- **lossy** - some type information is lost

When mapping CVX format to JSON, implementations SHOULD adhere to the following general rules:

- **Keywords**: CVM `Keyword` values (e.g. `:foo`) are converted to JSON strings by removing the leading colon (e.g. `"foo"`)
- **Map Keys**: `Keyword`, `Symbol` and `String` keys in Maps are JSON-compatible. Other types are printed as String keys.
- **Blobs**: Converted to hex strings. A leading "0x" is recommended.
- **Address**: Converted to the integer value of the Address 
- **Lists/Vectors/Sets**: Converted to JSON arrays. The type distinction between them is lost.
- **Numbers**: Large integers beyond JavaScript's safe integer range can be printed as valid JSON but may lose precision when read by other applications
- **Ordering**: JSON object key ordering is not guaranteed to match the original CVM Map ordering, as Maps use hash-based ordering

### JSON to CVX conversion

JSON conversion to CVX is simple as all JSON types can be represented directly on the CVM according to their equivalent types.

Applications utilising such conversions SHOULD be prepared to recognise possible JSON representations. For example, if an argument required an Address, then `"#13"`, `"13"` and `13` should all be accepted. 

Utility functions in `convex.core` such as `Address.parse(...)` are designed to handle such cases.

### Example

```clojure
;; A CVM value that is JSON-compatible
{:name "Alice"
 :age 30
 :active true
 :tags ["developer" "convex"]
 :metadata {:level 5 :score 100.5}
}
```

Maps to:

```json
{
  "name": "Alice",
  "age": 30,
  "active": true,
  "tags": ["developer", "convex"],
  "metadata": {
    "level": 5,
    "score": 100.5
  }
}
```

## Usage Notes

When designing CVM data structures intended for JSON conversion:

- Prefer `Keyword` or `String` keys in Maps for JSON compatibility
- Use `Vector` for ordered sequences (JSON arrays)
- Beware of CVM-specific types like `Address`, `Blob`, `Symbol`, or `Set` if JSON conversion is required
- Consider using `nil` instead of omitting optional fields, as JSON supports `null` values

## See Also

- [CAD002: CVM Values](../002_values/index.md) - Complete specification of CVM data types
- [CAD026: Convex Lisp](../026_lisp/index.md) - Language features including JSON superset support
- [CAD003: Encoding](../003_encoding/index.md) - CAD3 encoding format and JSON compatibility

