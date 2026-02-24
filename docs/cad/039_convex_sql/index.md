# CAD039: Convex SQL

## Overview

Convex SQL is a SQL database layer built on the [Lattice](../024_data_lattice/index.md). It provides relational table storage with CRDT merge semantics, enabling SQL-like operations over distributed, replicated data structures. Tables support schema definitions, primary key indexing, and row-level merge replication via [Lattice Nodes](../036_lattice_node/index.md).

Convex SQL enables standard SQL query capabilities over lattice data through Apache Calcite, bridging familiar database paradigms with the convergent properties of lattice technology.

## Motivation

While the [KV Database](../037_kv_database/index.md) provides excellent support for key-value workloads, many applications require:

- **Relational data models** with defined schemas and typed columns
- **SQL query language** for complex queries, joins, and aggregations
- **Table-based organisation** for structured business data
- **Primary key indexing** for efficient row lookups
- **Schema evolution** with controlled migrations

Traditional distributed databases solve these problems with consensus protocols or conflict resolution callbacks. Convex SQL instead uses lattice merge properties to guarantee convergence while maintaining relational semantics.

### Design Goals

- Provide a familiar table-based API (CREATE TABLE, INSERT, SELECT, DELETE)
- Support schema definitions with typed columns
- Enable primary key indexing with ordered retrieval
- Integrate with Apache Calcite for SQL parsing and query planning
- Maintain compatibility with the lattice cursor system and owner authentication
- Support per-database, per-table signed replicas for authentication

## Specification

### Lattice Path

Convex SQL occupies the `:sql` path in the standard lattice ROOT:

```
ROOT {
    :data → DataLattice
    :fs   → OwnerLattice → MapLattice → DLFSLattice
    :kv   → OwnerLattice → MapLattice → KVStoreLattice
    :sql  → OwnerLattice → MapLattice → TableStoreLattice
}
```

The full path to a specific table is:

```
:sql / <owner-key> → Signed({<db-name> → {<table-name> → TableEntry, ...}, ...})
```

Where:
- **owner-key** — the owner identity (see [CAD038](../038_lattice_auth/index.md))
- **Signed(...)** — the owner's signed map of database names to table stores
- **db-name** — a string database name, scoped per owner
- **table-name** — a string table name within the database

This structure mirrors the KV Database pattern: each owner has their own namespace of databases, and each database contains named tables.

### Lattice Composition

The full lattice hierarchy for Convex SQL:

```
OwnerLattice                    ← per-owner merge with auth (CAD038)
  └── SignedLattice             ← Ed25519 signature verification
        └── MapLattice          ← per-database-name merge
              └── TableStoreLattice
                    └── per-table-name merge
                          └── SQLTableLattice
                                └── schema + rows merge
                                      └── TableLattice
                                            └── per-row merge (by primary key)
                                                  └── SQLRowLattice (LWW)
```

#### Layer Descriptions

| Layer | Lattice | Merge Behaviour |
|-------|---------|-----------------|
| Owner | `OwnerLattice` | Per-owner with authentication ([CAD038](../038_lattice_auth/index.md)) |
| Signature | `SignedLattice` | Ed25519 signature verification |
| Database | `MapLattice` | Per-database-name merge |
| Table Store | `TableStoreLattice` | Per-table-name merge using `SQLTableLattice` |
| Table | `SQLTableLattice` | Schema LWW + row-level merge via `TableLattice` |
| Rows | `TableLattice` | Per-primary-key merge using `SQLRowLattice` |
| Row | `SQLRowLattice` | LWW by timestamp; equal timestamps favour deletions |

### Table Entries

Each table is stored as a **Table Entry**, a positional vector:

```
[schema, rows, utime]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | schema | vector | Column definitions: `[[name, type], ...]` |
| 1 | rows | Index | Row data: `{primary-key → RowEntry, ...}` |
| 2 | utime | integer | Schema update timestamp (epoch millis) |

#### Schema Format

The schema is a vector of column definitions, each a vector of `[name, type]`:

```
[[name₁, type₁], [name₂, type₂], ...]
```

Where:
- **name** — column name (string)
- **type** — column type (nil = any, or a type identifier)

Example:
```
[["id", nil], ["name", nil], ["email", nil]]
```

Column types are advisory for now; all values accept any CVM data type.

#### Table Tombstones

A tombstone is a table entry with `nil` schema and `nil` rows. The timestamp is preserved.

Tombstones are required for lattice-compatible DROP TABLE: a tombstone wins over older live tables during merge.

### Row Entries

Each row within a table is stored as a **Row Entry**, a positional vector:

```
[values, utime, deleted]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | values | vector | Column values for this row |
| 1 | utime | integer | Update timestamp (epoch millis) |
| 2 | deleted | integer / nil | Deletion timestamp (nil = live) |

#### Row Tombstones

A row tombstone has `nil` values and a non-nil deleted timestamp. The deletion timestamp represents when the row was deleted.

### Primary Keys

Primary keys MUST be blob-like types (Blob, String, AccountKey, etc.) as required by the Index data structure for lexicographic ordering.

Implementations SHOULD provide automatic key conversion:
- **Integer** → 8-byte big-endian encoding
- **String** → UTF-8 byte encoding
- **Blob** → direct use

This allows natural primary key usage while maintaining Index compatibility.

### Merge Semantics

Merge operates at multiple levels:

#### Table Store Merge

Per-table-name merge using `SQLTableLattice.merge()` for each table entry.

#### Table Entry Merge

For each table:

1. **Schema**: LWW by timestamp — latest schema wins
2. **Rows**: Merge using `TableLattice` (per-primary-key merge)
3. **Tombstone handling**: If the schema winner is a tombstone, the tombstone wins (table dropped)

This means schema changes from a later timestamp override earlier schemas, while row data merges independently regardless of schema changes.

#### Row Entry Merge

For each row (by primary key):

1. **Equal entries** — return own (identity)
2. **One side nil** — return the other
3. **Compare timestamps** — newer wins (LWW)
4. **Equal timestamps** — deletion wins (tombstone takes precedence)

These rules satisfy the lattice properties:
- **Commutative**: merge(a, b) = merge(b, a)
- **Associative**: merge(merge(a, b), c) = merge(a, merge(b, c))
- **Idempotent**: merge(a, a) = a

### Ownership and Authentication

Like KV Database, Convex SQL uses OwnerLattice for per-owner authentication. Each owner's data is signed with an Ed25519 key pair and verified during merge ([CAD038](../038_lattice_auth/index.md)).

The signed state per owner is:

```
Signed({db-name → {table-name → TableEntry, ...}, ...})
```

Authentication provides:
- **Data integrity** — tampering invalidates the signature
- **Owner verification** — only authorised signers can update an owner's tables
- **Multi-key support** — address and DID owners may authorise multiple signing keys

### Replication Model

Convex SQL uses the same **merge-on-write** replication model as KV Database:

1. Each node maintains its own signed replica (databases containing tables)
2. The node publishes its replica to the lattice at `:sql`
3. Lattice Nodes propagate signed replicas to peers
4. On receive, OwnerLattice merge combines entries from all owners
5. Applications read the merged owner map and absorb remote data

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Node A  │         │  Node B  │         │  Node C  │
│          │         │          │         │          │
│ SQLDatabase       │ SQLDatabase       │ SQLDatabase│
│  tables  │         │  tables  │         │  tables  │
│          │         │          │         │          │
│ export() │         │ export() │         │ export() │
│    ↓     │         │    ↓     │         │    ↓     │
│ :sql/A   │◄───────►│ :sql/B   │◄───────►│ :sql/C   │
│          │  Lattice │          │  Lattice │          │
│          │   Merge  │          │   Merge  │          │
└──────────┘         └──────────┘         └──────────┘
```

#### Concurrent Schema Changes

When two nodes change a table's schema concurrently, LWW applies: the schema with the later timestamp wins. Row data merges independently, so rows from both nodes are preserved even if the schema changed.

Applications SHOULD coordinate schema changes through external mechanisms (e.g. governance) to avoid unexpected schema conflicts.

#### Row-Level Convergence

Row merges are deterministic and converge across all replicas:
- Rows with different primary keys merge independently
- Rows with the same primary key use LWW
- Deletions propagate correctly via tombstones

## Operations

### Table Operations

| Operation | Description |
|-----------|-------------|
| `createTable(name, columns)` | Create table with column names |
| `dropTable(name)` | Drop table (creates tombstone) |
| `tableExists(name)` | Check if table exists |
| `getSchema(name)` | Get column definitions |
| `getColumnNames(name)` | Get column names as array |
| `getRowCount(name)` | Get count of live rows |
| `getTableNames()` | Get all table names |

### Row Operations

| Operation | Description |
|-----------|-------------|
| `insert(table, key, values)` | Insert or update row |
| `selectByKey(table, key)` | Get row by primary key |
| `selectAll(table)` | Get all live rows |
| `deleteByKey(table, key)` | Delete row (creates tombstone) |

### Replication Operations

| Operation | Description |
|-----------|-------------|
| `exportReplica()` | Export signed replica for lattice publication |
| `mergeReplicas(ownerMap)` | Merge remote replicas into local store |
| `mergeReplicas(ownerMap, filter)` | Merge with owner filter predicate |

## SQL Integration

Convex SQL integrates with Apache Calcite to provide SQL query capabilities:

### Planned Features

- **SQL Parsing** — standard SQL syntax via Calcite parser
- **Query Planning** — Calcite planner with lattice-optimised rules
- **Schema Discovery** — automatic Calcite schema from table definitions
- **Basic DML** — SELECT, INSERT, UPDATE, DELETE
- **Joins** — cross-table queries with merge-compatible semantics

### Query Execution Model

Queries execute against the local merged state:

```
SQL Query → Calcite Parser → Calcite Planner → Lattice Table Scan → Results
```

Write operations (INSERT, UPDATE, DELETE) modify the local replica, which is then signed and propagated via the lattice.

## Reference Implementation

A reference implementation is provided in the `convex-db` module (Java).

### Classes

| Specification Concept | Java Class | Package |
|-----------------------|------------|---------|
| SQL Database wrapper | `SQLDatabase` | `convex.db` |
| Table operations facade | `LatticeTables` | `convex.db.table` |
| Table store lattice | `TableStoreLattice` | `convex.db.table` |
| Table entry merge | `SQLTableLattice` | `convex.db.table` |
| Table utilities | `SQLTable` | `convex.db.table` |
| Row index lattice | `TableLattice` | `convex.db.table` |
| Row entry merge | `SQLRowLattice` | `convex.db.table` |
| Row utilities | `SQLRow` | `convex.db.table` |

The `SQLDatabaseTest` class provides test coverage for table operations, replication, and merge semantics.

### Example: Basic Table Operations

```java
// Create a database with signing key
AKeyPair keyPair = AKeyPair.generate();
SQLDatabase db = SQLDatabase.create("mydb", keyPair);

// Create a table
db.tables().createTable("users", new String[]{"id", "name", "email"});

// Insert rows (primary key can be CVMLong, AString, or ABlob)
db.tables().insert("users", CVMLong.create(1),
    Vectors.of(CVMLong.create(1),
               Strings.create("Alice"),
               Strings.create("alice@example.com")));

// Query by primary key
AVector<ACell> row = db.tables().selectByKey("users", CVMLong.create(1));

// Query all rows
Index<ABlob, AVector<ACell>> allRows = db.tables().selectAll("users");

// Delete a row
db.tables().deleteByKey("users", CVMLong.create(1));

// Drop a table
db.tables().dropTable("users");
```

### Example: Multi-Node Replication

```java
// Create two nodes with different keys
AKeyPair keyA = AKeyPair.generate();
AKeyPair keyB = AKeyPair.generate();

SQLDatabase dbA = SQLDatabase.create("shared", keyA);
SQLDatabase dbB = SQLDatabase.create("shared", keyB);

// Both create the same table
dbA.tables().createTable("data", new String[]{"id", "value"});
dbB.tables().createTable("data", new String[]{"id", "value"});

// Each writes different rows
dbA.tables().insert("data", CVMLong.create(1), Vectors.of(CVMLong.create(1), Strings.create("from-a")));
dbB.tables().insert("data", CVMLong.create(2), Vectors.of(CVMLong.create(2), Strings.create("from-b")));

// Exchange signed replicas
dbA.mergeReplicas(dbB.exportReplica());
dbB.mergeReplicas(dbA.exportReplica());

// Both now see all rows
dbA.tables().getRowCount("data");  // 2
dbB.tables().getRowCount("data");  // 2
```

## Comparison with KV Database

| Aspect | KV Database (CAD037) | Convex SQL (CAD039) |
|--------|---------------------|---------------------|
| Data Model | Key-value | Relational tables |
| Schema | Implicit (type tag per entry) | Explicit column definitions |
| Key Types | String keys | Primary key (blob-like) |
| Value Types | Multiple (string, hash, set, counter, etc.) | Row vectors |
| Merge Granularity | Per-key, type-specific | Per-row (LWW) |
| Query Language | API methods | SQL (via Calcite) |
| Use Case | Caches, sessions, counters | Structured business data |

Both share the same OwnerLattice authentication model and lattice replication infrastructure.

## See Also

- [CAD002: CVM Values](../002_values/index.md) — Value types used in table entries
- [CAD003: Encoding](../003_encoding/index.md) — Binary encoding format
- [CAD024: Lattice](../024_data_lattice/index.md) — Theoretical foundation
- [CAD035: Lattice Cursors](../035_cursors/index.md) — Cursor system for atomic state access
- [CAD036: Lattice Node](../036_lattice_node/index.md) — Network replication infrastructure
- [CAD037: KV Database](../037_kv_database/index.md) — Key-value store with similar lattice pattern
- [CAD038: Lattice Authentication](../038_lattice_auth/index.md) — Owner verification during merge
