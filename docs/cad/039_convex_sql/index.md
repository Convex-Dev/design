# CAD039: Convex SQL

## Overview

Convex SQL is a SQL database layer built on the [Lattice](../024_data_lattice/index.md). It provides relational table storage that replicates by lattice merge, enabling SQL-like operations over distributed, replicated data structures. Tables support schema definitions, primary key indexing, and replication via [Lattice Nodes](../036_lattice_node/index.md). How concurrent writes combine is a merge policy chosen by the application that uses the database.

Convex SQL brings standard SQL queries to lattice data, bridging familiar database paradigms with the convergent properties of lattice technology.

## Motivation

While the [KV Database](../037_kv_database/index.md) provides excellent support for key-value workloads, many applications require:

- **Relational data models** with defined schemas and typed columns
- **SQL query language** for complex queries, joins, and aggregations
- **Table-based organisation** for structured business data
- **Primary key indexing** for efficient row lookups
- **Schema evolution** with controlled migrations

Traditional distributed databases solve these problems with consensus protocols or conflict resolution callbacks. Convex SQL instead merges copies of a database with a lattice merge, so every copy converges whatever order updates arrive in. The application decides what they converge to. With one writer, every copy converges to that writer's data. With several writers, copies converge to whatever the application's [merge policy](#merge-policy) defines, and relational guarantees across writers are the policy's to give.

### Design Goals

- Provide familiar SQL (CREATE TABLE, INSERT, SELECT, UPDATE, DELETE)
- Support schema definitions with typed columns
- Enable primary key indexing with ordered retrieval
- Sign each owner's databases, so that replicas authenticate their owner

## Specification

### Lattice Structure

:::note Location
Where a database lives is the choice of the application that uses it: an application's own databases live in its state under `:app` ([CAD045](../045_lattice_apps/index.md)). [CAD053](../053_lattice_regions/index.md) reserves the `:sql` region for databases published for many applications to read, such as reference tables, each owner's under the signed owner envelope below. What the region holds is not yet defined beyond that.
:::

A **database map** holds databases by name. Each database is a keyword-keyed structure: the `:tables` section holds the table store, leaving room for further per-database sections in future.

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

A table entry's ctime records when the table was created, or for a tombstone when it was dropped. Only creating or dropping a table sets it: row writes and deletions MUST leave it unchanged. Each row entry records when the row was written.

Timestamps come from the writer's clock, which the application supplies, and merges take them as written; the reference implementation defaults to the runtime clock, in milliseconds since 1970-01-01T00:00:00 UTC.

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

A tombstone is a table entry with `nil` schema; its ctime records when the table was dropped. DROP TABLE writes it with `nil` rows. A merge policy may keep rows in a tombstone. Readers MUST treat an entry with `nil` schema as a dropped table, whatever its rows.

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

#### Path Delivery

A value delivered to a path below a database ([CAD036](../036_lattice_node/index.md#path-based-operations)) is merged as a database state holding only what was delivered. Sub-lattice resolution stops at the database: there is no separate merge for a table or a row, so a delivery gives the same result as merging the equivalent database state.

| Path below the database | Merged as |
|-------------------------|-----------|
| `[:tables]` | The table store |
| `[:tables name]` | One table entry |
| `[:tables name 1]` | The table's rows, in an entry without a ctime |
| `[:tables name 1 key]` | One row, in an entry without a ctime |

An entry without a ctime carries only rows, and the policy decides whether they apply. Convex SQL defines only the `:tables` section, so values delivered to other sections are not merged. A delivery to any other path into a table entry MUST be refused.

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
2. The node exports its replica as a signed owner map
3. Replicas are exchanged between nodes (no root region is defined for this; see the location note above)
4. On receive, the node accepts or refuses each replica in the owner map, as described under [Ownership and Authentication](#ownership-and-authentication)
5. The node merges each accepted replica's state for the database into its own database, with the database's merge policy

A node that absorbs other owners' replicas into its own database has several writers by construction, so its merge policy must combine their writes.

## SQL

Convex SQL presents each live table to SQL with its declared column types ([Column Types](#column-types)), and supports CREATE TABLE, DROP TABLE, SELECT, INSERT, UPDATE and DELETE. Queries read the node's own copy of the database; writes change it, and reach other nodes by replication.

### Writes

Each write changes the database as follows, where *t* is the writer's clock reading ([Timestamps](#timestamps)):

| Statement | Written |
|-----------|---------|
| CREATE TABLE | A table entry with the declared schema, no rows, ctime *t* and live count 0, in the version new tables are created in ([Format Version](#format-version)) |
| DROP TABLE | A tombstone: `nil` schema, `nil` rows and ctime *t* |
| INSERT | A row entry `[values, t, nil]` under the row's primary key |
| DELETE | A row tombstone `[nil, t, t]` under the row's primary key |
| UPDATE | As a DELETE of the old row and an INSERT of the new one |

### Prepared Statements

An implementation may cache the plan of a prepared statement, to execute it again with other parameters without planning it again.

A cached plan is valid only for the **binding** it was planned against: the schema and format version of each table it reads or writes, which together determine how that table's rows are read ([Format Version](#format-version), [Schema Format](#schema-format)). Row writes leave a table's binding unchanged. Dropping a table or replacing its schema changes it, whether by a local write or by a merge from another replica. The ctime is not part of the binding: it orders a table's creations and drops but does not change how rows are read, so re-creating a table with the same columns and version keeps cached plans valid.

An implementation MUST record, for each table a plan reads or writes, the binding of the table description the plan was validated against. Before a cached plan reads or writes a table's rows, it MUST check that the table still has the recorded binding. If the table has been dropped, or its schema or version differs, execution MUST fail rather than read or write its rows.

### Transactions

A transaction works on a fork of the whole database, its unit of merging, and so reads a snapshot of it. On commit, the fork's state is merged with the database's current state using the database's merge policy, so the policy decides how the transaction's writes combine with concurrent ones. A rollback discards the fork.

An implementation MUST publish only the `:tables` section on commit and keep the database's other sections as they are. The transaction's state is the established side of that merge, so merging the whole database would undo concurrent changes to sections the transaction never touched.

### PostgreSQL Wire Protocol

An implementation may serve Convex SQL over the PostgreSQL wire protocol, so that PostgreSQL clients can connect, with a `pg_catalog` schema for PostgreSQL client tooling.

Such a server keeps prepared statements on a client's behalf. When a kept statement's plan fails because a table's binding changed ([Prepared Statements](#prepared-statements)), the server SHOULD prepare the statement again from its SQL text. If the statement then returns rows of the same description, the server SHOULD execute it as if nothing had changed. Otherwise the server MUST fail each execution with SQLSTATE `0A000` until the client prepares the statement again, as PostgreSQL does, since the client may decode rows by the description it was given.

## Reference Implementation

The reference implementation is the `convex-db` module of the [Convex repository](https://github.com/Convex-Dev/convex), in Java. Its README and `docs/` describe its API. Notes:

- `ConvexDB` holds a database map. `SQLDatabase`, `SQLSchema` and `SQLTable` are views of a database, its table store and a table entry.
- `RowLWW` is a merge policy, per-row last-write-wins, described in `convex-db/docs/LATTICE-DB-ARCHITECTURE.md`.
- SQL is parsed and planned with Apache Calcite.
- The JDBC driver opens databases by URL: `jdbc:convex:mem:<name>` in memory, `jdbc:convex:file:<path>` in an Etch store. Both merge with `RowLWW`.
- `PgServer` serves the PostgreSQL wire protocol.
- An application can accept replicas selectively by overriding `SQLDatabase.acceptsReplica`.

## Comparison with KV Database

| Aspect | KV Database (CAD037) | Convex SQL (CAD039) |
|--------|---------------------|---------------------|
| Data Model | Key-value | Relational tables |
| Schema | Implicit (type tag per entry) | Explicit column definitions |
| Key Types | String keys | Primary key (blob-like) |
| Value Types | Multiple (string, hash, set, counter, etc.) | Row vectors |
| Merge Granularity | Per-key, type-specific | Per database, with the application's merge policy |
| Query Language | API methods | SQL |
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
