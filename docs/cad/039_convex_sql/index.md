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

### Lattice Structure

:::note Provisional structure
Convex SQL does not occupy a region in the root lattice ([CAD053](../053_lattice_regions/index.md) lists the regions that do). A database is more likely to live within the state of the application that uses it, under `:app` ([CAD045](../045_lattice_apps/index.md)), than in a root region of its own; where it lives and how it is structured are still open design questions and may change. This section documents the current implementation.
:::

Convex SQL currently operates as a **standalone lattice**, managed by `ConvexDB`:

```
ConvexDB (MapLattice: db-name → database state)
  └── SQLDatabase (KeyedLattice: :tables → table store)
        └── TableStoreLattice (table-name → TableEntry)
```

Each database is a keyword-keyed structure: the `:tables` key holds the table store, leaving room for further per-database sections in future.

For replication between nodes, the database map is wrapped in a signed owner envelope:

```
{<owner-key> → Signed({<db-name> → {:tables → {<table-name> → TableEntry, ...}}, ...})}
```

Where:
- **owner-key** — the owner identity (see [CAD038](../038_lattice_auth/index.md))
- **Signed(...)** — the owner's signed map of database names to database state
- **db-name** — a string database name, scoped per owner
- **table-name** — a string table name within the database

This structure mirrors the KV Database pattern: each owner has their own namespace of databases, and each database contains named tables.

### Lattice Composition

The full lattice hierarchy for a replicated Convex SQL owner map:

```
OwnerLattice                    ← per-owner merge with auth (CAD038)
  └── SignedLattice             ← Ed25519 signature verification
        └── MapLattice          ← per-database-name merge
              └── KeyedLattice  ← per-database sections (:tables)
                    └── TableStoreLattice
                          └── per-table-name merge
                                └── SQLTableLattice
                                      └── schema + rows merge
                                            └── TableLattice
                                                  └── per-row merge (by primary key)
                                                        └── SQLRowLattice (LWW)
```

A standalone (non-replicated) ConvexDB uses the same hierarchy from `MapLattice` down, without the owner/signature envelope.

#### Layer Descriptions

| Layer | Lattice | Merge Behaviour |
|-------|---------|-----------------|
| Owner | `OwnerLattice` | Per-owner with authentication ([CAD038](../038_lattice_auth/index.md)) |
| Signature | `SignedLattice` | Ed25519 signature verification |
| Database Map | `MapLattice` | Per-database-name merge |
| Database | `KeyedLattice` | Per-section merge (`:tables`) |
| Table Store | `TableStoreLattice` | Per-table-name merge using `SQLTableLattice` |
| Table | `SQLTableLattice` | Schema LWW + row-level merge via `TableLattice` |
| Rows | `TableLattice` | Per-primary-key merge using `SQLRowLattice` |
| Row | `SQLRowLattice` | LWW by timestamp; equal timestamps favour deletions |

### Table Entries

Each table is stored as a **Table Entry**, a positional vector:

```
[schema, rows, utime, live-count, version]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | schema | vector | Column definitions: `[column₁, column₂, ...]` |
| 1 | rows | Index | Row data: `{primary-key → RowEntry, ...}` |
| 2 | utime | integer | Schema update timestamp (epoch millis) |
| 3 | live-count | integer | Number of live (non-tombstone) rows |
| 4 | version | integer | Format version of the entry |

The live count is derived from the rows and recomputed when a merge changes them. Readers MUST accept an entry without it, counting the live rows instead.

#### Format Version

The version determines how the whole entry is read: the meaning of its schema's type identifiers ([Column Types](#column-types)), the CVM values that represent each column's data in its rows, and the encoding of its primary keys. An entry without a version field is **version 0**.

Implementations MUST create new tables as version 1. They MUST NOT read or write an entry whose version they do not implement as if it were another version. Older implementations rebuild a table entry from its first four fields when they merge it, dropping the version, and would then read a version 1 table as version 0. Every node that replicates a database holding version 1 tables MUST therefore implement version 1.

A table changes version only when its schema changes. The writer then rewrites every row in the new version's representation, under the new schema's timestamp.

#### Schema Format

The schema binds a table's data to its column types: it is replicated, signed and merged with the rows it describes, so it determines, with the entry's version, how every node reads them. The schema is a vector of column definitions, each a positional vector:

```
[name, type, precision, scale]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | name | string | Column name |
| 1 | type | string / nil | Type identifier; nil means any CVM value |
| 2 | precision | integer / nil | Declared precision or length, if any |
| 3 | scale | integer / nil | Declared scale, if any |

Trailing nil fields MAY be omitted. The meaning of a type identifier depends on the entry's version, as described under [Column Types](#column-types).

Example of the schema of a version 1 table:
```
[["id", "BIGINT"], ["name", "VARCHAR", 100], ["balance", "NUMERIC", 40, 0], ["notes", nil]]
```

### Column Types

A column's declared type determines which values it holds and how SQL reads them. Types are chosen by the user who creates the table; an implementation records the declared type exactly and maps it to the CVM values below.

#### Version 1 Types

In a version 1 table, the type identifier is the declared SQL type, normalised to the names below. Aliases such as `INT`, `INT8`, `DECIMAL`, `FLOAT`, `FLOAT8`, `TEXT` and `BYTEA` normalise to the name shown.

| Type identifier | SQL type | Stored CVM value | Constraint |
|-----------------|----------|------------------|------------|
| `SMALLINT` | 16-bit integer | Integer | −2¹⁵ to 2¹⁵−1 |
| `INTEGER` | 32-bit integer | Integer | −2³¹ to 2³¹−1 |
| `BIGINT` | 64-bit integer | Integer | −2⁶³ to 2⁶³−1 |
| `NUMERIC` | Exact numeric with precision *p* and scale *s* | Integer: the value × 10^*s* | At most *p* digits; *s* defaults to 0; without *p*, any value representable as a CVM integer |
| `REAL` | Single-precision floating point | Double, rounded to single precision | |
| `DOUBLE PRECISION` | Double-precision floating point | Double | |
| `BOOLEAN` | Boolean | Boolean | |
| `CHAR` | Fixed-length character string, length *n* | String, padded to *n* | At most *n* characters |
| `VARCHAR` | Variable-length character string, length *n* | String | At most *n* characters, if *n* is declared |
| `VARBINARY` | Binary string | Blob | At most *n* bytes, if *n* is declared |
| `TIMESTAMP` | Timestamp without time zone, fractional precision *p* ≤ 6 | Integer: microseconds since 1970-01-01T00:00:00 | |
| `JSON` | JSON document | Any CVM value | |

All integers are CVM integers of arbitrary precision ([CAD002](../002_values/index.md)), so a column's range is a constraint on values, not a property of their representation. A `NUMERIC` column with scale 0 holds integers of any size the CVM can represent. Implementations MUST compare and key integers by value, whatever their internal representation.

An implementation MUST reject a write that does not conform to the column's declared type. It MUST reject a table definition that uses a SQL type not listed here, rather than store it as another type.

#### Non-conforming Values

Merge never rejects or alters a row for its types: merge is the trust boundary, and rows written under another schema or by another node may hold values that do not conform to the current schema. Readers MUST NOT alter or discard such values, and MUST NOT present one as if it conformed: reading it through SQL is an error.

#### Version 0 Types

A version 0 table uses the reference implementation's original type identifiers. Implementations MUST read version 0 tables with these meanings.

| Type identifier | Stored CVM value |
|-----------------|------------------|
| nil | Any CVM value |
| `BIGINT` | Integer, any size |
| `INTEGER` | Integer in the 64-bit range |
| `DECIMAL`, `DOUBLE` | Double |
| `CHAR`, `VARCHAR` | String |
| `BOOLEAN` | Boolean |
| `VARBINARY`, `BLOB` | Blob |
| `TIMESTAMP` | Integer: milliseconds since 1970-01-01T00:00:00 |
| `JSON` | Map, or the JSON text as a string |

How each type is presented to SQL clients, including version 0 types, is described in the reference implementation's design notes (`convex-db/docs/SQL-TYPES.md` in the [Convex repository](https://github.com/Convex-Dev/convex)).

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
- **Integer** in the signed 64-bit range → 8-byte big-endian two's-complement encoding
- **Integer** beyond the 64-bit range → its minimal big-endian two's-complement encoding, which is at least 9 bytes
- **String** → UTF-8 byte encoding
- **Blob** → direct use

An integer key is converted from its value, whatever its internal representation, so equal integers always give the same key. The two integer encodings differ in length, so they cannot collide. A `NUMERIC` value is keyed by its stored integer.

This allows natural primary key usage while maintaining Index compatibility.

### Merge Semantics

Merge operates at multiple levels:

#### Table Store Merge

Per-table-name merge using `SQLTableLattice.merge()` for each table entry.

#### Table Entry Merge

For each table:

1. **Schema**: LWW by timestamp — latest schema wins, with its version. If both entries have the same timestamp and schema, the higher version is kept, restoring a version that an older implementation dropped.
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
Signed({db-name → {:tables → {table-name → TableEntry, ...}}, ...})
```

Authentication provides:
- **Data integrity** — tampering invalidates the signature
- **Owner verification** — only authorised signers can update an owner's tables
- **Multi-key support** — address and DID owners may authorise multiple signing keys

### Replication Model

Convex SQL uses the same **merge-on-write** replication model as KV Database:

1. Each node maintains its own signed replica (databases containing tables)
2. The node exports its replica as a signed owner map (`exportReplica()`)
3. Replicas are exchanged between nodes (a standard global lattice region for automatic propagation is anticipated but not yet defined — see the provisional note above)
4. On receive, OwnerLattice merge verifies signatures and combines entries from all owners
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
│ replica A│◄───────►│ replica B│◄───────►│ replica C│
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

Convex SQL integrates with Apache Calcite to provide full SQL query capabilities over lattice data.

### Query Execution Pipeline

```
SQL Query → Calcite Parser → Calcite Planner → Convex Relational Operators → Results
```

The Calcite integration provides:

- **SQL parsing** — standard SQL syntax via Calcite's SQL parser
- **Query planning** — Calcite planner with lattice-optimised rules
- **Cost-based planning** — table statistics (such as row counts) feed Calcite's cost model to inform join ordering and plan selection
- **Schema discovery** — automatic Calcite schema bridge from table definitions
- **DDL** — CREATE TABLE and DROP TABLE via SQL
- **DML** — SELECT, INSERT, UPDATE, DELETE
- **Joins** — cross-table queries including merge joins
- **Aggregations** — COUNT, SUM, AVG, etc. via Calcite aggregate operators
- **Sorting and projection** — ORDER BY, column selection

### Primary Key Filter Pushdown

When a query includes a primary key equality predicate (`WHERE id = ?`), the planner pushes the filter into the table scan, converting a full table scan into an O(log n) index lookup via `selectByKey()`. This is a critical optimisation for point queries.

### Relational Operators

Custom Convex relational operators integrate with Calcite's planner:

| Operator | Description |
|----------|-------------|
| `ConvexTableScan` | Full or filtered table scan |
| `ConvexFilter` | Filter with PK pushdown support |
| `ConvexProject` | Column projection |
| `ConvexSort` | Ordering |
| `ConvexAggregate` | Aggregation functions |
| `ConvexJoin` | Cross-table joins |
| `ConvexMergeJoin` | Merge join for sorted data |

### Row Count Optimisation

Row count queries avoid materialising rows — the count is derived directly from the lattice index structure.

### PreparedStatement Caching

Calcite query plans are cached for PreparedStatements, avoiding repeated parsing and planning for repeated queries with different parameters.

## JDBC Driver

Convex SQL provides a standard JDBC driver for direct integration with any JDBC-compatible tool or application.

### Connection URLs

```
jdbc:convex:mem:mydb              In-memory database (non-persistent)
jdbc:convex:file:/path/to/db.etch Persistent database backed by Etch store
```

The driver manages database instances automatically — no manual registration or server process required.

### Transaction Support

The JDBC driver supports transaction isolation via the lattice fork/sync model:

| Operation | Lattice Effect |
|-----------|----------------|
| `setAutoCommit(false)` | Forks the cursor (snapshot isolation) |
| `commit()` | Syncs the fork back to parent (lattice merge) |
| `rollback()` | Discards the fork |
| `setAutoCommit(true)` | Direct writes, no isolation |

Because lattice merge is always well-defined, commits never fail due to conflicts — the merge function deterministically combines the transaction's writes with concurrent state.

### Example: JDBC Usage

```java
Connection conn = DriverManager.getConnection("jdbc:convex:mem:mydb");

// DDL
Statement stmt = conn.createStatement();
stmt.execute("CREATE TABLE users (id INTEGER, name VARCHAR, email VARCHAR)");

// DML
PreparedStatement ps = conn.prepareStatement("INSERT INTO users VALUES (?, ?, ?)");
ps.setInt(1, 1);
ps.setString(2, "Alice");
ps.setString(3, "alice@example.com");
ps.execute();

// Query
ResultSet rs = stmt.executeQuery("SELECT * FROM users WHERE id = 1");
while (rs.next()) {
    System.out.println(rs.getString("name"));
}

// Transactions
conn.setAutoCommit(false);
stmt.execute("INSERT INTO users VALUES (2, 'Bob', 'bob@example.com')");
conn.commit();  // Lattice merge — always succeeds

conn.close();
```

## PostgreSQL Wire Protocol

Convex SQL includes a PostgreSQL wire protocol server (`PgServer`), enabling any PostgreSQL-compatible client to connect:

```bash
psql -h localhost -p 5432 -d mydb
```

The PG server reuses the Calcite pipeline and ConvexSchema, providing the same SQL capabilities as the JDBC driver. A `pg_catalog` virtual schema provides compatibility with PostgreSQL client tooling.

Write operations (INSERT, UPDATE, DELETE) modify the local replica, which is then signed and propagated via the lattice.

## Reference Implementation

A reference implementation is provided in the `convex-db` module (Java).

### Classes

| Specification Concept | Java Class | Package |
|-----------------------|------------|---------|
| Root database manager | `ConvexDB` | `convex.db` |
| SQL Database wrapper | `SQLDatabase` | `convex.db.lattice` |
| Table operations facade | `SQLSchema` | `convex.db.lattice` |
| Table store lattice | `TableStoreLattice` | `convex.db.lattice` |
| Table entry merge | `SQLTableLattice` | `convex.db.lattice` |
| Table utilities | `SQLTable` | `convex.db.lattice` |
| Row index lattice | `TableLattice` | `convex.db.lattice` |
| Row entry merge | `SQLRowLattice` | `convex.db.lattice` |
| Row utilities | `SQLRow` | `convex.db.lattice` |
| JDBC Driver | `ConvexDriver` | `convex.db.jdbc` |
| Calcite schema bridge | `ConvexSchema` | `convex.db.calcite` |
| Calcite table | `ConvexTable` | `convex.db.calcite` |
| DDL executor | `ConvexDdlExecutor` | `convex.db.calcite` |
| Relational operators (scan, filter, join, ...) | `ConvexTableScan` etc. | `convex.db.calcite.rel` |
| Planner rules | `ConvexRules` | `convex.db.calcite.rules` |
| PostgreSQL server | `PgServer` | `convex.db.psql` |

The `SQLDatabaseTest` and `ConvexDBTest` classes provide test coverage for table operations, JDBC, replication, and merge semantics.

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
