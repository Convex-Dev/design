# Asset Handles

Learn how to interact with on-chain assets using the fluent Asset Handle APIs introduced in v0.3.0.

## Overview

Asset handles provide a lightweight, fluent API for working with on-chain assets. Rather than composing raw Convex Lisp expressions, you create a handle object and call methods directly.

Three handle types are available:

- **🪙 FungibleToken** — CAD29 fungible tokens (`@convex.fungible/*`)
- **📦 AssetHandle** — Generic assets including NFTs (`@convex.asset/*`)
- **🏷️ CnsHandle** — Convex Name System (`@convex.cns/*`)

Handles are:
- **Lightweight** — no network calls on construction
- **Stateless** — they hold only the asset address and a reference back to the `Convex` client
- **Synchronous to create** — `convex.fungible('#128')` returns immediately

:::info No Account Needed for Queries
Read-only methods such as `balance()`, `supply()`, and `decimals()` work without setting an account. State-modifying methods like `transfer()` and `mint()` require an account and signer.
:::

## 🪙 Fungible Tokens

Use `convex.fungible()` to create a `FungibleToken` handle for any CAD29-compliant token:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');
const token = convex.fungible('#128');
```

### Querying Token State

Read-only operations — no account needed:

```typescript
// Balance of the client's current address
const bal = await token.balance();

// Balance of another account
const bal2 = await token.balance('#13');

// Total supply across all holders
const sup = await token.supply();

// Number of decimal places (for display formatting)
const dec = await token.decimals();
```

### Transacting with Tokens

State-modifying operations — requires an account:

```typescript
const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
convex.setAccount('#1678', keyPair);

// Transfer tokens to another account
await token.transfer('#456', 1000);

// BigInt is supported for large amounts
await token.transfer('#456', 1000000000000000000n);

// Mint new tokens (must have minting authority)
await token.mint(5000);

// Burn tokens from your own balance
await token.burn(100);
```

### Amount Validation

All amounts are validated as non-negative integers. The `BalanceLike` type accepts:

| Type | Example | Notes |
|------|---------|-------|
| `number` | `1000` | Must be a non-negative integer |
| `bigint` | `1000000000000000000n` | For amounts exceeding `Number.MAX_SAFE_INTEGER` |
| `string` | `"1000"` | Parsed as an integer string |

Negative values, fractional numbers, and non-numeric strings throw immediately on the client side.

## 📦 Generic Assets (NFTs and More)

Use `convex.asset()` to create an `AssetHandle` for any asset that follows the Convex asset protocol — including NFTs, multi-token contracts, and other custom assets:

```typescript
const asset = convex.asset('#256');
```

### Querying Asset State

```typescript
// Balance of the client's current address
const bal = await asset.balance();

// Total supply
const sup = await asset.supply();
```

### Transferring Assets

The quantity parameter is flexible — it can be a number, bigint, or a CVM expression string for non-numeric asset quantities:

```typescript
// Fungible-like numeric transfer
await asset.transfer('#456', 100);

// NFT set transfer using a CVM expression string
await asset.transfer('#456', '#{:foo :bar}');
```

:::tip CVM Expression Strings
When you pass a string quantity like `'#{:foo :bar}'`, it is sandboxed inside a `(query ...)` form before being embedded in the transaction. This prevents injection of arbitrary code and ensures only valid CVM data expressions are accepted.
:::

### Offer / Accept Pattern

For trustless exchanges where two parties need to swap assets without trusting each other, use the offer/accept pattern:

```typescript
// Party A: offer specific NFTs to Party B
await asset.offer('#456', '#{1 2 3}');

// Party B: accept a fungible quantity from Party A
await asset.accept('#456', 50);
```

The offer is recorded on-chain and can only be claimed by the designated recipient through `accept()`.

## 🏷️ CNS (Convex Name System)

Use `convex.cns()` to create a `CnsHandle` for resolving and managing Convex Name System entries:

```typescript
const handle = convex.cns('convex.core');
```

### Reading CNS Entries

No account needed:

```typescript
// Resolve a name to its address
const result = await handle.resolve();    // → #8
```

### Writing CNS Entries

Requires an account with the appropriate CNS permissions:

```typescript
const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
convex.setAccount('#1678', keyPair);

// Update the address a name points to
await handle.set('#1678');

// Transfer control of the name to another account
await handle.setController('#99');
```

### Name Validation

Names are validated on construction. The following will throw immediately — no network round-trip required:

- Empty strings
- Names starting with a digit
- Names containing parentheses or other invalid characters

```typescript
// These throw immediately:
convex.cns('');              // Error: invalid CNS name
convex.cns('123bad');        // Error: invalid CNS name
convex.cns('foo(bar)');      // Error: invalid CNS name
```

## Error Handling

All handle methods throw `ConvexError` when the CVM returns an error. This is the same error type used by `query()` and `transact()`:

```typescript
import { Convex, KeyPair, ConvexError } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');
const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
convex.setAccount('#1678', keyPair);

const token = convex.fungible('#128');

try {
  await token.transfer('#456', 999999999);
} catch (e) {
  if (e instanceof ConvexError) {
    console.error('CVM error code:', e.code);   // e.g. "FUNDS"
    console.error('Execution info:', e.info);    // { juice: 100, fees: 50, ... }
  }
}
```

Common error codes you may encounter:

| Code | Meaning |
|------|---------|
| `FUNDS` | Insufficient token balance for the operation |
| `TRUST` | Caller lacks permission (e.g. minting without authority) |
| `ARGUMENT` | Invalid argument (e.g. negative amount reached the CVM) |
| `STATE` | Invalid state for the operation |
| `NOBODY` | Target account does not exist |

## Class Hierarchy

The three handle types are organised as follows:

- **`AssetHandle`** — base class for generic asset operations (`balance`, `supply`, `transfer`, `offer`, `accept`)
- **`FungibleToken` extends `AssetHandle`** — adds optimised fungible-specific operations (`decimals`, `mint`, `burn`)
- **`CnsHandle`** — independent class for name resolution (`resolve`, `set`, `setController`)

`FungibleToken` inherits all `AssetHandle` methods, so you can use `offer()` and `accept()` on fungible tokens as well.

## Complete Example

Putting it all together — querying a token, checking a CNS name, and performing a transfer:

```typescript
import { Convex, KeyPair, ConvexError } from '@convex-world/convex-ts';

async function main() {
  const convex = new Convex('https://peer.convex.live');

  // 1. Resolve a token address from CNS (no account needed)
  const cns = convex.cns('my.custom.token');
  const resolved = await cns.resolve();
  console.log('Token address:', resolved.result);

  // 2. Create a fungible token handle
  const token = convex.fungible(resolved.result);

  // 3. Query token metadata
  const supply = await token.supply();
  const decimals = await token.decimals();
  console.log('Total supply:', supply, `(${decimals} decimal places)`);

  // 4. Set up account for transactions
  const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
  convex.setAccount(process.env.CONVEX_ADDRESS!, keyPair);

  // 5. Check balance and transfer
  const balance = await token.balance();
  console.log('My balance:', balance);

  if (balance > 0) {
    try {
      await token.transfer('#456', 100);
      console.log('Transfer successful');
    } catch (e) {
      if (e instanceof ConvexError) {
        console.error('Transfer failed:', e.code);
      }
    }
  }
}

main().catch(console.error);
```

## Next Steps

- **[Queries](./queries)** — Learn about read-only queries and result handling
- **[Transactions](./transactions)** — Understand the full transaction lifecycle
- **[Convex Lisp](/docs/tutorial/convex-lisp/)** — Master the language behind asset contracts
