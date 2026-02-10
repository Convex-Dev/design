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

The simplest transaction transfers Convex Coins:

```typescript
// Transfer 1 Convex Coin (1,000,000,000 copper)
const result = await convex.transfer('#456', 1_000_000_000);

if (result.status === 'success') {
  console.log('✅ Transfer successful!');
  console.log('   Transaction hash:', result.hash);
} else {
  console.error('❌ Transfer failed:', result.error);
}
```

:::info Copper vs Coins
Amounts are in **copper coins** where:
- 1 Convex Coin = 1,000,000,000 copper
- Minimum amount = 1 copper
:::

## Executing Convex Lisp

Execute arbitrary Convex Lisp code as a transaction:

```typescript
// Deploy a function
const result = await convex.transact(`
  (def greet
    (fn [name]
      (str "Hello, " name "!")))
`);

// Call the function
const greeting = await convex.transact('(greet "Alice")');
console.log(greeting.result);  // "Hello, Alice!"
```

## Transaction Object

Use the object form for more control:

```typescript
const result = await convex.transact({
  to: '#456',              // Destination (optional)
  amount: 1_000_000_000,       // Amount in copper (optional)
  data: {                  // Additional data (optional)
    memo: 'Payment for services',
    invoice: 'INV-2024-001'
  }
});
```

## Transaction Results

### Success

```typescript
interface TransactionResult {
  status: 'success';
  hash: string;           // Transaction hash
  result: any;           // Return value of executed code
  sequence: number;      // Transaction sequence number
}
```

Example:

```typescript
const result = await convex.transact('(+ 1 2 3)');

if (result.status === 'success') {
  console.log('Hash:', result.hash);
  console.log('Result:', result.result);  // 6
  console.log('Sequence:', result.sequence);
}
```

### Failure

```typescript
interface TransactionResult {
  status: 'error';
  error: string;         // Error message
  errorCode?: string;    // Error code
}
```

Example:

```typescript
try {
  const result = await convex.transact('(/ 1 0)');  // Division by zero

  if (result.status === 'error') {
    console.error('Transaction failed:', result.error);
    console.error('Error code:', result.errorCode);
  }
} catch (error) {
  console.error('Network or signing error:', error);
}
```

## Common Transaction Patterns

### Deploy Smart Contract

```typescript
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

console.log('Contract deployed:', contract.hash);
```

### Call Smart Contract

```typescript
// Call a deployed actor
const result = await convex.transact('(call #789 (transfer #456 1000))');

if (result.status === 'success') {
  console.log('Contract call successful:', result.result);
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

## Error Handling

### Network Errors

```typescript
try {
  const result = await convex.transact('(+ 1 2)');
} catch (error) {
  if (error instanceof Error) {
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

### Transaction Failures

```typescript
const result = await convex.transact('(transfer #456 999999999999)');

if (result.status === 'error') {
  if (result.errorCode === 'FUNDS') {
    console.error('Insufficient balance');
  } else if (result.errorCode === 'STATE') {
    console.error('Invalid state transition');
  } else {
    console.error('Transaction failed:', result.error);
  }
}
```

### Retry Logic

```typescript
async function transactWithRetry(
  convex: Convex,
  code: string,
  maxRetries = 3
): Promise<TransactionResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await convex.transact(code);
      return result;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Unreachable');
}
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

// Explicitly set sequence (rarely needed)
const result = await convex.transact({
  to: '#456',
  amount: 1_000_000_000,
  sequence: sequence
});
```

:::tip Automatic Sequence Management
The SDK automatically manages sequence numbers. You rarely need to set them manually.
:::

## Gas and Fees

Transactions consume **juice** (gas) which is paid in Convex Coins:

```typescript
// Check juice price
const priceInfo = await convex.query('*juice-price*');
console.log('Juice price:', priceInfo.value);

// Estimate transaction cost
const estimate = await convex.query(`
  (juice-cost '(transfer #456 1000000))
`);
console.log('Estimated juice:', estimate.value);
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
const result = await convex.transact(`
  (let [unlock-time 1735689600000]  ; Unix timestamp
    (if (> (timestamp) unlock-time)
      (transfer #456 1000000)
      (fail "Funds locked until unlock time")))
`);
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

### ✅ Do

- Check balance before large transfers
- Handle both success and error cases
- Use meaningful error messages
- Log transaction hashes for audit trails
- Test on testnet first

### ❌ Don't

- Hardcode private seeds in code
- Ignore transaction errors
- Submit transactions in tight loops
- Forget to check result status
- Skip validation of user input

## Next Steps

- **[Accounts](./accounts)** - Key pair and account management
- **[Signers](./signers)** - Hardware wallet integration
- **[Actors](../../actors/)** - Build smart contracts
- **[Convex Lisp](../../convex-lisp/)** - Learn the language

## See Also

- [Transaction CAD](../../../cad/010_transactions/)
- [Juice & Gas](../../../cad/007_juice/)
- [Error Codes](../../../cad/011_errors/)
