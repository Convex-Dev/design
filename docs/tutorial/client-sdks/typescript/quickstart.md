# Quickstart Tutorial

This tutorial will walk you through building your first Convex application using TypeScript.

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
npm install -D typescript @types/node
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

Create `src/query.ts`:

```typescript
import { Convex } from '@convex-world/convex-ts';

async function main() {
  // Connect to Convex network
  const convex = new Convex('https://peer.convex.live');

  // Query the Convex Foundation address balance
  const result = await convex.query('(balance #9)');

  console.log('Convex Foundation balance:', result.value, 'copper');
  console.log('In Convex Coins:', Number(result.value) / 1_000_000_000);
}

main().catch(console.error);
```

Run it:

```bash
npx tsx src/query.ts
```

You should see the balance of the Convex Foundation address!

## Step 3: Use Your Account

For this step, you'll need:
1. A Convex account address (e.g., `#1678`)
2. Your Ed25519 seed (32-byte hex string)

:::tip Getting an Account
If you don't have an account yet, you can:
- Use the [Convex Desktop](../../products/convex-desktop) application to create one
- Request test coins from the [testnet faucet](https://testnet.convex.live/faucet) (**test networks only**)
- Connect to a local peer for development

**Note**: Faucets only work on test networks. On production networks, someone must create an account for you and transfer initial funds. See the [Faucet Guide](/docs/tutorial/coins/faucet) for details.
:::

Create `src/account.ts`:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

async function main() {
  // Connect to network
  const convex = new Convex('https://peer.convex.live');

  // Load your key pair from seed
  // IMPORTANT: Never commit your seed to version control!
  const seed = process.env.CONVEX_SEED;
  if (!seed) {
    throw new Error('Please set CONVEX_SEED environment variable');
  }

  const keyPair = KeyPair.fromSeed(seed);

  // Set your account address
  const myAddress = process.env.CONVEX_ADDRESS || '#1678';
  convex.setAccount(myAddress, keyPair);

  // Get your account information
  const info = await convex.getAccountInfo();

  console.log('Address:', info.address);
  console.log('Balance:', info.balance / 1_000_000_000, 'Convex Coins');
  console.log('Sequence:', info.sequence, '(transaction count)');
}

main().catch(console.error);
```

Run with your credentials:

```bash
CONVEX_SEED=your-seed-hex CONVEX_ADDRESS=#1678 npx tsx src/account.ts
```

## Step 4: Submit a Transaction

Create `src/transfer.ts`:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

async function main() {
  const convex = new Convex('https://peer.convex.live');

  // Load your account
  const seed = process.env.CONVEX_SEED;
  if (!seed) throw new Error('Set CONVEX_SEED');

  const keyPair = KeyPair.fromSeed(seed);
  const myAddress = process.env.CONVEX_ADDRESS || '#1678';
  convex.setAccount(myAddress, keyPair);

  // Transfer 1 Convex Coin (1,000,000,000 copper)
  const recipient = '#456';
  const amount = 1_000_000_000;

  console.log(`Transferring ${amount / 1_000_000_000} Convex Coins to ${recipient}...`);

  const result = await convex.transfer(recipient, amount);

  if (result.status === 'success') {
    console.log('✅ Transaction successful!');
    console.log('   Hash:', result.hash);
  } else {
    console.error('❌ Transaction failed:', result.error);
  }
}

main().catch(console.error);
```

Run it:

```bash
CONVEX_SEED=your-seed CONVEX_ADDRESS=#1678 npx tsx src/transfer.ts
```

## Step 5: Execute Convex Lisp

You can execute any Convex Lisp code as a transaction:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

async function main() {
  const convex = new Convex('https://peer.convex.live');

  // Set up account
  const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
  convex.setAccount(process.env.CONVEX_ADDRESS!, keyPair);

  // Deploy a simple function
  const result = await convex.transact(`
    (def greeting "Hello from TypeScript!")
  `);

  console.log('Deployed:', result);

  // Query it back
  const query = await convex.query('greeting');
  console.log('Result:', query.value);
}

main().catch(console.error);
```

## Next Steps

Now that you've completed the quickstart, explore:

- **[Queries](./queries)** - Learn advanced query patterns
- **[Transactions](./transactions)** - Understand transaction lifecycle
- **[Accounts](./accounts)** - Key pair generation and management
- **[Signers](./signers)** - Hardware wallet integration
- **[React Integration](./react)** - Build React dApps

## Common Issues

### "Cannot find module"
Make sure you're using Node.js 18+ and have `"type": "module"` in your `package.json`.

### "No account set"
You must call `convex.setAccount()` before submitting transactions. Read-only queries don't need an account.

### "Connection refused"
Check that you're using the correct network URL. For local development, ensure your local peer is running.

## Complete Example

Here's a complete example combining everything:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

async function main() {
  const convex = new Convex('https://peer.convex.live');

  // 1. Read-only query (no account needed)
  console.log('=== Read-Only Query ===');
  const balance = await convex.query('(balance #9)');
  console.log('Convex Foundation:', balance.value, 'copper\n');

  // 2. Use your account
  console.log('=== Using Account ===');
  const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
  convex.setAccount(process.env.CONVEX_ADDRESS!, keyPair);

  const info = await convex.getAccountInfo();
  console.log('My balance:', info.balance / 1_000_000_000, 'coins\n');

  // 3. Execute a transaction
  console.log('=== Transaction ===');
  const result = await convex.transact('(def my-data {:timestamp (timestamp) :message "Hello Convex"})');
  console.log('Transaction:', result.hash);

  // 4. Query back the data
  const data = await convex.query('my-data');
  console.log('Stored data:', data.value);
}

main().catch(console.error);
```

**🎉 Congratulations!** You've built your first Convex application with TypeScript.
