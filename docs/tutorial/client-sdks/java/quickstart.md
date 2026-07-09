---
sidebar_position: 1
---

# Quickstart

Build your first Java application on Convex in under 10 minutes.

## Network Options

This quickstart uses a **public testnet** for simplicity. For serious development, consider:

- **Public Testnet** - `https://mikera1337-convex-testnet.hf.space` (good for learning, has a faucet)
- **Local Peer** - Run your own peer (fastest, full control) - see [Client Types](clients#local-peer-client)
- **Production** - `https://peer.convex.live` (no faucet, requires a funded account)

:::note Which client?
This guide uses **`ConvexJSON`**, the REST client that talks to any Convex peer over HTTPS — the
right choice for a remote testnet. For an embedded, in-process peer use the binary
`convex.api.Convex` client instead (see [Client Types](clients)).
:::

## Step 1: Create a Maven Project

Create a new Maven project with `pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>convex-demo</artifactId>
    <version>1.0-SNAPSHOT</version>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>world.convex</groupId>
            <artifactId>convex-java</artifactId>
            <version>0.8.8</version>
        </dependency>
    </dependencies>
</project>
```

Or with Gradle (`build.gradle`):

```groovy
plugins {
    id 'java'
}

group = 'com.example'
version = '1.0-SNAPSHOT'

repositories {
    mavenCentral()
}

dependencies {
    implementation 'world.convex:convex-java:0.8.8'
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
```

## Step 2: Connect to the Network

Create `src/main/java/com/example/HelloConvex.java`:

```java
package com.example;

import convex.java.ConvexJSON;

public class HelloConvex {
    public static void main(String[] args) throws Exception {
        // Connect to a public testnet over the REST API
        ConvexJSON convex = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");

        System.out.println("Connected to Convex network");
    }
}
```

## Step 3: Execute a Query

Queries are read-only operations that don't require an account. The result is a JSON map; the
computed value is under the `"value"` key:

```java
package com.example;

import java.util.Map;
import convex.java.ConvexJSON;

public class QueryExample {
    public static void main(String[] args) throws Exception {
        ConvexJSON convex = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");

        // Query an account balance
        Map<String, Object> result = convex.query("(balance #13)");

        long balance = ((Number) result.get("value")).longValue();
        System.out.println("Balance: " + (balance / 1_000_000_000.0) + " CVM");
    }
}
```

Run with:

```bash
mvn compile exec:java -Dexec.mainClass=com.example.QueryExample
```

## Step 4: Create a Funded Account

On a test network, `useNewAccount` generates a key pair, creates an account, funds it from the
faucet, and sets the connection to use it — all in one call (amount in copper):

```java
package com.example;

import convex.java.ConvexJSON;
import convex.core.cvm.Address;
import convex.core.crypto.AKeyPair;

public class CreateAccount {
    public static void main(String[] args) throws Exception {
        ConvexJSON convex = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");

        // Create a faucet-funded account (up to 10,000,000 copper) and use it
        Address address = convex.useNewAccount(10_000_000);
        System.out.println("Account created: " + address);

        // The generated key pair signs your transactions — save it to reuse this account!
        AKeyPair keyPair = convex.getKeyPair();
        System.out.println("Public key: " + keyPair.getAccountKey());
    }
}
```

:::note Production
Faucets only work on test networks. On production, an existing funded account must create and
fund yours. See the [Faucet Guide](/docs/tutorial/coins/faucet).
:::

## Step 5: Submit a Transaction

Transactions modify network state and require a funded account (Step 4). They are signed locally
and return the same JSON-map shape as queries:

```java
package com.example;

import java.util.Map;
import convex.java.ConvexJSON;
import convex.core.cvm.Address;

public class TransactExample {
    public static void main(String[] args) throws Exception {
        ConvexJSON convex = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");

        // Create + use a funded account (see Step 4)
        Address address = convex.useNewAccount(10_000_000);

        // Store a value on-chain
        Map<String, Object> result = convex.transact("(def my-value 42)");
        System.out.println("Transaction result: " + result.get("value"));

        // Read it back (free query)
        Map<String, Object> query = convex.query("my-value");
        System.out.println("Stored: " + query.get("value"));
    }
}
```

Transactions **modify state** and **consume juice**. They require a funded account, a key pair for
signing (both handled by `useNewAccount` above), and sufficient balance for execution costs.

## Complete Example

Here's everything together — query, create a funded account, transact, and read back:

```java
package com.example;

import java.util.Map;
import convex.java.ConvexJSON;
import convex.core.cvm.Address;

public class CompleteExample {
    public static void main(String[] args) throws Exception {
        // Connect to the testnet
        ConvexJSON convex = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");
        System.out.println("✓ Connected to Convex");

        // Free query — no account needed
        Map<String, Object> balance = convex.query("(balance #13)");
        System.out.println("✓ Account #13 balance: " + balance.get("value") + " copper");

        // Create a faucet-funded account and use it
        Address address = convex.useNewAccount(10_000_000);
        System.out.println("✓ Account created: " + address);

        // Execute a transaction
        Map<String, Object> tx = convex.transact("(def greeting \"Hello Convex!\")");
        System.out.println("✓ Transaction result: " + tx.get("value"));

        // Query it back
        Map<String, Object> q = convex.query("greeting");
        System.out.println("✓ Read back: " + q.get("value"));
    }
}
```

Run it:

```bash
mvn compile exec:java -Dexec.mainClass=com.example.CompleteExample
```

Expected output:

```
✓ Connected to Convex
✓ Account #13 balance: ... copper
✓ Account created: #1234
✓ Transaction result: Hello Convex!
✓ Read back: Hello Convex!
```

## Next Steps

- **[Query Guide](queries)** - Learn advanced query patterns
- **[Transaction Guide](transactions)** - Explore transaction capabilities
- **[Account Management](accounts)** - Manage keys and accounts
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp)** - Learn the smart contract language

## Troubleshooting

### ClassNotFoundException

If you get `ClassNotFoundException` for Convex classes:

```bash
# Verify dependency is resolved
mvn dependency:tree | grep convex

# Clean and rebuild
mvn clean compile
```

### Connection Refused

If you cannot connect to `https://mikera1337-convex-testnet.hf.space`:

- Check your internet connection
- Verify the peer is online; try an alternative peer URL
- Check firewall settings

### Transaction Fails with SEQUENCE Error

If you get `SEQUENCE` errors:

- Don't submit multiple transactions concurrently from the same account
- Wait for the previous transaction to complete before submitting the next
- Use separate accounts for concurrent transactions

### Insufficient Balance (`FUNDS`)

If transactions fail with a `FUNDS` error, the account needs Convex Coins. On the testnet, create
it with a faucet amount via `useNewAccount(...)` (Step 4); on production you must transfer in
funds from an existing account. See the [Faucet Guide](/docs/tutorial/coins/faucet).
