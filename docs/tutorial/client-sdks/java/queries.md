---
sidebar_position: 2
---

# Queries

Queries are read-only operations that execute Convex Lisp code without modifying network state.

## Basic Query Pattern

Execute Convex Lisp code as a read-only query:

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.cvm.Address;
import convex.core.lang.Reader;
import java.util.concurrent.CompletableFuture;

Convex convex = Convex.connect("https://peer.convex.live");

// Execute a query
CompletableFuture<Result> future = convex.query(
    Reader.read("(+ 1 2 3)"),
    Address.create(1)  // Execution context address
);

Result result = future.get();
System.out.println("Result: " + result.getValue());  // 6
```

## Queries are Free

Unlike transactions, queries:

- ✅ **Don't consume juice** - completely free to execute
- ✅ **Don't require balance** - work even with zero funds
- ✅ **Don't need signatures** - read-only access
- ✅ **Execute instantly** - no consensus delay

## Query Methods

### `query(ACell form, Address address)`

Execute Convex Lisp source code as a read-only query.

```java
ACell form = Reader.read("(balance #123)");
Address address = Address.create(1);  // Context address

CompletableFuture<Result> future = convex.query(form, address);
Result result = future.get();

if (result.isError()) {
    System.err.println("Query failed: " + result.getErrorCode());
} else {
    System.out.println("Balance: " + result.getValue());
}
```

**Parameters:**
- `form` (ACell): Convex Lisp expression to execute
- `address` (Address): Account address for execution context

**Returns:** `CompletableFuture<Result>` with query result

## Query Patterns

### Checking Balances

```java
// Query any account's balance
Address targetAddress = Address.create(123);

Result result = convex.query(
    Reader.read("(balance " + targetAddress + ")"),
    Address.create(1)  // Any valid address for context
).get();

if (!result.isError()) {
    long balanceCopper = ((Number) result.getValue()).longValue();
    double balanceCoins = balanceCopper / 1_000_000_000.0;
    System.out.println("Balance: " + balanceCoins + " CVX");
}
```

### Reading Contract State

```java
// Query a deployed contract
Address contractAddress = Address.create(789);

Result result = convex.query(
    Reader.read("(call " + contractAddress + " (get-count))"),
    Address.create(1)
).get();

if (!result.isError()) {
    System.out.println("Contract count: " + result.getValue());
}
```

### Evaluating Expressions

```java
// Test Convex Lisp expressions
Result result = convex.query(
    Reader.read("(map inc [1 2 3 4 5])"),
    Address.create(1)
).get();

System.out.println("Result: " + result.getValue());
// [2, 3, 4, 5, 6]
```

### Reading Global State

```java
// Access special variables (requires address context)
Address myAddress = Address.create(1234);

// Query my balance
Result balance = convex.query(
    Reader.read("*balance*"),
    myAddress
).get();

// Query my address
Result address = convex.query(
    Reader.read("*address*"),
    myAddress
).get();

// Query current timestamp
Result timestamp = convex.query(
    Reader.read("*timestamp*"),
    myAddress
).get();
```

## Advanced Queries

### Multi-Step Queries

Execute multiple expressions in one query using `do`:

```java
String query = """
(do
  (def x 10)
  (def y 20)
  (+ x y))
""";

Result result = convex.query(
    Reader.read(query),
    Address.create(1)
).get();

System.out.println("Result: " + result.getValue());  // 30
```

### Conditional Queries

Use Lisp conditionals to query based on state:

```java
Address myAddress = Address.create(1234);

String query = """
(if (> *balance* 1000000)
  "Rich account"
  "Poor account")
""";

Result result = convex.query(
    Reader.read(query),
    myAddress
).get();

System.out.println(result.getValue());
```

### Async Query Patterns

Handle queries asynchronously with CompletableFuture:

```java
// Execute multiple queries in parallel
CompletableFuture<Result> query1 = convex.query(
    Reader.read("(balance #100)"),
    Address.create(1)
);

CompletableFuture<Result> query2 = convex.query(
    Reader.read("(balance #200)"),
    Address.create(1)
);

// Wait for all queries to complete
CompletableFuture.allOf(query1, query2).get();

System.out.println("Account #100: " + query1.get().getValue());
System.out.println("Account #200: " + query2.get().getValue());
```

### Query with Callbacks

Process results asynchronously:

```java
convex.query(
    Reader.read("(balance #123)"),
    Address.create(1)
).thenAccept(result -> {
    if (!result.isError()) {
        long balance = ((Number) result.getValue()).longValue();
        System.out.println("Balance: " + balance);
    }
}).exceptionally(ex -> {
    System.err.println("Query failed: " + ex.getMessage());
    return null;
});
```

## Error Handling

Queries can fail due to syntax errors or runtime errors:

```java
Result result = convex.query(
    Reader.read("(invalid-function)"),
    Address.create(1)
).get();

if (result.isError()) {
    String errorCode = result.getErrorCode().toString();
    System.err.println("Query failed: " + errorCode);
    System.err.println("Message: " + result.getValue());
}
```

Common error codes:
- `UNDECLARED` - Symbol not found
- `CAST` - Type error
- `ARITY` - Wrong number of arguments
- `BOUNDS` - Index out of bounds
- `NOBODY` - Account doesn't exist

## Result Handling

Working with query results:

```java
Result result = convex.query(
    Reader.read("(map inc [1 2 3])"),
    Address.create(1)
).get();

// Check if successful
if (result.isError()) {
    System.err.println("Error: " + result.getErrorCode());
    return;
}

// Get value (may need casting)
ACell value = result.getValue();

// Check type and extract
if (value instanceof AVector) {
    AVector<?> vector = (AVector<?>) value;
    System.out.println("Vector length: " + vector.count());

    for (int i = 0; i < vector.count(); i++) {
        System.out.println("  [" + i + "]: " + vector.get(i));
    }
}
```

## Best Practices

### 1. Query Before Transacting

Test expressions with queries before submitting transactions:

```java
// Test with query first (free)
Result testResult = convex.query(
    Reader.read("(transfer #456 1000000)"),
    myAddress
).get();

if (!testResult.isError()) {
    // If successful, transact
    convex.transact(Reader.read("(transfer #456 1000000)")).get();
}
```

### 2. Use Queries for Read-Only Data

Never use transactions when queries suffice:

```java
// ❌ BAD - wastes juice
Result result = convex.transact(
    Reader.read("(balance #123)")
).get();

// ✅ GOOD - free query
Result result = convex.query(
    Reader.read("(balance #123)"),
    Address.create(1)
).get();
```

### 3. Cache Query Results

Query results don't change unless someone transacts:

```java
// Cache contract metadata
Result metadata = convex.query(
    Reader.read("(call " + contractAddress + " (get-metadata))"),
    Address.create(1)
).get();

// Reuse cached metadata until state changes
AMap<?, ?> metadataMap = (AMap<?, ?>) metadata.getValue();
```

### 4. Handle Timeouts

Set appropriate timeouts for queries:

```java
try {
    Result result = convex.query(
        Reader.read("(complex-computation)"),
        Address.create(1)
    ).get(5, TimeUnit.SECONDS);  // 5 second timeout
} catch (TimeoutException e) {
    System.err.println("Query timed out");
}
```

### 5. Batch Related Queries

Use `do` to execute multiple queries in one request:

```java
String batchQuery = """
(do
  (def balance *balance*)
  (def timestamp *timestamp*)
  {:balance balance :timestamp timestamp})
""";

Result result = convex.query(
    Reader.read(batchQuery),
    myAddress
).get();

// Result is a map with both values
AMap<?, ?> resultMap = (AMap<?, ?>) result.getValue();
```

## Performance Tips

### Minimize Query Complexity

Complex queries take longer to execute:

```java
// ❌ SLOW - iterates entire range
Result result = convex.query(
    Reader.read("(reduce + (range 1000000))"),
    Address.create(1)
).get();

// ✅ FAST - simple arithmetic
Result result = convex.query(
    Reader.read("(* 1000000 500000)"),
    Address.create(1)
).get();
```

### Use Parallel Queries

Execute independent queries concurrently:

```java
List<Address> addresses = List.of(
    Address.create(100),
    Address.create(200),
    Address.create(300)
);

List<CompletableFuture<Result>> futures = addresses.stream()
    .map(addr -> convex.query(
        Reader.read("(balance " + addr + ")"),
        Address.create(1)
    ))
    .toList();

// Wait for all to complete
CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get();

// Process results
for (int i = 0; i < futures.size(); i++) {
    Result result = futures.get(i).get();
    System.out.println("Account " + addresses.get(i) + ": " + result.getValue());
}
```

## Working with Data Types

### Extracting Values

```java
Result result = convex.query(
    Reader.read("(+ 1 2)"),
    Address.create(1)
).get();

// Numbers
if (result.getValue() instanceof CVMLong) {
    CVMLong num = (CVMLong) result.getValue();
    long value = num.longValue();
}

// Strings
if (result.getValue() instanceof AString) {
    AString str = (AString) result.getValue();
    String value = str.toString();
}

// Vectors
if (result.getValue() instanceof AVector) {
    AVector<?> vec = (AVector<?>) result.getValue();
    long count = vec.count();
}

// Maps
if (result.getValue() instanceof AMap) {
    AMap<?, ?> map = (AMap<?, ?>) result.getValue();
    ACell value = map.get(Keywords.BALANCE);
}
```

## Next Steps

- **[Transaction Guide](transactions)** - Learn how to modify network state
- **[Account Management](accounts)** - Manage keys and accounts
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp)** - Learn the query language
