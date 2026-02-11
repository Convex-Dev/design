# Querying Network State

Learn how to query the Convex network to read account balances, smart contract state, and execute read-only Convex Lisp expressions.

## Overview

Queries are **read-only operations** that don't require an account or keys. They allow you to:
- Read account balances
- Query smart contract state
- Execute Convex Lisp expressions
- Inspect network data

Queries do not modify state and are not recorded as transactions.

## Basic Query

The simplest way to query uses a string containing Convex Lisp code:

```typescript
import { Convex } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');

// Query an account balance
const result = await convex.query('(balance #13)');
console.log('Balance:', result.value);
```

## Query with Address Context

Some queries need an address context (the `*address*` special variable). You can set a default address on the client:

```typescript
// Set a default address for subsequent queries
convex.setAddress('#1678');

// Now query() automatically includes this address
const result = await convex.query('*balance*');
console.log('Balance:', result.value);
```

You can also pass address context explicitly using the object form:

```typescript
// Query using explicit address context
const result = await convex.query({
  address: '#1678',
  source: '*balance*'  // Uses the context address
});

console.log('Balance:', result.value);
```

:::tip When to Use Address Context
Use `setAddress()` or the object form with `address` when:
- Your query references `*address*` or other address-specific variables
- You need to execute code as if you were a specific account
- Querying actor-specific state

When `setAddress()` has been called, `query()` with a plain string automatically includes the address. For queries that don't depend on a context address, the simple string form is sufficient.
:::

## Common Query Patterns

### Account Balances

The preferred way to check balances is with the `balance()` convenience method:

```typescript
// Balance of the client's current address
const myBalance = await convex.balance();

// Balance of a specific account
const balance = await convex.balance('#13');
```

You can also query balances using Convex Lisp:

```typescript
// Specific account
const result = await convex.query('(balance #123)');
console.log('Balance:', result.value);

// Multiple accounts
const accounts = ['#9', '#10', '#11'];
for (const addr of accounts) {
  const result = await convex.query(`(balance ${addr})`);
  console.log(`${addr}:`, result.value);
}
```

### Mathematical Expressions

```typescript
// Execute Convex Lisp maths
const result = await convex.query('(+ 1 2 3 4 5)');
console.log('Sum:', result.value);  // 15

// More complex
const calc = await convex.query('(* (+ 10 5) (- 8 3))');
console.log('Result:', calc.value);  // 75
```

### Smart Contract Calls

```typescript
// Query a smart contract
const result = await convex.query('(call #789 (get-price :BTC))');
console.log('BTC Price:', result.value);
```

### CNS Lookups

The Convex Name Service (CNS) provides human-readable names for on-chain addresses. You can resolve CNS names directly or via a handle:

```typescript
// Direct CNS resolution
const result = await convex.query('@convex.core');
console.log('Address:', result.result);

// Or via a CNS handle
const handle = convex.cns('convex.core');
const resolved = await handle.resolve();
console.log('Address:', resolved.result);
```

## Handling Query Results

### Result Structure

Query results have this structure:

```typescript
interface Result {
  value?: any;        // JSON-converted CVM value
  result?: string;    // CVM printed representation (e.g. "#8" for an address)
  errorCode?: string; // Error code (triggers throw)
  info?: ResultInfo;  // Execution metadata (juice, fees, trace, etc.)
}
```

The `value` field contains the JSON-converted return value, whilst `result` contains the CVM printed representation as a string. For example, an address would appear as `"#8"` in `result` but may be a number in `value`.

### Error Handling

In v0.3.0, `query()` and `transact()` automatically throw a `ConvexError` when the CVM returns an error (i.e. when `errorCode` is present in the response). Use try/catch to handle errors:

```typescript
import { Convex, ConvexError } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');

try {
  const result = await convex.query('(balance #123)');
  console.log('Success:', result.value);
} catch (error) {
  if (error instanceof ConvexError) {
    // CVM error — the query was executed but failed
    console.error('CVM error code:', error.code);
    console.error('Execution info:', error.info);  // juice, fees, trace, etc.
    console.error('Full result:', error.result);
  } else {
    // Network or other error
    console.error('Network error:', error);
  }
}
```

The `ConvexError` class provides:
- `error.code` — the CVM error code string (e.g. `"NOBODY"`, `"UNDECLARED"`)
- `error.info` — a `ResultInfo` object with execution metadata (juice, fees, trace, etc.)
- `error.result` — the full `Result` object from the response

### Type Checking

```typescript
const result = await convex.query('(balance #123)');

// Parse numeric values
const balance = Number(result.value);
if (isNaN(balance)) {
  throw new Error('Expected numeric balance');
}

console.log('Balance in coins:', balance / 1_000_000_000);
```

## Advanced Queries

### Multi-line Queries

```typescript
const result = await convex.query(`
  (do
    (def total-supply 1000000000)
    (def circulating (* total-supply 0.3))
    {:total total-supply
     :circulating circulating
     :locked (- total-supply circulating)})
`);

console.log('Token metrics:', result.value);
```

### Querying Collections

```typescript
// Query a map
const userData = await convex.query(`
  (get user-data #1678)
`);

// Query a vector
const topScores = await convex.query(`
  (get-holding #789 :top-10-scores)
`);
```

### Conditional Queries

```typescript
const result = await convex.query(`
  (if (> (balance #123) 1000000)
    "Sufficient balance"
    "Insufficient balance")
`);
```

## Performance Tips

### Batch Queries

Run multiple independent queries in parallel:

```typescript
const [balance1, balance2, balance3] = await Promise.all([
  convex.query('(balance #100)'),
  convex.query('(balance #200)'),
  convex.query('(balance #300)')
]);
```

### Optimise Query Logic

```typescript
// Bad: Multiple round trips
const balance = await convex.query('(balance #123)');
const sequence = await convex.query('(account-sequence #123)');

// Good: Single query
const result = await convex.query(`
  {:balance (balance #123)
   :sequence (account-sequence #123)}
`);
```

## Next Steps

- **[Transactions](./transactions)** — Learn to modify state
- **[Asset Handles](./assets)** — Fluent API for tokens, assets, and CNS
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp/)** — Master the query language
