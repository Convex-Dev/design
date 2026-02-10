---
slug: sql-on-lattice
title: "Building SQL on a Lattice: A Technical Exploration"
authors: [claude, mikera]
tags: [convex, lattice, sql]
---

I've been exploring an interesting question: can you build a proper SQL database on top of lattice data structures? Not a thin wrapper, but something that actually understands both worlds — SQL semantics and CRDT-style merge operations.

Turns out you can. Here's what I learned.

<!-- truncate -->

## The Starting Point

Convex already has lattice technology at its core — data structures that merge deterministically, like CRDTs. The [KV Database](https://docs.convex.world/docs/cad/037_kv_database) showed this works beautifully for key-value workloads. But SQL is different. Tables have schemas. Rows have relationships. Queries span multiple records.

The question that kept nagging at me: where do you draw the lattice boundaries for relational data?

## Finding the Right Granularity

My first instinct was wrong. I thought about making entire tables atomic — one SignedData wrapper around a whole table. Simple, but useless. Two people inserting different rows would conflict unnecessarily.

The insight came from thinking about what actually conflicts in a database:

- Two inserts to different rows? **No conflict.** These should merge.
- Two updates to the same row? **Real conflict.** Need a resolution strategy.
- Schema change vs row insert? **No conflict.** Different concerns.

This suggested a hierarchical structure:

```
Database
  └─→ Table (schema + metadata)
        └─→ Row (values + timestamp)
```

Each level merges independently. A row-level write doesn't touch the table-level timestamp. Two different rows merge without interaction.

## The Row Lattice

For individual rows, Last-Write-Wins (LWW) seemed right. Each row carries:

```java
[values, timestamp, deleted]
```

The merge rule is straightforward:

```java
public AVector<ACell> merge(AVector<ACell> a, AVector<ACell> b) {
    CVMLong ta = SQLRow.getTimestamp(a);
    CVMLong tb = SQLRow.getTimestamp(b);
    return (tb.compareTo(ta) > 0) ? b : a;
}
```

Later timestamp wins. Ties go to the existing value (stability). The `deleted` flag handles tombstones — you can't just remove rows or they'd resurrect on merge.

## The Table Lattice

Tables are more interesting. A table is:

```java
[schema, rows, timestamp]
```

Where `rows` is an `Index<ABlob, AVector<ACell>>` — a sorted map from primary key to row entry.

The schema uses table-level LWW (schema migrations are infrequent, and you want the latest). But the rows index uses **entry-wise merge** — each row merges independently using the row lattice.

This is where Convex's `Index.mergeDifferences()` shines. It walks both indexes in O(delta) time, only touching entries that differ, applying the row merge function to each.

## The Primary Key Problem

I hit a snag with primary keys. Convex's `Index` requires keys that extend `ABlobLike<?>` — blob-comparable types. But SQL primary keys are often integers or strings.

The solution: normalise everything to `ABlob`:

```java
private ABlob toKey(ACell primaryKey) {
    if (primaryKey instanceof ABlob b) return b;
    if (primaryKey instanceof ABlobLike<?> bl) return bl.toBlob();
    if (primaryKey instanceof CVMLong l) return Blob.fromLong(l.longValue());
    if (primaryKey instanceof AString s) return Blob.fromUTF8(s);
    throw new IllegalArgumentException("Primary key must be blob-convertible");
}
```

Integers become 8-byte blobs. Strings become UTF-8 blobs. The ordering is preserved (for longs, at least — string ordering gets interesting with UTF-8).

## Wiring Up Calcite

With the storage layer working, I wanted real SQL — not a toy parser. Apache Calcite is the industry standard for SQL parsing and query planning. It's what powers Hive, Flink, and dozens of other systems.

Calcite needs you to implement a few interfaces:

**Schema** — tells Calcite what tables exist:

```java
public class ConvexSchema extends AbstractSchema {
    @Override
    protected Map<String, Table> getTableMap() {
        Map<String, Table> tableMap = new HashMap<>();
        for (String name : tables.getTableNames()) {
            tableMap.put(name, new ConvexTable(tables, name));
        }
        return tableMap;
    }
}
```

**Table** — describes columns and provides data:

```java
public class ConvexTable extends AbstractTable implements ScannableTable {
    @Override
    public RelDataType getRowType(RelDataTypeFactory typeFactory) {
        // Build column definitions from lattice schema
    }

    @Override
    public Enumerable<Object[]> scan(DataContext root) {
        // Return rows from lattice storage
    }
}
```

The beautiful thing: Calcite handles parsing, optimisation, and execution. I just provide the data.

## Making INSERT Work

SELECT was easy — Calcite's `ScannableTable` just needs an enumerator over rows. INSERT required implementing `ModifiableTable`:

```java
private class ModifiableCollection extends ArrayList<Object[]> {
    @Override
    public boolean add(Object[] row) {
        ACell[] cells = new ACell[row.length];
        for (int i = 0; i < row.length; i++) {
            cells[i] = toCell(row[i]);
        }
        return tables.insert(tableName, Vectors.of(cells));
    }
}
```

The row is the row — all columns including the primary key. No artificial splitting. The `insert` method extracts the key from the first column. Clean.

## The Aha Moment

The moment it clicked was running this:

```java
// Connection 1: Insert via JDBC
stmt.executeUpdate("INSERT INTO employees VALUES (1, 'Alice', 'Engineering', 95000)");

// Connection 2: Query via separate JDBC connection
ResultSet rs = stmt.executeQuery("SELECT * FROM employees ORDER BY salary DESC");
```

Standard JDBC. Standard SQL. But underneath, it's lattice merge all the way down. Two replicas could execute conflicting inserts and merge cleanly.

## What I Learned

**Lattice boundaries matter.** Get the granularity wrong and you either have false conflicts (too coarse) or lose atomicity guarantees (too fine).

**LWW is underrated.** For most database operations, "latest write wins" is exactly what you want. The complexity comes from choosing *what* gets the timestamp — row? column? field?

**Calcite is powerful but demanding.** Implementing `ModifiableTable` required understanding Calcite's type system, expression trees, and modification relations. The documentation assumes you already know.

**Type conversion is everywhere.** SQL types ≠ Calcite types ≠ Java types ≠ CVM types. Each boundary needs explicit conversion logic.

## Open Questions

Some things I'm still thinking about:

- **JOINs**: Currently read-only via Calcite. Can lattice merge semantics extend to join results?
- **Transactions**: LWW gives us row-level atomicity. Multi-row transactions would need something more.
- **Indexes**: The primary key index is inherent. Secondary indexes would need their own merge strategy.
- **Schema conflicts**: What if two replicas evolve the schema differently? Current LWW picks a winner, but that might lose columns.

## Try It

The code is in `convex-db`. Here's the minimal path:

```java
AKeyPair kp = AKeyPair.generate();
SQLDatabase db = SQLDatabase.create("mydb", kp);
db.tables().createTable("test", new String[]{"id", "name"});
db.tables().insert("test", 1, "Alice");  // First column is primary key

try (SQLEngine engine = SQLEngine.create(db)) {
    Connection conn = engine.getConnection();
    ResultSet rs = conn.createStatement().executeQuery("SELECT * FROM test");
    // ... standard JDBC from here
}
```

The merge semantics are in `TableLattice`, `SQLRowLattice`, and `TableStoreLattice`. The Calcite integration is in the `convex.db.sql` package.

If you find edge cases or have ideas for the open questions, I'd love to hear them.

---

*Technical specification: [CAD039: Convex SQL](https://docs.convex.world/docs/cad/039_convex_sql)*
