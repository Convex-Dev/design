# CAD039: Convex SQL

## Overview

Convex SQL is a SQL database layer built on the [Lattice](../024_data_lattice/index.md). It provides relational table storage that replicates by lattice merge, enabling SQL-like operations over distributed, replicated data structures. Tables support schema definitions, primary key indexing, and replication via [Lattice Nodes](../036_lattice_node/index.md). How concurrent writes combine is a merge policy chosen by the application that uses the database.

Convex SQL enables standard SQL query capabilities over lattice data through Apache Calcite, bridging familiar database paradigms with the convergent properties of lattice technology.

## Motivation

While the [KV Database](../037_kv_database/index.md) provides excellent support for key-value workloads, many applications require:

- **Relational data models** with defined schemas and typed columns
- **SQL query language** for complex queries, joins, and aggregations
- **Table-based organisation** for structured business data
- **Primary key indexing** for efficient row lookups
- **Schema evolution** with controlled migrations

Traditional distributed databases solve these problems with consensus protocols or conflict resolution callbacks. Convex SQL instead merges copies of a database with a lattice merge, so every copy converges whatever order updates arrive in. The application decides what they converge to. With one writer, every copy converges to that writer's data. With several writers, copies converge to whatever the application's [merge policy](#merge-policy) defines, and relational guarantees across writers are the policy's to give.

### Design Goals

- Provide a familiar table-based API (CREATE TABLE, INSERT, SELECT, DELETE)
- Support schema definitions with typed columns
- Enable primary key indexing with ordered retrieval
- Integrate with Apache Calcite for SQL parsing and query planning
- Maintain compatibility with the lattice cursor system and owner authentication
- Support per-database, per-table signed replicas for authentication

## Specification

### Lattice Structure

:::note Location
Convex SQL does not occupy a region in the root lattice ([CAD053](../053_lattice_regions/index.md) lists the regions that do). Where a database lives is the choice of the application that uses it: an application's own databases live in its state under `:app` ([CAD045](../045_lattice_apps/index.md)). A database of reference tables shared by many applications would need a root region listed in CAD053, and none is listed.
:::

A **database map**, managed by `ConvexDB`, holds databases by name. Each database is a keyword-keyed structure: the `:tables` section holds the table store, leaving room for further per-database sections in future.

```
database map    {db-name → database}
  database      {:tables → table store}
    table store {table-name → table entry}
      table entry [schema, rows, ctime, live-count, version]
        rows      {primary-key → row entry}
```

The database is the unit of merging and of transactions: it merges as a whole, with the [merge policy](#merge-policy) supplied for it.

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

Only the database has a merge rule of its own:

| Level | Merge |
|-------|-------|
| Database map | Per database name, each database with its merge policy |
| Database | The [merge policy](#merge-policy) supplied for it |
| Table store, table entry, rows | No rule of their own: merged only as part of their database |

Because everything below a database merges as part of it, a value delivered to a table or a row and a replica from another node merge exactly as the equivalent whole database would.

A signed owner map is the exchange format between nodes, not a lattice that merges as a whole: a node checks each replica in it and merges the accepted replica's database state into its own database with the policy ([Replication Model](#replication-model)).

### Table Entries

Each table is stored as a **Table Entry**, a positional vector:

```
[schema, rows, ctime, live-count, version]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | schema | vector | Column definitions: `[column₁, column₂, ...]` |
| 1 | rows | Index | Row data: `{primary-key → RowEntry, ...}` |
| 2 | ctime | integer | Time the table was created, or dropped for a tombstone ([Timestamps](#timestamps)) |
| 3 | live-count | integer | Number of live (non-tombstone) rows |
| 4 | version | integer | Format version of the entry |

The live count is derived from the rows and recomputed when a merge changes them. Readers MUST accept an entry without it, counting the live rows instead.

#### Timestamps

A table entry's ctime records when the table was created, or for a tombstone when it was dropped; only creating or dropping the table sets it. Each row entry records when the row was written. Timestamps come from the writer's clock, which the application supplies; the reference implementation defaults to the runtime clock, in milliseconds since 1970-01-01T00:00:00 UTC. A writer reads its clock once for each write, and merges never read it. How a writer orders its own writes, for example with strictly increasing timestamps, is for the application.

A row write or deletion MUST leave its table's ctime unchanged, and MUST carry a timestamp at or after that ctime: a writer whose clock is behind the ctime stamps the write with the ctime. A merge policy can then tell a table's own rows from those of an earlier table of the same name, whatever the writers' clocks, as [RowLWW](#rowlww) does.

#### Format Version

The version determines how the whole entry is read: the meaning of its schema's type identifiers ([Column Types](#column-types)), the CVM values that represent each column's data in its rows, and the encoding of its primary keys. An entry without a version field is **version 0**.

Implementations MUST create new tables as version 1. They MUST NOT read or write an entry whose version they do not implement as if it were another version. Older implementations rebuild a table entry from its first four fields when they merge it, dropping the version, and would then read a version 1 table as version 0. Every node that replicates a database holding version 1 tables MUST therefore implement version 1.

A table changes version only when it is created again with its schema in the new version. The writer then rewrites every row in the new version's representation, stamped at the new ctime.

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

A tombstone is a table entry with `nil` schema; its ctime records when the table was dropped. DROP TABLE writes it with `nil` rows. A merge policy may keep rows in a tombstone, such as rows written after the drop by a copy that had not seen it ([RowLWW](#rowlww)). Readers MUST treat an entry with `nil` schema as a dropped table, whatever its rows.

Tombstones make DROP TABLE mergeable: a policy can order a drop against a table's creations by their ctimes.

### Row Entries

Each row within a table is stored as a **Row Entry**, a positional vector:

```
[values, utime, deleted]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | values | vector | Column values for this row |
| 1 | utime | integer | Time the row was written ([Timestamps](#timestamps)) |
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

The reference implementation does not yet encode integer keys beyond the 64-bit range: it refuses to write a row with such a key, and finds no row when looking one up.

This allows natural primary key usage while maintaining Index compatibility.

### Merge Policy

A database merges with a **merge policy**: a function that takes two states of the database, the established (own) state and an incoming one, and returns the merged state. Convex SQL specifies the data format, not how concurrent writes combine. Whatever constructs a database, normally the application that uses it, supplies its policy. There is no default.

An implementation MUST merge a database with its policy on every route: an incoming database state, a value delivered to a path below the database, the publication of a transaction, and a replica from another node. A policy MUST satisfy the merge properties of [CAD024](../024_data_lattice/index.md#merge-properties-and-tie-preference), as every custom merge must ([CAD045](../045_lattice_apps/index.md#merge-properties)).

How creations, drops and schema changes of one table name by several writers are ordered is application policy. An application whose writers change a table's schema concurrently orders those changes itself, or supplies a policy that does.

#### Path Delivery

A value delivered to a path below a database ([CAD036](../036_lattice_node/index.md#path-based-operations)) is merged as a database state holding only what was delivered. Sub-lattice resolution stops at the database: there is no separate merge for a table or a row, so a delivery gives the same result as merging the equivalent database state.

| Path below the database | Merged as |
|-------------------------|-----------|
| `[:tables]` | The table store |
| `[:tables name]` | One table entry |
| `[:tables name 1]` | The table's rows, in an entry without a ctime |
| `[:tables name 1 key]` | One row, in an entry without a ctime |

An entry without a ctime carries only rows, and the policy decides whether they apply. Convex SQL defines only the `:tables` section, so values delivered to other sections are not merged. A delivery to any other path into a table entry MUST be refused.

#### RowLWW

`RowLWW` is the merge policy Convex SQL provides for databases whose tables several writers update row by row: last-write-wins per row. The JDBC driver's `mem:` and `file:` databases use it. Other policies are possible, and an application can compose one from RowLWW's parts, for example to treat one table differently.

**Database.** The incoming `:tables` section merges with the own table store. Other incoming sections are ignored, and those already held are kept.

**Table store.** A union of table names, with the two entries for each name merged as below.

**Table entry.**

1. **Schema**: last-writer-wins on ctime, with the own entry kept when the ctimes are equal; a tombstone wins in the same way. The winner's version is kept, except that when both entries have the same ctime and schema, the higher version is kept, restoring a version that an older implementation dropped.
2. **Rows**: merged by primary key, whichever schema wins. A row held by both entries merges as a row entry, below. A row held by one entry only survives if it was written at or after the other entry's ctime: a row written before a table was created belongs to an earlier table of that name, and one written before a drop belongs to the dropped table.
3. **Rows only**: an entry without a ctime, from a [path delivery](#path-delivery), merges its rows into an existing table, live or dropped, as in 2. A table that does not exist takes nothing.

So rows written before a table is dropped never return, whether the table is created again or a copy that missed the drop merges later, and every copy of a single writer's tables converges to the writer's own. Two creations of one table name by different writers are two different tables: rows written to the earlier one before the later creation are dropped. A dropped table holds only rows written after the drop, and readers do not see them.

**Row entry.** For each primary key:

1. **Equal entries** — return own
2. **One side nil** — return the other
3. **Compare timestamps** — newer wins
4. **Equal timestamps** — deletion wins; otherwise the own entry is kept

RowLWW is idempotent. It is commutative except at exact ties, where the own value is kept as CAD024 allows: two live rows with equal timestamps and different values, or two table entries with equal ctimes and different schemas. It is associative for tables whose rows were all written at or after the table's ctime, as [Timestamps](#timestamps) requires.

### Ownership and Authentication

Each owner's databases are signed with an Ed25519 key pair ([CAD038](../038_lattice_auth/index.md)). A node accepts a replica only if its signature verifies and its signer is authorised for the owner it is published under. A node applies the same check to its own replica, and refuses to export one that it would refuse to accept.

When an [owner verifier](../038_lattice_auth/index.md#owner-verifier) is supplied, it decides who is authorised, for every owner. Without one, an owner that is an account key, or a `did:key` that denotes one, MUST be the signer, and any other owner, such as an address or another DID, MUST be refused.

The signed state per owner is:

```
Signed({db-name → {:tables → {table-name → TableEntry, ...}}, ...})
```

Authentication provides:
- **Data integrity** — tampering invalidates the signature
- **Owner verification** — only authorised signers can update an owner's tables
- **Multi-key support** — address and DID owners may authorise multiple signing keys, through a supplied owner verifier

### Replication Model

Convex SQL uses the same **merge-on-write** replication model as KV Database:

1. Each node holds its own databases and signs them as its replica
2. The node exports its replica as a signed owner map (`exportReplica()`)
3. Replicas are exchanged between nodes (no root region is defined for this; see the location note above)
4. On receive, the node accepts or refuses each replica in the owner map, as described under [Ownership and Authentication](#ownership-and-authentication)
5. The node merges each accepted replica's state for the database into its own database, with the database's merge policy

A node that absorbs other owners' replicas into its own database has several writers by construction, so it needs a merge policy designed for several writers, such as [RowLWW](#rowlww).

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

How schema changes by several writers are ordered is application policy ([Merge Policy](#merge-policy)). Under RowLWW, the later creation or drop of a table wins, and a copy's rows from before it do not carry over: two writers that create the same table independently create two tables, and rows written to the earlier one before the later creation are dropped.

An application whose writers change a table's schema SHOULD order those changes itself, for example by leaving them to one writer or to governance, or supply a policy that orders them.

#### Row-Level Convergence

Under RowLWW, row merges are deterministic and converge across all replicas:
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
| `exportReplica()` | Export signed replica for lattice publication; refused if the node's key is not authorised for its owner |
| `mergeReplicas(ownerMap)` | Merge each accepted replica into the local database with its merge policy |

Which replicas are accepted is decided replica by replica. An application can apply another ownership rule, or replicate selectively, by overriding that check (`acceptsReplica` in the reference implementation).

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

A cached plan is valid only for the **binding** it was planned against: the schema and format version of each table it reads or writes, which together determine how that table's rows are read ([Format Version](#format-version), [Schema Format](#schema-format)). Row writes leave a table's binding unchanged. Dropping a table or replacing its schema changes it, whether by a local write or by a merge from another replica. The ctime is not part of the binding: it orders a table's creations and drops but does not change how rows are read, so re-creating a table with the same columns and version keeps cached plans valid.

An implementation MUST record, for each table a plan reads or writes, the binding of the table description the plan was validated against. Before a cached plan reads or writes a table's rows, it MUST check that the table still has the recorded binding. If the table has been dropped, or its schema or version differs, execution MUST fail rather than read or write its rows.

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
| `setAutoCommit(false)` | Forks the database (snapshot isolation) |
| `commit()` | Merges the fork's tables into the database with its merge policy |
| `rollback()` | Discards the fork |
| `setAutoCommit(true)` | Direct writes, no isolation |

A transaction forks the whole database, its unit of merging. On commit, the fork's state is merged with the database's current state using the database's merge policy, so the policy decides how the transaction's writes combine with concurrent ones. Under RowLWW, which the driver's `mem:` and `file:` databases use, a commit never fails because of a concurrent write.

An implementation MUST publish only the `:tables` section on commit and keep the database's other sections as they are. The transaction's state is the established side of that merge, so merging the whole database would undo concurrent changes to sections the transaction never touched.

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
conn.commit();  // Merged with the database's policy: RowLWW for jdbc:convex:mem

conn.close();
```

## PostgreSQL Wire Protocol

Convex SQL includes a PostgreSQL wire protocol server (`PgServer`), enabling any PostgreSQL-compatible client to connect:

```bash
psql -h localhost -p 5432 -d mydb
```

The PG server reuses the Calcite pipeline and ConvexSchema, providing the same SQL capabilities as the JDBC driver. A `pg_catalog` virtual schema provides compatibility with PostgreSQL client tooling.

Write operations (INSERT, UPDATE, DELETE) modify the local replica, which is then signed and propagated via the lattice.

The server keeps prepared statements on a client's behalf. When a kept statement's plan fails because a table's binding changed ([PreparedStatement Caching](#preparedstatement-caching)), the server SHOULD prepare the statement again from its SQL text. If the statement then returns rows of the same description, the server SHOULD execute it as if nothing had changed. Otherwise the server MUST fail each execution with SQLSTATE `0A000` until the client prepares the statement again, as PostgreSQL does, since the client may decode rows by the description it was given.

## Reference Implementation

A reference implementation is provided in the `convex-db` module (Java).

### Classes

| Specification Concept | Java Class | Package |
|-----------------------|------------|---------|
| Root database manager | `ConvexDB` | `convex.db` |
| SQL Database wrapper | `SQLDatabase` | `convex.db.lattice` |
| Table store view and operations | `SQLSchema` | `convex.db.lattice` |
| Table entry view and utilities | `SQLTable` | `convex.db.lattice` |
| Row utilities | `SQLRow` | `convex.db.lattice` |
| Per-row last-write-wins merge policy | `RowLWW` | `convex.db.lattice` |
| JDBC Driver | `ConvexDriver` | `convex.db.jdbc` |
| Calcite schema bridge | `ConvexSchema` | `convex.db.calcite` |
| Calcite table | `ConvexTable` | `convex.db.calcite` |
| DDL executor | `ConvexDdlExecutor` | `convex.db.calcite` |
| Relational operators (scan, filter, join, ...) | `ConvexTableScan` etc. | `convex.db.calcite.rel` |
| Planner rules | `ConvexRules` | `convex.db.calcite.rules` |
| PostgreSQL server | `PgServer` | `convex.db.psql` |

The `SQLDatabaseTest` and `ConvexDBTest` classes provide test coverage for table operations, JDBC and replication; `RowLWWTest` and `ConvexDBMergeTest` cover the merge policy and its use on every route.

### Example: Basic Table Operations

```java
// Create a database with a signing key and a merge policy
AKeyPair keyPair = AKeyPair.generate();
SQLDatabase db = SQLDatabase.create("mydb", keyPair, RowLWW::merge);

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

SQLDatabase dbA = SQLDatabase.create("shared", keyA, RowLWW::merge);
SQLDatabase dbB = SQLDatabase.create("shared", keyB, RowLWW::merge);

// A creates the table and B receives it: independent creations would be two tables
dbA.tables().createTable("data", new String[]{"id", "value"});
dbB.mergeReplicas(dbA.exportReplica());

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
| Merge Granularity | Per-key, type-specific | Per database, with the application's merge policy; RowLWW merges per row |
| Query Language | API methods | SQL (via Calcite) |
| Use Case | Caches, sessions, counters | Structured business data |

Both sign replicas per owner, apply the same owner verification rule ([CAD038](../038_lattice_auth/index.md)) and share the lattice replication infrastructure.

## See Also

- [CAD002: CVM Values](../002_values/index.md) — Value types used in table entries
- [CAD003: Encoding](../003_encoding/index.md) — Binary encoding format
- [CAD024: Lattice](../024_data_lattice/index.md) — Theoretical foundation
- [CAD035: Lattice Cursors](../035_cursors/index.md) — Cursor system for atomic state access
- [CAD036: Lattice Node](../036_lattice_node/index.md) — Network replication infrastructure
- [CAD037: KV Database](../037_kv_database/index.md) — Key-value store with similar lattice pattern
- [CAD038: Lattice Authentication](../038_lattice_auth/index.md) — Owner verification during merge
