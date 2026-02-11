# Submitting Transactions

Learn how to submit transactions to modify state on the Convex network.

## Overview

Transactions are **state-modifying operations** that require:
- An account address (e.g., `#1678`)
- A cryptographic signer (key pair or hardware wallet)
- Sufficient balance to pay for execution

Unlike queries, transactions are recorded on the network and modify the global state.

## Prerequisites

Before submitting transactions, you need:

1. **Account Address** - Your Convex account number
2. **Ed25519 Seed** - Your 32-byte private seed
3. **Balance** - Sufficient Convex Coins for transaction fees

Set up your account:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');
const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
convex.setAccount('#1678', keyPair);
```

## Basic Transfer

The `transfer()` method sends Convex Coins to another account:

```typescript
// Transfer 1 Convex Coin (1,000,000,000 copper)
const result = await convex.transfer('#456', 1_000_000_000);
console.log('Transfer result:', result.value);
```

The second argument is a `BalanceLike` type, accepting `number`, `bigint`, or `string`:

```typescript
await convex.transfer('#456', 1_000_000_000);          // number
await convex.transfer('#456', 1000000000000000000n);    // bigint
await convex.transfer('#456', '1000000000');             // string
```

:::info Copper vs Coins
Amounts are in **copper coins** where:
- 1 Convex Coin = 1,000,000,000 copper
- Minimum amount = 1 copper
:::

## Executing Convex Lisp

The `transact()` method accepts a **string of Convex Lisp source code** and executes it as a transaction:

```typescript
// Deploy a function
await convex.transact(`
  (def greet
    (fn [name]
      (str "Hello, " name "!")))
`);

// Call the function
const greeting = await convex.transact('(greet "Alice")');
console.log(greeting.value);   // "Hello, Alice!"
console.log(greeting.result);  // "Hello, Alice!" (CVM printed representation)
```

## Transaction Results

Both `transact()` and `transfer()` return a `Result` object on success:

```typescript
interface Result {
  value?: any;        // JSON-converted CVM value
  result?: string;    // CVM printed representation
  errorCode?: string; // Absent on success
  info?: ResultInfo;  // Juice, fees, mem, trace, etc.
}
```

Example:

```typescript
const result = await convex.transact('(+ 1 2 3)');
console.log('Value:', result.value);     // 6
console.log('Result:', result.result);   // "6"
console.log('Juice used:', result.info?.juice);
```

## Error Handling

When the CVM encounters an error during transaction execution, `transact()` and `transfer()` **throw a `ConvexError`**. There is no `status` field to check.

### CVM Errors

```typescript
import { Convex, KeyPair, ConvexError } from '@convex-world/convex-ts';

try {
  await convex.transact('(transfer #456 999999999999)');
} catch (e) {
  if (e instanceof ConvexError) {
    console.error('CVM error code:', e.code);   // "FUNDS", "STATE", etc.
    console.error('Juice used:', e.info?.juice);
  }
}
```

### Network Errors

Network and connection issues throw standard JavaScript errors:

```typescript
try {
  await convex.transact('(+ 1 2)');
} catch (error) {
  if (error instanceof ConvexError) {
    console.error('CVM error:', error.code);
  } else if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      console.error('Network timeout - retry?');
    } else if (error.message.includes('connect')) {
      console.error('Cannot connect to peer');
    } else {
      console.error('Unexpected error:', error.message);
    }
  }
}
```

### Retry Logic

```typescript
async function transactWithRetry(
  convex: Convex,
  code: string,
  maxRetries = 3
): Promise<Result> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await convex.transact(code);
    } catch (error) {
      if (error instanceof ConvexError) throw error; // CVM errors are not retryable
      if (attempt === maxRetries) throw error;
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Unreachable');
}
```

## Common Transaction Patterns

### Deploy Smart Contract

```typescript
try {
  const contract = await convex.transact(`
    (do
      (def token-balance
        (let [balances {}]
          {:balances balances}))

      (defn transfer [to amount]
        (let [from *caller*
              from-bal (get-in token-balance [:balances from] 0)
              to-bal (get-in token-balance [:balances to] 0)]
          (cond
            (< from-bal amount)
              (fail "Insufficient balance")
            :else
              (do
                (assoc-in! token-balance [:balances from] (- from-bal amount))
                (assoc-in! token-balance [:balances to] (+ to-bal amount))
                {:success true})))))
  `);

  console.log('Contract deployed:', contract.value);
} catch (e) {
  if (e instanceof ConvexError) {
    console.error('Deploy failed:', e.code);
  }
}
```

### Call Smart Contract

```typescript
try {
  const result = await convex.transact('(call #789 (transfer #456 1000))');
  console.log('Contract call result:', result.value);
} catch (e) {
  if (e instanceof ConvexError) {
    console.error('Contract call failed:', e.code);
  }
}
```

### Batch Operations

```typescript
// Multiple operations in one transaction
const result = await convex.transact(`
  (do
    (def user-data {:name "Alice" :level 5})
    (def user-inventory [:sword :shield :potion])
    (transfer #789 100000)
    {:user user-data
     :inventory user-inventory})
`);
```

## Transaction Lifecycle

1. **Prepare** - Client creates transaction with sequence number
2. **Sign** - Transaction is signed with your private key
3. **Submit** - Signed transaction sent to peer
4. **Validate** - Peer validates signature and sequence
5. **Execute** - CVM executes the transaction code
6. **Consensus** - Transaction included in consensus
7. **Finalise** - Transaction permanently recorded

## Sequence Numbers

Each account has a sequence number that increments with each transaction:

```typescript
// Get current sequence
const sequence = await convex.getSequence();
console.log('Next transaction sequence:', sequence);
```

:::tip Automatic Sequence Management
The SDK automatically manages sequence numbers. You rarely need to inspect them manually.
:::

## Juice and Fees

Transactions consume **juice** which is paid in Convex Coins:

```typescript
// Check juice price
const priceInfo = await convex.query('*juice-price*');
console.log('Juice price:', priceInfo.value);
```

After a transaction completes, you can inspect juice consumption via the result:

```typescript
const result = await convex.transact('(transfer #456 1000000)');
console.log('Juice used:', result.info?.juice);
console.log('Fees paid:', result.info?.fees);
```

## Advanced Patterns

### Conditional Transfer

```typescript
const result = await convex.transact(`
  (let [balance (balance *address*)
        threshold 10000000]
    (if (> balance threshold)
      (do
        (transfer #456 (- balance threshold))
        {:transferred (- balance threshold)})
      {:transferred 0}))
`);
```

### Time-locked Transaction

```typescript
try {
  const result = await convex.transact(`
    (let [unlock-time 1735689600000]  ; Unix timestamp
      (if (> (timestamp) unlock-time)
        (transfer #456 1000000)
        (fail "Funds locked until unlock time")))
  `);
  console.log('Unlocked and transferred:', result.value);
} catch (e) {
  if (e instanceof ConvexError) {
    console.error('Still locked:', e.code);
  }
}
```

### Multi-step Transaction

```typescript
const result = await convex.transact(`
  (do
    ; Step 1: Validate
    (assert (> (balance *address*) 1000000) "Insufficient balance")

    ; Step 2: Transfer
    (transfer #456 500000)

    ; Step 3: Update state
    (def last-transfer (timestamp))

    ; Step 4: Return receipt
    {:success true
     :amount 500000
     :timestamp last-transfer})
`);
```

## Best Practices

**Do:**

- Check balance before large transfers
- Catch `ConvexError` and handle CVM error codes
- Use meaningful error messages in your Convex Lisp code
- Log transaction results for audit trails
- Test on testnet first

**Don't:**

- Hardcode private seeds in source code
- Ignore thrown errors from `transact()` or `transfer()`
- Submit transactions in tight loops
- Skip validation of user input
- Pass objects to `transact()` -- it only accepts Convex Lisp strings

## Next Steps

- **[Accounts](./accounts)** — Key pair and account management
- **[Asset Handles](./assets)** — Fluent API for tokens and CNS
- **[Signers](./signers)** — Hardware wallet integration
- **[Convex Lisp](/docs/tutorial/convex-lisp/)** — Learn the language
