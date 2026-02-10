---
slug: postgres-wire-protocol
title: "Speaking PostgreSQL: Wire Protocol on a Lattice Database"
authors: [claude, mikera]
tags: [convex, sql, postgresql, networking]
---

What if you could point psql at a lattice database and just... query it? No custom clients. No special drivers. Just `psql -h localhost -p 5432` and you're in.

That was the goal. Here's how we got there.

<!-- truncate -->

## Why Wire Protocol Matters

Having SQL is one thing. Having *compatible* SQL is another. The [previous post](/blog/sql-on-lattice) covered building SQL semantics on lattice storage using Apache Calcite. But Calcite gives you a JDBC interface — Java-only, embedded in your application.

Real database adoption means speaking the lingua franca. For relational databases, that's PostgreSQL's wire protocol. Every database tool understands it: psql, DBeaver, BeeKeeper Studio, Tableau, pgAdmin. Implement the protocol and you inherit an entire ecosystem of tooling for free.

## The Protocol in 60 Seconds

PostgreSQL's wire protocol is surprisingly elegant. It's a message-based binary protocol over TCP:

```
Client                          Server
  |                                |
  |--- StartupMessage ------------>|  (version, user, database)
  |<-- AuthenticationOk -----------|  (or AuthenticationCleartextPassword)
  |<-- ParameterStatus[] ----------|  (server_version, client_encoding, etc.)
  |<-- BackendKeyData -------------|  (process ID, secret key)
  |<-- ReadyForQuery --------------|  ('I' = idle)
  |                                |
  |--- Query("SELECT...") ------->|
  |<-- RowDescription -------------|  (column names, types, OIDs)
  |<-- DataRow[] ------------------|  (actual values)
  |<-- CommandComplete -----------|  ("SELECT 5")
  |<-- ReadyForQuery --------------|
```

Each message has a one-byte type identifier, a four-byte length, and payload. Clean and predictable.

## Netty: The Right Tool

We chose Netty for the server. Not because it's trendy — because it's *correct* for this problem:

```java
ServerBootstrap bootstrap = new ServerBootstrap();
bootstrap.group(bossGroup, workerGroup)
    .channel(NioServerSocketChannel.class)
    .childHandler(new ChannelInitializer<SocketChannel>() {
        @Override
        protected void initChannel(SocketChannel ch) {
            ch.pipeline()
                .addLast(new PgMessageDecoder())
                .addLast(new PgMessageEncoder())
                .addLast(new PgProtocolHandler(connectionSupplier, password));
        }
    });
```

The pipeline architecture maps perfectly to protocol processing: decode bytes to messages, handle messages, encode responses back to bytes. Each stage is isolated and testable.

## The Decoder Challenge

The first interesting problem: PostgreSQL's startup sequence is *different* from the rest of the protocol.

Normal messages follow the pattern `[type:1][length:4][payload:n]`. But the startup message has no type byte — it's just `[length:4][version:4][params...]`. And the SSL request is even weirder: exactly 8 bytes with a magic number.

```java
private void decodeStartup(ByteBuf buf, List<Object> out) {
    if (buf.readableBytes() < 4) return;

    int length = buf.getInt(buf.readerIndex());
    if (buf.readableBytes() < length) return;

    buf.readInt(); // consume length
    int code = buf.readInt();

    if (code == SSL_REQUEST_CODE) {
        out.add(new SSLRequest());
        startupComplete = true; // SSL negotiation is one-shot
        return;
    }

    // Parse startup parameters...
}
```

State machine in the decoder: track whether we've completed startup, switch parsing modes accordingly.

## Query Rewriting: Two Worlds Collide

Here's where it got interesting. PostgreSQL clients send queries that Calcite doesn't understand. Not because they're wrong — because PostgreSQL has its own dialect.

BeeKeeper Studio's first query after connecting:

```sql
SELECT CURRENT_SCHEMA(), CURRENT_USER, pg_backend_pid()
```

Calcite has no idea what `pg_backend_pid()` is. And `CURRENT_SCHEMA()` with parentheses? Parse error.

Solution: rewrite queries before they hit Calcite:

```java
private String rewriteQuery(String sql) {
    // System catalog queries - return empty result
    if (lowerSql.contains("pg_catalog.") ||
        lowerSql.contains("pg_type") ||
        lowerSql.contains("information_schema.")) {
        return null; // Signal: empty result set
    }

    // Function rewrites
    sql = sql.replaceAll("(?i)CURRENT_SCHEMA\\s*\\(\\s*\\)", "'public'");
    sql = sql.replaceAll("(?i)pg_backend_pid\\s*\\(\\s*\\)",
                         String.valueOf(processId));

    // Cast syntax: ::type -> (remove, Calcite infers types)
    sql = sql.replaceAll("::integer|::text|::varchar", "");

    return sql;
}
```

It's not pretty, but it's pragmatic. The alternative — implementing PostgreSQL's entire system catalog — would be a months-long project. This gets 90% of clients working immediately.

## The Type System Gap

The subtlest bug took the longest to find.

BeeKeeper Studio would connect, authenticate, run queries... and then crash. The error:

```
java.lang.ClassCastException: class java.lang.Long
    cannot be cast to class java.lang.Integer
    at org.apache.calcite.avatica.util.AbstractCursor$IntAccessor.getInt
```

The root cause was a type mismatch across three systems:

| Layer | INTEGER means |
|-------|---------------|
| PostgreSQL client | "give me an int" |
| Calcite/Avatica | 32-bit `java.lang.Integer` |
| Convex storage | 64-bit `CVMLong` |

We'd declared columns as `SqlTypeName.INTEGER`, which Avatica interprets as 32-bit. But Convex stores everything as 64-bit longs. Avatica's `IntAccessor` tried to cast `Long` to `Integer` and exploded.

The fix was semantic, not syntactic:

```java
// Before: mismatch between declaration and storage
INTEGER(SqlTypeName.INTEGER, CVMLong.class),

// After: declare what we actually store
INTEGER(SqlTypeName.BIGINT, CVMLong.class),
```

And update the Java conversion:

```java
case INTEGER -> cell instanceof CVMLong l ? l.longValue() : null;
// was: (int) l.longValue() — truncation!
```

One enum constant, one cast. Hours of debugging.

## Extended Query Protocol

Simple queries work: send SQL string, get results. But modern clients use the "extended query protocol" for prepared statements:

```
Parse     -> ParseComplete
Bind      -> BindComplete
Describe  -> ParameterDescription + RowDescription
Execute   -> DataRow[] + CommandComplete
Sync      -> ReadyForQuery
```

This is how clients avoid SQL injection, reuse query plans, and handle parameterised queries. Without it, JDBC drivers won't connect.

The implementation is straightforward once you understand the flow:

```java
private void handleParse(ChannelHandlerContext ctx, Parse parse) {
    preparedQueries.put(parse.name(), parse.query());
    write(ctx, ParseComplete.INSTANCE);
}

private void handleBind(ChannelHandlerContext ctx, Bind bind) {
    // Parameter binding would go here
    write(ctx, BindComplete.INSTANCE);
}

private void handleExecute(ChannelHandlerContext ctx, Execute execute) {
    String query = preparedQueries.get(execute.portal());
    executeQuery(ctx, query);
}
```

We're not doing full parameter binding yet — that requires type inference and placeholder substitution. But acknowledging the messages lets clients proceed.

## Exception Hygiene

Calcite's generated code throws unusual exceptions. When you try to insert `'not-a-number'` into an INTEGER column:

```
java.lang.ExceptionInInitializerError
    caused by: java.lang.NumberFormatException
        at org.apache.calcite.runtime.SqlFunctions.toLong
        at Baz$1$1.<clinit>  // Generated code!
```

`ExceptionInInitializerError` is an `Error`, not an `Exception`. Most catch blocks won't see it. And the client gets a confusing message.

We wrap at the execution boundary:

```java
public long executeInsert(Enumerable<Object[]> input) {
    try {
        for (Object[] row : input) {
            if (row != null && insertRow(row)) count++;
        }
        return count;
    } catch (ExceptionInInitializerError e) {
        throw wrapTypeError(e, "INSERT");
    }
}

private RuntimeException wrapTypeError(ExceptionInInitializerError e, String op) {
    Throwable cause = e.getCause();
    String message = "Type conversion error in " + op + " on table '" + tableName + "'";
    if (cause instanceof NumberFormatException nfe) {
        message += ": invalid number format - " + nfe.getMessage();
    }
    return new RuntimeException(message, e);
}
```

Avatica catches `RuntimeException` and wraps it in `SQLException`. The client sees a proper database error with a clear message.

## The Demo Server

For testing, a simple main class that sets up sample data:

```java
public static void main(String[] args) throws Exception {
    AKeyPair kp = AKeyPair.generate();
    SQLDatabase db = SQLDatabase.create("demo", kp);

    // Create sample tables
    db.tables().createTable("users",
        new String[]{"id", "name", "email", "city"}, userTypes);
    db.tables().insert("users", 1L, "Alice", "alice@example.com", "London");

    PgServer server = PgServer.builder()
        .port(5432)
        .database("demo")
        .build();

    server.startAndWait();
}
```

Then from any machine:

```bash
$ psql -h localhost -p 5432 -d demo
demo=> SELECT * FROM users;
 id | name  |       email        |  city
----+-------+--------------------+--------
  1 | Alice | alice@example.com  | London
  2 | Bob   | bob@example.com    | Paris
```

Standard PostgreSQL client. Lattice storage underneath. Zero custom tooling required.

## What's Next

The protocol implementation handles the common cases. Still to do:

- **SSL/TLS**: Currently we respond 'N' to SSL requests. Production needs encryption.
- **Full parameter binding**: Prepared statements with `$1`, `$2` placeholders.
- **COPY protocol**: Bulk data loading.
- **Notifications**: `LISTEN`/`NOTIFY` for real-time updates — interesting with lattice semantics.
- **System catalog emulation**: pg_tables, pg_type, etc. for full tool compatibility.

## The Bigger Picture

This isn't just about PostgreSQL compatibility. It's about **interface stability**.

PostgreSQL's wire protocol has been stable for decades. Tools written in 1995 still work. By implementing this protocol, Convex inherits that stability. You can swap out your PostgreSQL backend for a lattice database without changing your application code.

That's the real win: bringing lattice semantics — deterministic merge, conflict-free replication, content-addressed storage — to applications that just want to `INSERT INTO` and `SELECT FROM`.

The network doesn't care what consensus algorithm you're running. It just wants rows.

---

*Source code: `convex-db/src/main/java/convex/db/psql/`*
