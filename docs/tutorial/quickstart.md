---
sidebar_position: 1
---

# Quick Start

Get your first transaction on Convex in 5 minutes.

## Choose Your Path

Pick the fastest way to get started based on your setup:

| Path | Time | Best For |
|------|------|----------|
| **[Local Peer](#option-1-local-peer)** | 2 min | Developers with Java installed |
| **[Testnet](#option-2-hugging-face-testnet)** | 1 min | Quick testing, no installation |
| **[SDK Quickstart](#option-3-language-specific)** | 5 min | Your preferred language |

---

## Option 1: Local Peer

**Fastest for development** - Run a peer in your JVM.

### Prerequisites
- Java 21+ installed
- Maven or Gradle (for Java examples)

### Quick Start

**1. Add Dependency** (Maven):
```xml
<dependency>
    <groupId>world.convex</groupId>
    <artifactId>convex-java</artifactId>
    <version>0.8.2</version>
</dependency>
```

**2. Run Your First Transaction**:
```java
import convex.peer.Server;
import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

public class QuickStart {
    public static void main(String[] args) throws Exception {
        // Start local peer
        Server server = Server.create();
        server.launch();

        try {
            // Connect
            Convex convex = Convex.connect(server);

            // Create account
            AKeyPair keyPair = AKeyPair.generate();
            Address address = convex.createAccountSync(keyPair.getAccountKey());
            convex.setKeyPair(keyPair);
            convex.setAddress(address);

            // Your first transaction!
            Result result = convex.transact(
                Reader.read("(def greeting \"Hello Convex!\")")
            ).get();

            System.out.println("✓ Transaction succeeded!");
            System.out.println("Result: " + result.getValue());

            // Query the value
            Result query = convex.query(Reader.read("greeting")).get();
            System.out.println("Greeting: " + query.getValue());

        } finally {
            server.shutdown();
        }
    }
}
```

**3. Run It**:
```bash
mvn compile exec:java -Dexec.mainClass=QuickStart
```

**Expected Output**:
```
✓ Transaction succeeded!
Result: "Hello Convex!"
Greeting: "Hello Convex!"
```

**🎉 Success!** You've:
- ✅ Started a local peer
- ✅ Created an account
- ✅ Submitted a transaction
- ✅ Queried network state

**Next:** Explore [Local Testnets](peer-operations/local-testnets) for more options.

---

## Option 2: Hugging Face Testnet

**No installation needed** - Connect to public testnet.

### Any Language

**1. Install SDK**:

```bash
# TypeScript/JavaScript
npm install @convex-world/convex-ts

# Python
pip install convex-api
```

**2. Connect and Transact**:

**TypeScript**:
```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

// Connect to testnet
const convex = new Convex('https://mikera1337-convex-testnet.hf.space');

// Create account
const keyPair = KeyPair.generate();
// Note: You'll need to request an account from the faucet
// See Faucet Guide for details

// Your first transaction
const result = await convex.transact('(def greeting "Hello Convex!")');
console.log('✓ Transaction succeeded!');
console.log('Result:', result.value);

// Query
const query = await convex.query('greeting');
console.log('Greeting:', query.value);
```

**Python**:
```python
from convex_api import Convex, KeyPair

# Connect to testnet
convex = Convex('https://mikera1337-convex-testnet.hf.space')

# Create account
key_pair = KeyPair()
# Note: Request account from faucet - see Faucet Guide

# Your first transaction
result = convex.transact('(def greeting "Hello Convex!")')
print('✓ Transaction succeeded!')
print('Result:', result.value)

# Query
query = convex.query('greeting')
print('Greeting:', query.value)
```

**Java**:
```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.lang.Reader;

// Connect to testnet
Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

// Create account and request funds from faucet
// See Faucet Guide for details

// Your first transaction
Result result = convex.transact(
    Reader.read("(def greeting \"Hello Convex!\")")
).get();

System.out.println("✓ Transaction succeeded!");
System.out.println("Result: " + result.getValue());

// Query
Result query = convex.query(Reader.read("greeting")).get();
System.out.println("Greeting: " + query.getValue());
```

**Note:** Public testnets require account creation via faucet. See **[Faucet Guide](coins/faucet)** for details.

**🎉 Success!** You've connected to a public network!

**Next:** Read the **[Networks Guide](networks)** to understand network types.

---

## Option 3: Language-Specific

**Deep dive** - Complete quickstart for your language.

### Choose Your Language

**Java** (Recommended for local development)
- ✅ Fastest performance
- ✅ Full local peer control
- ✅ Best for backend/Android
- **→ [Java Quickstart](client-sdks/java/quickstart)**

**TypeScript** (Recommended for web apps)
- ✅ Type safety
- ✅ React integration
- ✅ Best for web/Node.js
- **→ [TypeScript Quickstart](client-sdks/typescript/quickstart)**

**Python** (Recommended for scripts)
- ✅ Simple syntax
- ✅ Great for automation
- ✅ Best for scripting/data science
- **→ [Python Quickstart](client-sdks/python/quickstart)**

---

## Understanding What You Did

### Key Concepts

**Account**
- Your identity on Convex
- Holds Convex Coins (CVM)
- Identified by address (e.g., `#1234`)

**Key Pair**
- Ed25519 public/private keys
- Private key signs transactions
- Public key creates account

**Transaction**
- Modifies network state
- Requires funded account
- Costs juice (execution fee)

**Query**
- Reads network state
- Free (no account needed)
- Doesn't modify anything

### What Just Happened?

```clojure
(def greeting "Hello Convex!")
```

This Convex Lisp code:
1. **Defined** a variable `greeting`
2. **Stored** it in global state
3. **Persisted** across the network

Your transaction was:
- ✅ Cryptographically signed
- ✅ Validated by consensus
- ✅ Permanently recorded

## Next Steps

### Learn More

**Understand the Network**
- **[Networks Guide](networks)** - Production, testnet, local
- **[Faucet Guide](coins/faucet)** - Getting test funds

**Master Your SDK**
- **[Queries](client-sdks/java/queries)** - Reading state
- **[Transactions](client-sdks/java/transactions)** - Modifying state
- **[Account Management](client-sdks/java/accounts)** - Keys and accounts

**Write Smart Contracts**
- **[Convex Lisp](/docs/tutorial/convex-lisp)** - The on-chain language
- **[Actor Development](actors)** - Smart contracts
- **[Recipes](recipes)** - Practical examples

### Try These Next

**1. Check an Account Balance**
```clojure
(balance #13)
```

**2. Do Some Math**
```clojure
(+ 1 2 3 4 5)
```

**3. Create a Function**
```clojure
(defn square [x]
  (* x x))

(square 7)
```

**4. Deploy a Smart Contract**
```clojure
(deploy
  '(do
     (defn greet [name]
       (str "Hello, " name "!"))
     (export greet)))
```

## Troubleshooting

### Connection Failed

**Local Peer:**
- Check Java 21+ installed: `java -version`
- Increase memory: `-Xmx4g`
- Check port 18888 not in use

**Testnet:**
- Verify network URL correct
- Check internet connection
- Try alternative testnet

### Transaction Failed

**FUNDS Error:**
- Account needs Convex Coins
- Local peer: accounts created with funds
- Testnet: request from [faucet](coins/faucet)

**SEQUENCE Error:**
- Don't submit concurrent transactions
- Wait for previous transaction to complete

### Can't Query

**Check:**
- Network connection established
- Query syntax correct
- Variable/function exists

## Get Help

**Resources:**
- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** - Live help
- **[GitHub Issues](https://github.com/Convex-Dev/convex/issues)** - Bug reports
- **[Documentation](/)** - Complete guides

**Common Questions:**
- What's a CVM? → The Convex Virtual Machine
- What's juice? → Transaction execution cost
- What's copper? → Smallest unit of CVM (1 CVM = 1B copper)
- What's a peer? → A network node

---

**🎉 Congratulations!** You're now part of the Convex network. Build something amazing!
