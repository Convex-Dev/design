---
sidebar_position: 1
---

# Quickstart

Build your first Java application on Convex in under 10 minutes.

## Prerequisites

- Java 21 or higher
- Maven 3.7+ or Gradle 7+
- IDE (IntelliJ IDEA, Eclipse, or VS Code recommended)

## Network Options

This quickstart uses a **public testnet** for simplicity. For serious development, consider:

- **Public Testnet** - `https://mikera1337-convex-testnet.hf.space` (good for learning, has faucet)
- **Local Peer** - Run your own peer (fastest, full control) - see [Client Types](clients#local-peer-client)
- **Production** - `https://mikera1337-convex-testnet.hf.space` (no faucet, requires funded account)

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
            <version>0.8.2</version>
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
    implementation 'world.convex:convex-java:0.8.2'
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

import convex.api.Convex;
import convex.core.Result;
import convex.core.lang.Reader;

public class HelloConvex {
    public static void main(String[] args) throws Exception {
        // Connect to a public testnet
        Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

        System.out.println("Connected to Convex network");

        // Close connection when done
        convex.close();
    }
}
```

This connects to a public testnet with faucet support for development and testing.

## Step 3: Execute a Query

Queries are read-only operations that don't require an account:

```java
package com.example;

import convex.api.Convex;
import convex.core.Result;
import convex.core.lang.Reader;

public class QueryExample {
    public static void main(String[] args) throws Exception {
        Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

        // Query an account balance
        Result result = convex.query(Reader.read("(balance #13)")).get();

        long balance = ((Number) result.getValue()).longValue();
        double coins = balance / 1_000_000_000.0;
        System.out.println("Account balance: " + coins + " CVX");

        convex.close();
    }
}
```

Run with:

```bash
mvn compile exec:java -Dexec.mainClass=com.example.QueryExample
```

## Step 4: Create an Account

Generate a key pair and set up your account:

```java
package com.example;

import convex.api.Convex;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;

public class CreateAccount {
    public static void main(String[] args) throws Exception {
        Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

        // Generate a new Ed25519 key pair
        AKeyPair keyPair = AKeyPair.generate();
        System.out.println("Generated key pair");
        System.out.println("Public key: " + keyPair.getAccountKey());

        // On test networks, you can request an account from the peer
        // This is typically sponsored by the peer's faucet account
        // Note: Implementation varies by peer configuration

        // For now, we'll use the key pair for signing
        convex.setKeyPair(keyPair);

        // Save your key pair securely!
        // byte[] seed = keyPair.getSeed();
        // Files.write(Path.of("keypair.dat"), seed);

        convex.close();
    }
}
```

**Important**: Save your key pair! Without it, you cannot access your account.

**Creating Accounts**: On test networks, account creation is typically sponsored by the peer's faucet account. On production networks, someone with an existing funded account must create your account for you. See the [Faucet Guide](/docs/tutorial/coins/faucet) for details.

## Step 5: Request Test Funds

On **test networks only**, you can request free test funds:

```java
package com.example;

import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

public class RequestFunds {
    public static void main(String[] args) throws Exception {
        Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

        // Generate key pair
        AKeyPair keyPair = AKeyPair.generate();
        convex.setKeyPair(keyPair);

        // Assume account was created at address #1234
        Address myAddress = Address.create(1234);
        convex.setAddress(myAddress);

        // Request test funds (test networks only!)
        // Note: This typically requires calling a faucet endpoint
        // Implementation depends on peer configuration

        System.out.println("Account ready at address: " + myAddress);

        convex.close();
    }
}
```

**Important**: Faucets only work on test networks. On production networks, you must acquire Convex Coins through legitimate means (purchase, transfer, or earning).

See the [Faucet Guide](/docs/tutorial/coins/faucet) for more details on faucet availability and limits.

## Step 6: Query Your Balance

Check your account balance:

```java
package com.example;

import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

public class CheckBalance {
    public static void main(String[] args) throws Exception {
        Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

        // Your account address
        Address myAddress = Address.create(1234);

        // Query balance
        Result result = convex.query(
            Reader.read("(balance " + myAddress + ")")
        ).get();

        long balanceCopper = ((Number) result.getValue()).longValue();
        double balanceCoins = balanceCopper / 1_000_000_000.0;

        System.out.println("Balance: " + balanceCoins + " CVX");
        System.out.println("         (" + balanceCopper + " copper)");

        convex.close();
    }
}
```

## Step 7: Submit a Transaction

Execute a transaction to modify network state:

```java
package com.example;

import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

public class TransactExample {
    public static void main(String[] args) throws Exception {
        Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

        // Load your key pair (from saved seed)
        // byte[] seed = Files.readAllBytes(Path.of("keypair.dat"));
        // AKeyPair keyPair = AKeyPair.create(seed);
        AKeyPair keyPair = AKeyPair.generate(); // Demo only

        convex.setKeyPair(keyPair);
        convex.setAddress(Address.create(1234));

        // Execute a simple transaction
        Result result = convex.transact(
            Reader.read("(def my-value 42)")
        ).get();

        System.out.println("Transaction successful!");
        System.out.println("Result: " + result.getValue());

        convex.close();
    }
}
```

Transactions **modify state** and **consume juice**. They require:
- A funded account (balance > 0)
- A valid key pair for signing
- Sufficient balance for execution costs

**Note**: See the [Transaction Guide](transactions) for complete error handling patterns.

## Complete Example

Here's a complete example combining everything:

```java
package com.example;

import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

public class CompleteExample {
    public static void main(String[] args) throws Exception {
        // Connect to network
        Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");
        System.out.println("✓ Connected to Convex");

        // Generate key pair
        AKeyPair keyPair = AKeyPair.generate();
        System.out.println("✓ Generated key pair");

        // Set up account
        convex.setKeyPair(keyPair);
        Address myAddress = Address.create(1234); // Example address
        convex.setAddress(myAddress);
        System.out.println("✓ Account configured: " + myAddress);

        // Query balance
        Result balanceResult = convex.query(
            Reader.read("(balance #13)")
        ).get();

        long balance = ((Number) balanceResult.getValue()).longValue();
        System.out.println("✓ Account #13 balance: " + (balance / 1_000_000_000.0) + " CVX");

        // Execute transaction (requires funded account)
        Result txResult = convex.transact(
            Reader.read("(+ 1 2 3)")
        ).get();

        System.out.println("✓ Transaction result: " + txResult.getValue());

        // Clean up
        convex.close();
        System.out.println("✓ Done");
    }
}
```

Run it:

```bash
mvn compile exec:java -Dexec.mainClass=com.example.CompleteExample
```

**Note**: This example shows the happy path without error handling. For production code with proper error handling patterns, see the [Transaction Guide](transactions) and [Query Guide](queries).

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
- Try an alternative peer URL
- Check firewall settings
- Verify the peer is online

### Transaction Fails with SEQUENCE Error

If you get `SEQUENCE` errors:

- Don't submit multiple transactions concurrently from the same account
- Wait for previous transaction to complete before submitting next
- Use separate accounts for concurrent transactions

### Insufficient Balance

If transactions fail with `FUNDS` error:

```java
// Check balance first
Result result = convex.query(
    Reader.read("(balance " + myAddress + ")")
).get();

long balance = ((Number) result.getValue()).longValue();

if (balance < 10_000_000) {  // Less than 0.01 CVX
    System.err.println("Insufficient balance");
    // On test networks only:
    // Request funds from faucet
}
```

**Note**: Faucet requests only work on test networks. See the [Faucet Guide](/docs/tutorial/coins/faucet) for production alternatives.
