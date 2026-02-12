---
sidebar_position: 2
---

# JavaScript

Use Convex from plain JavaScript (no TypeScript required).

## Installation

```bash
npm install @convex-world/convex-ts
```

:::tip TypeScript Package
The package name is `@convex-world/convex-ts` but it works perfectly in plain JavaScript projects. The TypeScript definitions are optional.
:::

## Quick Start

### ES Modules (Recommended)

```javascript
import { Convex, KeyPair } from '@convex-world/convex-ts';

// Connect and query
const convex = new Convex('https://peer.convex.live');
const result = await convex.query('(balance #13)');
console.log('Balance:', result.value);
```

### CommonJS

```javascript
const { Convex, KeyPair } = require('@convex-world/convex-ts');

async function main() {
  const convex = new Convex('https://peer.convex.live');
  const result = await convex.query('(balance #13)');
  console.log('Balance:', result.value);
}

main().catch(console.error);
```

## Using Your Account

```javascript
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');

// Load your key pair
const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED);
convex.setAccount('#1678', keyPair);

// Check balance
const info = await convex.getAccountInfo();
console.log('Balance:', info.balance / 1_000_000_000, 'Convex Coins');

// Transfer coins
const result = await convex.transfer('#456', 1_000_000_000);
console.log('Transaction:', result.hash);
```

## Common Patterns

### Query Multiple Accounts

```javascript
const addresses = ['#9', '#10', '#11'];

for (const addr of addresses) {
  const result = await convex.query(`(balance ${addr})`);
  console.log(`${addr}: ${result.value} copper`);
}
```

### Execute Convex Lisp

```javascript
// Deploy a function
const deploy = await convex.transact(`
  (def greet
    (fn [name]
      (str "Hello, " name "!")))
`);

// Call it
const result = await convex.transact('(greet "World")');
console.log(result.result);  // "Hello, World!"
```

### Error Handling

```javascript
try {
  const result = await convex.transfer('#456', 1_000_000_000);

  if (result.status === 'success') {
    console.log('✅ Success!');
  } else {
    console.error('❌ Failed:', result.error);
  }
} catch (error) {
  console.error('Network error:', error.message);
}
```

## Package.json Setup

### ES Modules

Add to your `package.json`:

```json
{
  "type": "module"
}
```

### Running Scripts

```bash
# Node.js 18+
node script.js

# Or with tsx (handles both JS and TS)
npx tsx script.js
```

## Complete Example

```javascript
import { Convex, KeyPair } from '@convex-world/convex-ts';

async function main() {
  // Connect
  const convex = new Convex('https://peer.convex.live');

  // Query (no account needed)
  console.log('=== Query ===');
  const balance = await convex.query('(balance #9)');
  console.log('Convex Foundation:', balance.value, 'copper');

  // Use your account
  console.log('\n=== Account ===');
  const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED);
  convex.setAccount(process.env.CONVEX_ADDRESS, keyPair);

  const info = await convex.getAccountInfo();
  console.log('My balance:', info.balance / 1_000_000_000, 'coins');

  // Transaction
  console.log('\n=== Transaction ===');
  const result = await convex.transact('(def my-data "Hello from JavaScript!")');
  console.log('Transaction:', result.hash);
}

main().catch(console.error);
```

Run it:

```bash
CONVEX_SEED=your-seed CONVEX_ADDRESS=#1678 node app.js
```

## Key Differences from TypeScript

### No Type Annotations

```javascript
// JavaScript - no types
const convex = new Convex('https://peer.convex.live');
const result = await convex.query('(balance #13)');

// TypeScript - with types
const convex: Convex = new Convex('https://peer.convex.live');
const result: Result = await convex.query('(balance #13)');
```

### Runtime Validation

Without TypeScript, validate at runtime:

```javascript
function validateConfig(config) {
  if (!config.seed) {
    throw new Error('Missing seed');
  }
  if (!config.address) {
    throw new Error('Missing address');
  }
  return config;
}

const config = validateConfig({
  seed: process.env.CONVEX_SEED,
  address: process.env.CONVEX_ADDRESS
});
```

### JSDoc for IntelliSense

Get autocomplete without TypeScript:

```javascript
/**
 * @param {string} address - Convex address
 * @param {number} amount - Amount in copper
 * @returns {Promise<any>}
 */
async function transfer(address, amount) {
  return await convex.transfer(address, amount);
}
```

## Browser Usage

### With Module Bundler

```javascript
import { Convex } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');

document.getElementById('queryBtn').addEventListener('click', async () => {
  const result = await convex.query('(balance #9)');
  document.getElementById('result').textContent = result.value;
});
```

### With CDN (Not Recommended)

For quick prototypes only:

```html
<script type="module">
  import { Convex } from 'https://cdn.jsdelivr.net/npm/@convex-world/convex-ts/+esm';

  const convex = new Convex('https://peer.convex.live');
  const result = await convex.query('(balance #9)');
  console.log(result.value);
</script>
```

## React (JavaScript)

```javascript
import { useState, useEffect } from 'react';
import { Convex } from '@convex-world/convex-ts';

function ConvexBalance() {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const convex = new Convex('https://peer.convex.live');

    convex.query('(balance #9)').then(result => {
      setBalance(result.value);
    });
  }, []);

  return (
    <div>
      Balance: {balance ? `${balance} copper` : 'Loading...'}
    </div>
  );
}
```

## Further Reading

For detailed documentation, see the [TypeScript guide](/docs/tutorial/client-sdks/typescript). All concepts apply to JavaScript - just ignore the type annotations.

**Key topics:**
- [Queries](/docs/tutorial/client-sdks/typescript/queries) - Reading network state
- [Transactions](/docs/tutorial/client-sdks/typescript/transactions) - Modifying state
- [Accounts](/docs/tutorial/client-sdks/typescript/accounts) - Key pair management
- [Signers](/docs/tutorial/client-sdks/typescript/signers) - Hardware wallet integration
