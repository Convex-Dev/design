# Convex SDK

Official client libraries for the Convex decentralised lattice network.

## Overview

The Convex SDK enables developers to harness the full power of the Convex decentralised lattice from any programming language or platform. Whether you're building web applications, backend services, mobile apps, or embedded systems, Convex SDKs provide idiomatic, type-safe APIs that feel natural in your language ecosystem.

By bridging multiple language ecosystems with the Convex Virtual Machine (CVM), these SDKs unlock the platform's revolutionary capabilities:

- **Decentralised State Management** - Access and modify global state with atomic transactions
- **Lattice Technology** - Leverage CRDT-based data structures for conflict-free collaboration
- **Convergent Proof of Stake** - Interact with the world's fastest decentralised consensus
- **Convex Lisp Execution** - Execute smart contracts and queries from any environment
- **Cross-Platform Interoperability** - Applications in different languages share the same network state

## Available SDKs

### TypeScript / JavaScript

**Status**: ✅ Production Ready

Build web applications, Node.js services, and React dApps with full type safety and modern JavaScript tooling.

```bash
npm install @convex-world/convex-ts
```

```typescript
import { Convex } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');
const result = await convex.query('(balance #13)');
console.log('Balance:', result.value);
```

**Key Features:**
- 🔍 Read-only queries without authentication
- 🔐 Full account management with Ed25519 keys
- 💸 Type-safe transaction submission
- 🔌 Pluggable signers (hardware wallets, browser extensions)
- 🌐 Environment agnostic (Node.js, browsers, Deno, Bun)
- ⚛️ React integration available

**→ [TypeScript SDK Documentation](/docs/tutorial/client-sdks/typescript)**

---

### Java

**Status**: ✅ Production Ready

Native JVM integration for high-performance backend services and enterprise applications.

```xml
<dependency>
    <groupId>world.convex</groupId>
    <artifactId>convex-java</artifactId>
    <version>0.8.6</version>
</dependency>
```

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.lang.Reader;

Convex convex = Convex.connect("https://peer.convex.live");

Result result = convex.query(Reader.read("(balance #9)")).get();
System.out.println("Balance: " + result.getValue());
```

**Key Features:**
- ☕ Native JVM performance with zero overhead
- ⚡ Async operations with CompletableFuture
- 🔐 Ed25519 key management (AKeyPair)
- 🌐 Multiple client types (HTTP, direct peer)
- 🔄 Automatic transaction signing
- 📦 Self-contained, minimal dependencies

**→ [Java SDK Documentation](/docs/tutorial/client-sdks/java)**

---

### Python

**Status**: ✅ Production Ready

Pythonic API for scripting, automation, and data science applications.

```bash
pip install convex-sdk
```

```python
from convex_sdk import Convex, KeyPair

convex = Convex('https://mikera1337-convex-testnet.hf.space')
key_pair = KeyPair()
account = convex.create_account(key_pair)
convex.request_funds(100_000_000, account)

balance = convex.get_balance(account)
print(f'Balance: {balance / 1_000_000_000} CVM')
```

**Key Features:**
- 🔍 Synchronous I/O for simple scripting
- 🔐 Account object pattern with Ed25519 keys
- 💸 Built-in transfer and balance methods
- 🔄 Automatic sequence retry for concurrency
- 📝 CNS (Convex Name Service) integration
- 🐍 Pythonic `snake_case` naming

**→ [Python SDK Documentation](/docs/tutorial/client-sdks/python)**

---

### Rust

**Status**: 🚧 Coming Soon

Zero-cost abstractions for systems programming and performance-critical applications.

**Planned Features:**
- Memory-safe client implementation
- Async runtime support (Tokio)
- WebAssembly compilation target
- Embedded systems support

## Why Multiple SDKs?

Different applications demand different languages and ecosystems:

- **Web Applications** need TypeScript/JavaScript for browser compatibility
- **Enterprise Systems** require Java for Spring/Jakarta EE integration
- **Data Science** relies on Python's rich ecosystem (NumPy, TensorFlow, scikit-learn)
- **Systems Programming** demands Rust's performance and memory safety
- **Mobile Applications** use platform-specific languages (Swift, Kotlin)

Convex SDKs ensure developers can leverage the full power of decentralised lattice technology in their **native language ecosystem**, with idiomatic APIs that feel familiar rather than foreign.

## Universal Capabilities

All Convex SDKs provide:

- **Network Queries** - Read network state without fees or accounts
- **Transaction Submission** - Execute atomic state transitions with cryptographic signatures
- **Account Management** - Self-sovereign control with Ed25519 key pairs
- **Smart Contract Interaction** - Call deployed actors and execute Convex Lisp
- **Event Monitoring** - Subscribe to network events and state changes
- **Secure Key Storage** - Encrypted keystores for credential management

## Resources

- **📚 [SDK Documentation](/docs/tutorial/client-sdks/)** - Guides for all languages
- **💬 [Discord Community](https://discord.com/invite/xfYGq4CT7v)** - Get help and share ideas
- **🐙 [GitHub](https://github.com/Convex-Dev)** - Source code and examples
- **📦 [npm Package](https://www.npmjs.com/package/@convex-world/convex-ts)** - TypeScript SDK

---

**→ [Get Started with an SDK](/docs/tutorial/client-sdks/)**
