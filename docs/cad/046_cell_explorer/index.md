# CAD046: CellExplorer

## Overview

CellExplorer is a budget-bounded renderer that produces JSON5 representations of CVM cell values. It enables progressive exploration of arbitrarily large lattice structures within a fixed output budget, making it suitable for LLM context windows, debugging tools, and data previews.

## Motivation

CVM values can be arbitrarily large — a lattice root may contain gigabytes of nested data. Rendering such values fully is impractical for:

- **LLM context** — language models have finite context windows; injecting a full lattice value would overflow the budget
- **Debugging** — developers need a quick preview of a value's structure without materialising the entire tree
- **API responses** — REST endpoints need bounded previews of lattice state

CellExplorer solves this by rendering values within a caller-specified byte budget. Large values are progressively truncated with human-readable annotations showing what was omitted.

## Specification

### Budget Unit

The budget is measured in **CAD3 storage bytes** — the size of a cell's binary encoding plus the encoding of any embedded children. This is computed via `Cells.storageSize(cell)`, which is O(1) for any cell (uses cached memory size from the Etch store).

The storage size correlates well with LLM token count and wire size, making it a practical proxy for output cost.

### Output Format

CellExplorer produces valid **JSON5** output. All truncation metadata appears in `/* */` comments, which are unambiguous from data values. The output can be parsed by any JSON5 parser; the comments provide additional context but are not required for parsing.

### Rendering Rules

#### Leaf Values

If a cell fits within the remaining budget, it is rendered fully using standard JSON encoding:

| Type | Rendered Form |
|------|---------------|
| `nil` | `null` |
| Boolean | `true` / `false` |
| Integer | `42` |
| Double | `3.14` |
| String | `"hello"` |
| Blob | `"0xabcdef"` |
| Keyword | `:name` (unquoted if valid identifier) |
| Address | `"#42"` |

If a leaf does not fit, it is partially rendered:

- **Strings**: truncated with annotation: `"hello wo..." /* 4.2KB */`
- **Blobs**: truncated hex with annotation: `"0x4865..." /* Blob, 12MB */`
- **Other**: `null /* truncated Type, Size */`

#### Maps

Maps use a **key-first rendering strategy**: show as many entries as possible, truncating values rather than omitting entries.

1. Scan forward, counting entries that fit (key cost + minimum value budget per entry)
2. Allocate remaining budget equally to visible values
3. Render each value; if it exceeds its allocation, give it half the remaining budget (geometric decay)
4. Overflow entries are summarised: `/* +99 more, 390KB */`

Map keys follow JSON5 identifier rules:
- Keywords render as unquoted identifiers when the name is valid: `name: "value"` (not `":name": "value"`)
- Invalid identifiers are quoted: `"hello-world": "value"`

#### Sequences (Vectors, Lists)

Sequences use a **running-remainder strategy**:

1. For each item, check remaining budget
2. If the item fits, render fully; otherwise give it half the remaining budget
3. Stop when budget is exhausted
4. Overflow items are summarised: `/* +99 more, 390KB */`

#### Sets

Sets render as JSON5 arrays with a type marker: `[/* Set */]` (empty) or `[1, 2, /* Set: +99 more */]` (partial).

#### Fully Truncated Containers

When a container has zero budget for children: `{/* Map, 5 keys, 47.5MB */}`

### Size Annotations

Size annotations appear when the value is &ge;1KB:

| Range | Format | Example |
|-------|--------|---------|
| &lt;1KB | Bytes | `42B` |
| &lt;1MB | KB (1 decimal if &lt;10) | `4.2KB`, `13KB` |
| &lt;1GB | MB | `3.5MB`, `24MB` |
| &ge;1GB | GB | `1.2GB` |

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `ANNOTATION_RESERVE` | 30 | Per-container overhead for truncation annotation |
| `ENTRY_OVERHEAD` | 10 | Per-entry cost (delimiters + slack) |
| `MIN_VALUE_BUDGET` | 10 | Minimum budget to render any leaf |
| `MIN_MAP_VALUE_BUDGET` | 20 | Minimum per-value in map entries |
| `MIN_ITEM_BUDGET` | 10 | Minimum per-item in sequences |
| `SIZE_ANNOTATION_THRESHOLD` | 1024 | Size shown only if &ge;1KB |

## API

CellExplorer uses an instance-based API:

```java
CellExplorer explorer = new CellExplorer(2048);  // 2KB budget
AString result = explorer.explore(cell);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `budget` | int | *required* | Maximum output size in CAD3 storage bytes |
| `compact` | boolean | `true` | Compact output (reserved for future pretty-print) |

Instances are immutable and reusable across threads.

### Path Navigation

CellExplorer does not perform path navigation. Callers use the lattice cursor infrastructure ([CAD035](../035_cursors/index.md)) to resolve a path to a cell, then pass the resolved cell to `explore()`.

## Performance

| Property | Guarantee |
|----------|-----------|
| **Work** | O(output bytes) — proportional to rendered size, never input size |
| **Budget check** | O(1) per cell — uses cached `Cells.storageSize()` |
| **Memory** | O(output) — renders directly to `BlobBuilder`, no intermediate strings |
| **Stack depth** | Bounded by `budget / ANNOTATION_RESERVE` (~budget/30) |

A 1KB budget exploring a 1GB lattice value costs the same as exploring a 1KB value — work is always proportional to output, not input.

## Use Cases

- **LLM agent context** — inject lattice state previews into agent system prompts at controlled token budgets
- **`covia:inspect` operation** — the Covia venue's inspect operation uses CellExplorer for budget-controlled previews
- **Debugging** — quick structural overview of complex lattice values
- **API previews** — bounded responses for REST endpoints

## Reference Implementation

The reference implementation is in the `convex-core` module.

| Concept | Class | Package |
|---------|-------|---------|
| Explorer | `CellExplorer` | `convex.core.data.util` |
| Storage size | `Cells.storageSize()` | `convex.core.data` |
| JSON rendering | `JSON.appendJSON()` | `convex.core.util` |

`CellExplorerTest` provides comprehensive coverage including leaf forms, key formatting, truncation semantics, and JSON5 round-trip verification.

## See Also

- [CAD002: CVM Values](../002_values/index.md) — Value types rendered by CellExplorer
- [CAD003: Encoding](../003_encoding/index.md) — CAD3 storage size computation
- [CAD024: Lattice](../024_data_lattice/index.md) — Lattice structures explored by CellExplorer
- [CAD035: Lattice Cursors](../035_cursors/index.md) — Path navigation before exploration
- [CAD044: JSON](../044_json/index.md) — JSON encoding used for leaf rendering
