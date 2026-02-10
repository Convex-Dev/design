# Convex TypeScript/JavaScript Client

Official TypeScript/JavaScript client library for the Convex decentralised lattice network.

## Key Features

- 🔍 **Read-Only Queries** - Query network state without an account
- 🔐 **Account Management** - Use existing Convex accounts with Ed25519 keys
- 💸 **Transactions** - Submit and track transactions with full type safety
- 🔌 **Pluggable Signers** - Support for hardware wallets and browser extensions
- 📘 **Full TypeScript Support** - Complete type definitions included
- 🌐 **Environment Agnostic** - Works in Node.js, browsers, Deno, and Bun
- ⚛️ **React Integration** - Hooks and components for React applications

## Installation

```bash
npm install @convex-world/convex-ts
```

## Quick Example

```typescript
import { Convex } from '@convex-world/convex-ts';

// Connect and query the network
const convex = new Convex('https://peer.convex.live');
const result = await convex.query('(balance #13)');
console.log('Balance:', result.value);
```

## Resources

- **📖 [Full SDK Guide](/docs/tutorial/client-sdks/typescript)** - Complete documentation and tutorials
- **📦 [npm Package](https://www.npmjs.com/package/@convex-world/convex-ts)** - Install from npm
- **🐙 [GitHub Repository](https://github.com/Convex-Dev/convex.ts)** - Source code and examples

---

**→ [Get Started with the TypeScript SDK](/docs/tutorial/client-sdks/typescript)**
