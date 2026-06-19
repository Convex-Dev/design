---
sidebar_position: 1
---

# Quickstart Tutorial

Build your first Convex application in TypeScript against the public testnet — free, with a
faucet for test funds.

## Prerequisites

- Node.js 18+ installed
- Basic knowledge of JavaScript/TypeScript
- A code editor (VS Code recommended)

## Step 1: Create a New Project

```bash
mkdir my-convex-app
cd my-convex-app
npm init -y
npm install @convex-world/convex-ts
npm install -D typescript tsx @types/node
```

Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## Step 2: Query the Network

Queries are read-only and free — no account needed. Create `src/query.ts`:

```typescript
import { Convex } from '@convex-world/convex-ts';

async function main() {
  // Connect to the public testnet
  const convex = new Convex('https://mikera1337-convex-testnet.hf.space');

  // Query an account balance
  const result = await convex.query('(balance #13)');
  console.log('Balance:', result.value, 'copper');
}

main().catch(console.error);
```

Run it:

```bash
npx tsx src/query.ts
```

## Step 3: Create a Funded Account

On a test network you can create an account and top it up from the faucet. Create
`src/account.ts`:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

async function main() {
  const convex = new Convex('https://mikera1337-convex-testnet.hf.space');

  // Generate a key pair and create a faucet-funded account
  // (faucet amount is in coppers; 100_000_000 = 0.1 CVM)
  const keyPair = KeyPair.generate();
  const account = await convex.createAccount(keyPair, 100_000_000);
  convex.setAccount(account.address, keyPair);

  console.log('Address:', account.address);

  const info = await convex.getAccountInfo();
  console.log('Balance:', info.balance / 1_000_000_000, 'Convex Coins');

  // Save the seed if you want to reuse this account later:
  // console.log('Seed:', keyPair.toHex().privateKey);
}

main().catch(console.error);
```

:::tip Production / existing accounts
Faucets only work on test networks. On production (`https://peer.convex.live`) you load an
existing funded account from its seed instead of creating one:

```typescript
const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
convex.setAccount(process.env.CONVEX_ADDRESS!, keyPair);
```
:::

## Step 4: Submit a Transaction

With an account wired up, submit a transaction (any Convex Lisp). Create `src/transact.ts`:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

async function main() {
  const convex = new Convex('https://mikera1337-convex-testnet.hf.space');

  // Create + use a funded account (see Step 3)
  const keyPair = KeyPair.generate();
  const account = await convex.createAccount(keyPair, 100_000_000);
  convex.setAccount(account.address, keyPair);

  // Store a value on-chain
  const result = await convex.transact('(def greeting "Hello from TypeScript!")');
  console.log('Stored:', result.value);

  // Read it back (free query)
  const query = await convex.query('greeting');
  console.log('Read back:', query.value);
}

main().catch(console.error);
```

`transact()` throws a `ConvexError` on a CVM-level failure (e.g. insufficient funds) — wrap it
in `try/catch` if you want to handle those explicitly.

## Step 5: Transfer Coins

Send Convex Coins to another account:

```typescript
// ... after creating + wiring an account ...
const result = await convex.transfer('#11', 1_000_000);  // to #11, in coppers
console.log('Transfer result:', result.value);
```

## Complete Example

Here's everything together — query, create a funded account, transact, and read back:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

async function main() {
  const convex = new Convex('https://mikera1337-convex-testnet.hf.space');

  // 1. Free query — no account needed
  const foundation = await convex.query('(balance #13)');
  console.log('Account #13 balance:', foundation.value, 'copper');

  // 2. Create a faucet-funded account
  const keyPair = KeyPair.generate();
  const account = await convex.createAccount(keyPair, 100_000_000);
  convex.setAccount(account.address, keyPair);
  console.log('My account:', account.address);

  // 3. Execute a transaction
  const stored = await convex.transact('(def my-data {:message "Hello Convex"})');
  console.log('Stored:', stored.result);

  // 4. Query back the data
  const data = await convex.query('my-data');
  console.log('Read back:', data.value);
}

main().catch(console.error);
```

**🎉 Congratulations!** You've built your first Convex application with TypeScript.

## Next Steps

- **[Queries](./queries)** — Learn advanced query patterns
- **[Transactions](./transactions)** — Understand the transaction lifecycle
- **[Accounts](./accounts)** — Key pair generation and management
- **[Asset Handles](./assets)** — Token and CNS management
- **[Signers](./signers)** — Hardware wallet integration

## Common Issues

### "Cannot find module"
Make sure you're using Node.js 18+ and have `"type": "module"` in your `package.json`.

### "No account set"
You must call `convex.setAccount()` before submitting transactions. Read-only queries don't
need an account.

### `FUNDS` error
The account needs Convex Coins. On the testnet, create it with a faucet amount (Step 3) or call
`convex.faucet(address, amount)`; on production you must transfer in funds from an existing
account.

### "Connection refused"
Check the network URL. For local development, ensure your local peer is running.
