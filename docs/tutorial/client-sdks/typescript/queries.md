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

Some queries need an address context (the `*address*` special variable):

```typescript
// Query using address context
const result = await convex.query({
  address: '#1678',
  source: '*balance*'  // Uses the context address
});

console.log('Balance:', result.value);
```

:::tip When to Use Address Context
Use the object form with `address` when:
- Your query references `*address*` or other address-specific variables
- You need to execute code as if you were a specific account
- Querying actor-specific state

For most queries, the simple string form is sufficient.
:::

## Common Query Patterns

### Account Balances

```typescript
// Specific account
const balance = await convex.query('(balance #123)');

// Multiple accounts
const accounts = ['#9', '#10', '#11'];
for (const addr of accounts) {
  const result = await convex.query(`(balance ${addr})`);
  console.log(`${addr}:`, result.value);
}
```

### Mathematical Expressions

```typescript
// Execute Convex Lisp math
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

// With parameters
const tokenInfo = await convex.query(`
  (call *registry* (cns-resolve :my-token))
`);
console.log('Token:', tokenInfo.value);
```

### Registry Lookups

```typescript
// CNS (Convex Name Service) lookups
const address = await convex.query(`
  (call *registry* (cns-resolve :convex.trust))
`);

// CAD (Convex Architecture Document) lookups
const cadInfo = await convex.query(`
  (call *registry* (lookup :CAD001))
`);
```

## Handling Query Results

### Result Structure

Query results have this structure:

```typescript
interface Result {
  value: any;           // The query result value
  errorCode?: string;   // Present if query failed
  info?: any;          // Additional information
}
```

### Error Handling

```typescript
try {
  const result = await convex.query('(balance #123)');

  if (result.errorCode) {
    console.error('Query failed:', result.errorCode);
  } else {
    console.log('Success:', result.value);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

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

### Cache Results

Cache query results when appropriate:

```typescript
class ConvexCache {
  private cache = new Map<string, { value: any; expires: number }>();

  async query(convex: Convex, source: string, ttl = 5000) {
    const cached = this.cache.get(source);
    if (cached && Date.now() < cached.expires) {
      return cached.value;
    }

    const result = await convex.query(source);
    this.cache.set(source, {
      value: result,
      expires: Date.now() + ttl
    });

    return result;
  }
}
```

### Optimise Query Logic

```typescript
// ❌ Bad: Multiple round trips
const balance = await convex.query('(balance #123)');
const sequence = await convex.query('(account-sequence #123)');

// ✅ Good: Single query
const result = await convex.query(`
  {:balance (balance #123)
   :sequence (account-sequence #123)}
`);
```

## Next Steps

- **[Transactions](./transactions)** - Learn to modify state
- **[Convex Lisp Guide](../../convex-lisp/)** - Master the query language
- **[API Reference](./api-reference)** - Complete API documentation

## See Also

- [Convex Lisp Tutorial](../../convex-lisp/)
- [Actors & Smart Contracts](../../actors/)
- [Network State & Values](../../../cad/002_values/)
