---
sidebar_position: 4
---

# Java SDK

The official Java client library for interacting with the Convex decentralised lattice network.

## Overview

The `convex-java` module provides a native JVM interface to the Convex network, enabling you to:

- **Execute Queries** - Read network state without fees
- **Submit Transactions** - Execute atomic state transitions with cryptographic signatures
- **Manage Accounts** - Create and manage self-sovereign accounts with Ed25519 keys
- **Deploy Actors** - Deploy and interact with smart contracts (actors) written in Convex Lisp
- **Async Operations** - Non-blocking I/O with CompletableFuture

## Installation

### Maven

```xml
<dependency>
    <groupId>world.convex</groupId>
    <artifactId>convex-java</artifactId>
    <version>0.8.2</version>
</dependency>
```

### Gradle

```groovy
implementation 'world.convex:convex-java:0.8.2'
```

## Quick Example

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

// Connect to a public testnet
Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

// Execute a query
Result result = convex.query(Reader.read("(balance #13)")).get();
System.out.println("Balance: " + result.getValue());

// Use your account
AKeyPair keyPair = AKeyPair.generate();
convex.setKeyPair(keyPair);
convex.setAddress(Address.create(1234));

// Submit a transaction (requires funded account)
Result txResult = convex.transact(Reader.read("(def my-value 42)")).get();
System.out.println("Transaction result: " + txResult.getValue());
```

**Note**: This example uses a public testnet with faucet support. For production use `https://peer.convex.live` (no faucet). For development, consider [running a local peer](java/clients#local-peer-client) for best performance.

## Key Features

### ☕ Native JVM Performance

Pure Java implementation with zero overhead, leveraging the full power of the JVM:

```java
// Native Java types
Address address = Address.create(1234);
AKeyPair keyPair = AKeyPair.generate();
ACell data = Vectors.of(1, 2, 3, 4, 5);
```

### ⚡ Async with CompletableFuture

Non-blocking operations using Java's CompletableFuture:

```java
CompletableFuture<Result> future = convex.query(
    Reader.read("(balance #123)")
);

future.thenAccept(result -> {
    System.out.println("Balance: " + result.getValue());
});
```

### 🔐 Ed25519 Key Management

Full support for Ed25519 cryptographic keys:

```java
// Generate new key pair
AKeyPair keyPair = AKeyPair.generate();

// Create from seed
AKeyPair keyPair = AKeyPair.create(seedBytes);

// Export public key
AccountKey publicKey = keyPair.getAccountKey();
```

### 🌐 Multiple Client Types

Choose the right client for your use case:

```java
// JSON API client (REST)
Convex convex = Convex.connect("https://peer.convex.live");

// Direct peer connection (binary protocol)
Convex convex = Convex.connect(InetSocketAddress.createUnresolved("peer.convex.live", 18888));
```

### 🔄 Transaction Management

Automatic transaction preparation and signing:

```java
// SDK handles preparation and signing
ATransaction tx = Invoke.create(address, Reader.read("(+ 1 2)"));
SignedData<ATransaction> signed = convex.getKeyPair().signData(tx);
Result result = convex.transact(signed).get();
```

## Copper and Convex Coins

The Convex network uses **copper** as the smallest unit of currency. Like Bitcoin's satoshis or Ethereum's wei, copper allows for precise fractional amounts:

**1 Convex Coin = 1,000,000,000 copper**

All balance and transfer amounts in the API are in **copper**:

```java
// Query balance in copper
Result result = convex.query(Reader.read("(balance #123)")).get();
long balanceCopper = ((Long) result.getValue()).longValue();

// Convert to Convex Coins
double balanceCoins = balanceCopper / 1_000_000_000.0;
System.out.println("Balance: " + balanceCoins + " CVX");

// Transfer 0.1 Convex Coins (100 million copper)
long amount = 100_000_000L;
Result txResult = convex.transact(
    Reader.read("(transfer #456 " + amount + ")")
).get();
```

## Java Version Support

- **Java 21+** required
- **Java 21** recommended for optimal performance
- Virtual threads support for improved concurrency

## Dependencies

The Java SDK depends on:

- `convex-core` - Core CVM and data structures
- `convex-peer` - Peer networking (for direct connections)
- Minimal external dependencies (self-contained)

## Thread Safety

The Java SDK is designed for concurrent use:

```java
// Same Convex instance can be used from multiple threads
ExecutorService executor = Executors.newFixedThreadPool(10);

for (int i = 0; i < 100; i++) {
    int id = i;
    executor.submit(() -> {
        Result result = convex.query(
            Reader.read("(balance #" + id + ")")
        ).get();
        System.out.println("Account #" + id + ": " + result.getValue());
    });
}
```

**Important**: Avoid executing transactions that use the same account from multiple threads, as each transaction requires incrementing a sequence number that may become mismatched. Queries are safe for concurrent use.

## Resources

- **[Maven Central](https://search.maven.org/artifact/world.convex/convex-java)** - Releases and versions
- **[Javadoc API Reference](https://javadoc.io/doc/world.convex/convex-java)** - Complete API documentation
- **[GitHub Repository](https://github.com/Convex-Dev/convex)** - Source code (convex-java module)
- **[Convex Documentation](https://docs.convex.world)** - Network and platform docs
- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** - Get help and share ideas

## Next Steps

- **[Quickstart Guide](java/quickstart)** - Build your first Java app on Convex
- **[Query Guide](java/queries)** - Learn how to read network state
- **[Transaction Guide](java/transactions)** - Submit state-changing operations
- **[Account Management](java/accounts)** - Manage keys and accounts
