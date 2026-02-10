---
sidebar_position: 3
---

# Transactions

Transactions are state-changing operations that execute Convex Lisp code and modify the network state.

## Transaction Basics

Unlike queries, transactions:

- ⚡ **Modify state** - Change account balances, deploy contracts, update data
- 💰 **Consume juice** - Require Convex Coins to pay for execution
- 🔐 **Require signing** - Must be cryptographically signed by account key
- ⏱️ **Achieve consensus** - Confirmed by network consensus (sub-second)
- 📈 **Increment sequence** - Each account has a monotonic sequence number

## Basic Transaction Pattern

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

Convex convex = Convex.connect("https://peer.convex.live");

// Set up account
AKeyPair keyPair = AKeyPair.generate();
convex.setKeyPair(keyPair);
convex.setAddress(Address.create(1234));

// Execute a transaction
Result result = convex.transact(
    Reader.read("(def my-value 42)")
).get();

if (result.isError()) {
    System.err.println("Transaction failed: " + result.getErrorCode());
} else {
    System.out.println("Result: " + result.getValue());
}
```

## Transaction Methods

### `transact(ACell form)`

Execute Convex Lisp source code as a state-changing transaction.

```java
ACell form = Reader.read("(def x 10)");

CompletableFuture<Result> future = convex.transact(form);
Result result = future.get();

if (result.isError()) {
    System.err.println("Error: " + result.getErrorCode());
} else {
    System.out.println("Success: " + result.getValue());
}
```

**Parameters:**
- `form` (ACell): Convex Lisp expression to execute

**Returns:** `CompletableFuture<Result>` with transaction result

### `transact(SignedData<ATransaction> signed)`

Submit a pre-signed transaction:

```java
import convex.core.transactions.Invoke;
import convex.core.data.SignedData;

Address myAddress = convex.getAddress();

// Create transaction
ATransaction tx = Invoke.create(myAddress, Reader.read("(def x 42)"));

// Sign with key pair
SignedData<ATransaction> signed = convex.getKeyPair().signData(tx);

// Submit
Result result = convex.transact(signed).get();
```

## Transaction Costs

Every transaction consumes **juice** based on:

1. **Memory usage** - Creating new data structures
2. **Computation** - CPU cycles for execution
3. **Storage** - Persisting data on-chain

Example juice costs:

```java
// Check balance before transaction
Result balanceBefore = convex.query(
    Reader.read("(balance " + myAddress + ")"),
    myAddress
).get();

long before = ((Number) balanceBefore.getValue()).longValue();

// Execute transaction
convex.transact(Reader.read("(def x [1 2 3 4 5])")).get();

// Calculate juice consumed
Result balanceAfter = convex.query(
    Reader.read("(balance " + myAddress + ")"),
    myAddress
).get();

long after = ((Number) balanceAfter.getValue()).longValue();
long juiceConsumed = before - after;

System.out.println("Juice consumed: " + juiceConsumed + " copper");
```

Typical costs:
- **Simple expression**: 1,000 - 5,000 copper
- **Transfer**: 2,000 - 3,000 copper
- **Define variable**: 1,500 - 10,000 copper
- **Deploy contract**: 50,000 - 500,000 copper

## Transaction Patterns

### Defining Variables

Store data in your account's environment:

```java
// Define a simple value
convex.transact(Reader.read("(def my-number 42)")).get();

// Define a collection
convex.transact(Reader.read("(def my-list [1 2 3 4 5])")).get();

// Define a map
convex.transact(Reader.read("(def my-map {:name \"Alice\" :age 30})")).get();

// Read back with a query
Result result = convex.query(
    Reader.read("my-number"),
    myAddress
).get();

System.out.println("Value: " + result.getValue());  // 42
```

### Transferring Funds

```java
// Transfer 0.05 CVX (50 million copper)
Address recipientAddress = Address.create(456);
long amount = 50_000_000L;

Result result = convex.transact(
    Reader.read("(transfer " + recipientAddress + " " + amount + ")")
).get();

if (!result.isError()) {
    System.out.println("Transferred " + (amount / 1_000_000_000.0) + " CVX");
} else {
    System.err.println("Transfer failed: " + result.getErrorCode());
}
```

### Deploying Smart Contracts

Deploy an actor (smart contract) using `deploy`:

```java
String contractSource = """
(deploy
  (do
    (def count 0)

    (defn increment []
      (def count (inc count))
      count)

    (defn get-count []
      count)))
""";

Result result = convex.transact(Reader.read(contractSource)).get();

if (!result.isError()) {
    Address contractAddress = (Address) result.getValue();
    System.out.println("Contract deployed at: " + contractAddress);
} else {
    System.err.println("Deployment failed: " + result.getErrorCode());
}
```

### Calling Deployed Contracts

Interact with deployed actors:

```java
Address contractAddress = Address.create(789);

// Call actor function
Result result = convex.transact(
    Reader.read("(call " + contractAddress + " (increment))")
).get();

if (!result.isError()) {
    System.out.println("New count: " + result.getValue());
}

// Query actor state (free)
Result queryResult = convex.query(
    Reader.read("(call " + contractAddress + " (get-count))"),
    myAddress
).get();

System.out.println("Current count: " + queryResult.getValue());
```

### Multi-Step Transactions

Execute multiple operations atomically:

```java
String transaction = """
(do
  (def x 10)
  (def y 20)
  (def sum (+ x y))
  (transfer #456 sum)
  sum)
""";

Result result = convex.transact(Reader.read(transaction)).get();

if (!result.isError()) {
    System.out.println("Transferred " + result.getValue() + " copper");
}
```

If any step fails, the entire transaction is rolled back.

## Sequence Numbers

Every transaction increments the account's sequence number:

```java
// Get account info with sequence
Result info = convex.query(
    Reader.read("(get-account " + myAddress + ")"),
    Address.create(1)
).get();

// The SDK automatically manages sequence numbers
// You rarely need to handle them manually
```

## Error Handling

Transactions can fail for various reasons:

```java
Result result = convex.transact(
    Reader.read("(transfer #999999 1000000000000)")
).get();

if (result.isError()) {
    String errorCode = result.getErrorCode().toString();

    switch (errorCode) {
        case "FUNDS":
            System.err.println("Insufficient balance");
            break;
        case "NOBODY":
            System.err.println("Recipient account does not exist");
            break;
        case "SEQUENCE":
            System.err.println("Sequence error (rare with single-threaded use)");
            break;
        case "CAST":
            System.err.println("Type error in transaction");
            break;
        default:
            System.err.println("Transaction failed: " + errorCode);
            System.err.println("Message: " + result.getValue());
    }
}
```

Common error codes:

| Code | Meaning | Solution |
|------|---------|----------|
| `FUNDS` | Insufficient balance | Request more funds or reduce amount |
| `NOBODY` | Account doesn't exist | Create recipient account first |
| `SEQUENCE` | Sequence mismatch | Avoid concurrent transactions on same account |
| `CAST` | Type error | Fix Lisp expression |
| `UNDECLARED` | Symbol not found | Check variable/function names |
| `ARGUMENT` | Invalid argument | Check function parameters |

## Advanced Patterns

### Async Transaction Handling

Execute transactions asynchronously:

```java
// Submit transaction without blocking
CompletableFuture<Result> future = convex.transact(
    Reader.read("(def x 42)")
);

// Do other work while transaction processes
System.out.println("Transaction submitted...");

// Handle result when ready
future.thenAccept(result -> {
    if (!result.isError()) {
        System.out.println("Transaction successful: " + result.getValue());
    } else {
        System.err.println("Transaction failed: " + result.getErrorCode());
    }
}).exceptionally(ex -> {
    System.err.println("Exception: " + ex.getMessage());
    return null;
});
```

### Batch Transactions

Submit multiple transactions sequentially:

```java
List<String> transactions = List.of(
    "(def x 10)",
    "(def y 20)",
    "(def sum (+ x y))"
);

for (String tx : transactions) {
    Result result = convex.transact(Reader.read(tx)).get();

    if (result.isError()) {
        System.err.println("Transaction failed: " + result.getErrorCode());
        break;  // Stop on first error
    }

    System.out.println("Success: " + result.getValue());
}
```

### Conditional Transactions

Execute different logic based on conditions:

```java
String transaction = """
(if (> *balance* 1000000)
  (transfer #456 500000)
  :insufficient-funds)
""";

Result result = convex.transact(Reader.read(transaction)).get();

if (!result.isError()) {
    System.out.println("Result: " + result.getValue());
}
```

### Setting Account Keys

Transfer account control to a new key pair:

```java
// Generate new keys
AKeyPair newKeys = AKeyPair.generate();

// Set the new public key on-chain
String transaction = "(set-key " + newKeys.getAccountKey() + ")";

Result result = convex.transact(Reader.read(transaction)).get();

if (!result.isError()) {
    // Update local key pair
    convex.setKeyPair(newKeys);
    System.out.println("Account keys updated");
}
```

**⚠️ Warning**: Save the new keys before changing! Losing keys means losing account access.

## Best Practices

### 1. Query Before Transacting

Test transactions with queries first:

```java
// Test with query (free)
Result testResult = convex.query(
    Reader.read("(transfer #456 1000000)"),
    myAddress
).get();

if (testResult.isError()) {
    System.err.println("Would fail: " + testResult.getErrorCode());
} else {
    // Proceed with transaction
    convex.transact(Reader.read("(transfer #456 1000000)")).get();
}
```

### 2. Check Balance First

Verify sufficient funds before transacting:

```java
// Get current balance
Result balanceResult = convex.query(
    Reader.read("(balance " + myAddress + ")"),
    myAddress
).get();

long balance = ((Number) balanceResult.getValue()).longValue();
long transferAmount = 50_000_000L;

if (balance < transferAmount + 10_000) {  // Extra for juice
    System.err.println("Insufficient balance");
} else {
    convex.transact(
        Reader.read("(transfer #456 " + transferAmount + ")")
    ).get();
}
```

### 3. Handle Failures Gracefully

Always handle potential errors:

```java
public Result safeTransact(Convex convex, String transaction) {
    try {
        Result result = convex.transact(Reader.read(transaction)).get();

        if (result.isError()) {
            logger.error("Transaction failed: {}", result.getErrorCode());
            return null;
        }

        return result;
    } catch (Exception e) {
        logger.error("Exception during transaction", e);
        return null;
    }
}
```

### 4. Use Atomic Transactions

Group related operations in a single transaction:

```java
// ❌ BAD - Two separate transactions
convex.transact(Reader.read("(def x 10)")).get();
convex.transact(Reader.read("(def y (* x 2))")).get();  // Might fail

// ✅ GOOD - One atomic transaction
convex.transact(Reader.read("(do (def x 10) (def y (* x 2)))")).get();
```

### 5. Avoid Concurrent Transactions

Don't submit multiple transactions from the same account concurrently:

```java
// ❌ BAD - Concurrent transactions on same account
CompletableFuture<Result> tx1 = convex.transact(Reader.read("(def x 1)"));
CompletableFuture<Result> tx2 = convex.transact(Reader.read("(def y 2)"));
// May cause SEQUENCE errors

// ✅ GOOD - Sequential transactions
convex.transact(Reader.read("(def x 1)")).get();
convex.transact(Reader.read("(def y 2)")).get();

// OR use one atomic transaction
convex.transact(Reader.read("(do (def x 1) (def y 2))")).get();
```

### 6. Keep Juice Costs Low

Minimize memory allocation and computation:

```java
// ❌ EXPENSIVE - Creates large data structure
convex.transact(Reader.read("(def big-list (range 1000000))")).get();

// ✅ CHEAPER - Store minimal data
convex.transact(Reader.read("(def count 1000000)")).get();
```

## Transaction Lifecycle

1. **Prepare** - SDK creates transaction with source and account address
2. **Sign** - Account's private key signs the transaction hash
3. **Submit** - Signed transaction sent to peer
4. **Consensus** - Network reaches consensus (typically < 1 second)
5. **Execute** - CVM executes transaction
6. **Result** - Result returned to client

```java
// All handled automatically by SDK
Result result = convex.transact(Reader.read("(def x 42)")).get();

// But you can handle each step manually if needed
ATransaction tx = Invoke.create(myAddress, Reader.read("(def x 42)"));
SignedData<ATransaction> signed = keyPair.signData(tx);
Result result = convex.transact(signed).get();
```

## Monitoring Transactions

### Check Transaction Status

```java
Result result = convex.transact(Reader.read("(def x 42)")).get();

if (!result.isError()) {
    System.out.println("Transaction ID: " + result.getID());
    System.out.println("Result value: " + result.getValue());
} else {
    System.err.println("Error code: " + result.getErrorCode());
    System.err.println("Error message: " + result.getValue());
}
```

### Transaction Logging

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger logger = LoggerFactory.getLogger(MyClass.class);

public void executeTransaction(String transaction) {
    logger.info("Submitting transaction: {}", transaction);

    Result result = convex.transact(Reader.read(transaction)).get();

    if (result.isError()) {
        logger.error("Transaction failed: {} - {}",
            result.getErrorCode(), result.getValue());
    } else {
        logger.info("Transaction successful: {}", result.getValue());
    }
}
```

## Next Steps

- **[Account Management](accounts)** - Manage keys and accounts
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp)** - Learn the smart contract language
- **[Actor Development](/docs/tutorial/actors)** - Build smart contracts
