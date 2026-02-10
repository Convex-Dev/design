---
sidebar_position: 1
---

# TypeScript

The official TypeScript/JavaScript client library for the Convex decentralised lattice network.

## Overview

The `@convex-world/convex-ts` package provides a modern, type-safe way to interact with the Convex network from TypeScript applications. It works seamlessly across multiple environments including Node.js, browsers, Deno, and Bun.

## Key Features

- **🔍 Read-Only Queries** - Query network state without needing an account or keys
- **🔐 Account Management** - Full support for Ed25519 key pairs and account operations
- **💸 Transactions** - Submit and track transactions with complete type safety
- **🔌 Pluggable Signers** - Extensible signer interface for hardware wallets, browser extensions, and HSM
- **💾 Secure Keystore** - Encrypted key storage with password protection
- **📘 Full TypeScript Support** - Complete type definitions for IntelliSense and compile-time checks
- **🌐 Environment Agnostic** - No DOM dependencies, works everywhere JavaScript runs
- **⚛️ React Integration** - Hooks and components via `@convex-world/convex-react`

## Installation

```bash
# Using npm
npm install @convex-world/convex-ts

# Using pnpm
pnpm add @convex-world/convex-ts

# Using yarn
yarn add @convex-world/convex-ts
```

## Quick Start

### Read-Only Query (No Account Needed)

The simplest way to get started - query the network without authentication:

```typescript
import { Convex } from '@convex-world/convex-ts';

// Connect to the Convex network
const convex = new Convex('https://peer.convex.live');

// Query any account's balance
const result = await convex.query('(balance #13)');
console.log('Balance:', result.value);
```

### Using Your Account

If you have a Convex account and Ed25519 seed:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

// Connect to network
const convex = new Convex('https://peer.convex.live');

// Load your key pair from seed
const keyPair = KeyPair.fromSeed('your-32-byte-seed-hex');
convex.setAccount('#1678', keyPair);

// Query your balance
const info = await convex.getAccountInfo();
console.log('Balance:', info.balance / 1_000_000_000, 'Convex Coins');

// Transfer coins
const result = await convex.transfer('#456', 1_000_000_000);
console.log('Transaction:', result.hash);
```

## Network URLs

Connect to different Convex networks:

- **Production**: `https://peer.convex.live` - Live network with real assets
- **Testnet**: `https://testnet.convex.live` - Test network with faucet for testing
- **Local**: `http://localhost:8080` - Local development peer

## Next Steps

<div className="row">
  <div className="col col--6">
    <div className="card">
      <div className="card__header">
        <h3>📖 Guides</h3>
      </div>
      <div className="card__body">
        <ul>
          <li><a href="./quickstart">Quickstart Tutorial</a></li>
          <li><a href="./queries">Querying State</a></li>
          <li><a href="./transactions">Submitting Transactions</a></li>
          <li><a href="./accounts">Account Management</a></li>
        </ul>
      </div>
    </div>
  </div>
  <div className="col col--6">
    <div className="card">
      <div className="card__header">
        <h3>🔧 Advanced</h3>
      </div>
      <div className="card__body">
        <ul>
          <li><a href="./signers">Signer Interface</a></li>
          <li><a href="./keystore">Encrypted Keystore</a></li>
          <li><a href="./react">React Integration</a></li>
          <li><a href="./api-reference">API Reference</a></li>
        </ul>
      </div>
    </div>
  </div>
</div>

## Resources

- **📦 npm Package**: [@convex-world/convex-ts](https://www.npmjs.com/package/@convex-world/convex-ts)
- **🐙 GitHub**: [Convex-Dev/convex.ts](https://github.com/Convex-Dev/convex.ts)
- **💬 Discord**: [Convex Community](https://discord.com/invite/xfYGq4CT7v)
- **📚 Full Documentation**: [docs.convex.world](https://docs.convex.world)
