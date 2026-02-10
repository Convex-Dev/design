---
sidebar_position: 3
---

# Transactions

Transactions are state-changing operations that execute Convex Lisp code and modify the network state.

## Transaction Basics

Unlike queries, transactions:

- ⚡ **Modify state** - Change account balances, deploy contracts, update data
- 💰 **Consume juice** - Require Convex Coins to pay for execution
- 🔐 **Require signing** - Must be cryptographically signed by account key
- ⏱️ **Achieve consensus** - Confirmed by network consensus (sub-second)
- 📈 **Increment sequence** - Each account has a monotonic sequence number

## Basic Transaction Pattern

```python
from convex_api import Convex, KeyPair

convex = Convex('https://peer.convex.live')

# Create and fund an account
key_pair = KeyPair()
account = convex.create_account(key_pair)
convex.request_funds(100_000_000, account)

# Execute a transaction
result = convex.transact('(def my-value 42)', account)

print(result.value)  # 42
```

## Transaction Methods

### `transact(transaction, account, sequence_retry_count=20)`

Execute Convex Lisp source code as a state-changing transaction.

```python
result = convex.transact('(def x 10)', account)
```

**Parameters:**
- `transaction` (str): Convex Lisp source code to execute
- `account` (Account): Account to sign and execute the transaction
- `sequence_retry_count` (int): Number of times to retry on sequence errors (default: 20)

**Returns:** Dictionary with transaction result:
```python
{
    'value': <result_value>,
    'id': <transaction_id>,
    'error': <error_code>  # Only present if transaction failed
}
```

**Raises:**
- `ConvexAPIError` - If transaction fails (after retries)
- `ValueError` - If transaction string is invalid

### `transfer(to_address_account, amount, account)`

Transfer Convex Coins to another account:

```python
# Transfer 0.01 CVX (10 million copper)
result = convex.transfer('#456', 10_000_000, account)

print(f'Transferred: {result} copper')
```

**Parameters:**
- `to_address_account` (Account | int | str): Recipient account or address
- `amount` (int | float): Amount in copper to transfer
- `account` (Account): Source account (must have sufficient balance)

**Returns:** Amount transferred in copper (int)

## Transaction Costs

Every transaction consumes **juice** based on:

1. **Memory usage** - Creating new data structures
2. **Computation** - CPU cycles for execution
3. **Storage** - Persisting data on-chain

Example juice costs:

```python
# Check balance before transaction
balance_before = convex.get_balance(account)

# Execute transaction
convex.transact('(def x [1 2 3 4 5])', account)

# Calculate juice consumed
balance_after = convex.get_balance(account)
juice_consumed = balance_before - balance_after

print(f'Juice consumed: {juice_consumed} copper')
```

Typical costs:
- **Simple expression**: 1,000 - 5,000 copper
- **Transfer**: 2,000 - 3,000 copper
- **Define variable**: 1,500 - 10,000 copper
- **Deploy contract**: 50,000 - 500,000 copper

## Transaction Patterns

### Defining Variables

Store data in your account's environment:

```python
# Define a simple value
convex.transact('(def my-number 42)', account)

# Define a collection
convex.transact('(def my-list [1 2 3 4 5])', account)

# Define a map
convex.transact('(def my-map {:name "Alice" :age 30})', account)

# Read back with a query
result = convex.query('my-number', account)
print(result.value)  # 42
```

### Transferring Funds

```python
# Create recipient
recipient_keys = KeyPair()
recipient = convex.create_account(recipient_keys)

# Transfer 0.05 CVX
convex.transfer(recipient.address, 50_000_000, account)

# Verify transfer
balance = convex.get_balance(recipient)
print(f'Recipient balance: {balance / 1_000_000_000} CVX')
```

### Deploying Smart Contracts

Deploy an actor (smart contract) using `deploy`:

```python
# Deploy a simple counter contract
contract_source = """
(deploy
  (do
    (def count 0)

    (defn increment []
      (def count (inc count))
      count)

    (defn get-count []
      count)))
"""

result = convex.transact(contract_source, account)
contract_address = result.value

print(f'Contract deployed at: #{contract_address}')
```

### Calling Deployed Contracts

Interact with deployed actors:

```python
# Call actor function
result = convex.transact(
    f'(call #{contract_address} (increment))',
    account
)

print(f'New count: {result.value}')

# Query actor state (free)
result = convex.query(
    f'(call #{contract_address} (get-count))',
    account
)

print(f'Current count: {result.value}')
```

### Multi-Step Transactions

Execute multiple operations atomically:

```python
transaction = """
(do
  (def x 10)
  (def y 20)
  (def sum (+ x y))
  (transfer #456 sum)
  sum)
"""

result = convex.transact(transaction, account)
print(f'Transferred {result.value} copper')
```

If any step fails, the entire transaction is rolled back.

## Sequence Numbers

Every transaction increments the account's sequence number:

```python
# Get current sequence
info = convex.get_account_info(account)
print(f'Current sequence: {info.sequence}')

# Submit transaction (auto-increments sequence)
convex.transact('(def x 1)', account)

# Sequence is now +1
info = convex.get_account_info(account)
print(f'New sequence: {info.sequence}')
```

### Handling Sequence Errors

When multiple transactions submit concurrently, sequence conflicts can occur. The SDK automatically retries:

```python
# Automatically retries up to 20 times
result = convex.transact('(def x 10)', account)

# Increase retry count for high-concurrency scenarios
result = convex.transact(
    '(def x 10)',
    account,
    sequence_retry_count=50
)
```

## Error Handling

Transactions can fail for various reasons:

```python
from convex_api.exceptions import ConvexAPIError

try:
    result = convex.transact('(transfer #999999 1000000000000)', account)
except ConvexAPIError as e:
    if e.code == 'FUNDS':
        print('Insufficient balance')
    elif e.code == 'NOBODY':
        print('Recipient account does not exist')
    elif e.code == 'SEQUENCE':
        print('Sequence error (unlikely after retries)')
    else:
        print(f'Transaction failed: {e.code} - {e.message}')
```

Common error codes:

| Code | Meaning | Solution |
|------|---------|----------|
| `FUNDS` | Insufficient balance | Request more funds or reduce amount |
| `NOBODY` | Account doesn't exist | Create recipient account first |
| `SEQUENCE` | Sequence mismatch | SDK auto-retries, increase retry count |
| `CAST` | Type error | Fix Lisp expression |
| `UNDECLARED` | Symbol not found | Check variable/function names |
| `ARGUMENT` | Invalid argument | Check function parameters |

## Advanced Patterns

### Conditional Transactions

Execute different logic based on conditions:

```python
transaction = """
(if (> *balance* 1000000)
  (transfer #456 500000)
  :insufficient-funds)
"""

result = convex.transact(transaction, account)
```

### Setting Account Keys

Transfer account control to a new key pair:

```python
# Generate new keys
new_keys = KeyPair()

# Set the new public key on-chain
transaction = f'(set-key {new_keys.public_key_checksum})'
convex.transact(transaction, account)

# Now only new_keys can transact for this address
```

**⚠️ Warning**: Save the new keys before changing! Losing keys means losing account access.

### Creating Sub-Accounts

Some contracts allow creating controlled sub-accounts:

```python
# Create account controlled by a contract
transaction = f'(call #{contract_address} (create-account))'
result = convex.transact(transaction, account)

sub_account_address = result.value
print(f'Created sub-account: #{sub_account_address}')
```

## Best Practices

### 1. Query Before Transacting

Test transactions with queries first:

```python
# Test with query (free)
result = convex.query('(transfer #456 1000000)', account)

if 'errorCode' in result:
    print(f'Would fail: {result["errorCode"]}')
else:
    # Proceed with transaction
    convex.transact('(transfer #456 1000000)', account)
```

### 2. Check Balance First

Verify sufficient funds before transacting:

```python
balance = convex.get_balance(account)
transfer_amount = 50_000_000

if balance < transfer_amount + 10_000:  # Extra for juice
    print('Insufficient balance')
else:
    convex.transfer('#456', transfer_amount, account)
```

### 3. Handle Failures Gracefully

Always handle potential errors:

```python
from convex_api.exceptions import ConvexAPIError

def safe_transfer(convex, to_address, amount, from_account):
    try:
        result = convex.transfer(to_address, amount, from_account)
        return result
    except ConvexAPIError as e:
        print(f'Transfer failed: {e.code}')
        return None
```

### 4. Use Atomic Transactions

Group related operations in a single transaction:

```python
# ❌ BAD - Two separate transactions
convex.transact('(def x 10)', account)
convex.transact('(def y (* x 2))', account)  # Might fail if first didn't commit

# ✅ GOOD - One atomic transaction
convex.transact('(do (def x 10) (def y (* x 2)))', account)
```

### 5. Keep Juice Costs Low

Minimize memory allocation and computation:

```python
# ❌ EXPENSIVE - Creates large data structure
convex.transact('(def big-list (range 1000000))', account)

# ✅ CHEAPER - Store minimal data
convex.transact('(def count 1000000)', account)
```

## Transaction Lifecycle

1. **Prepare** - SDK creates transaction with source and account address
2. **Sign** - Account's private key signs the transaction hash
3. **Submit** - Signed transaction sent to peer
4. **Consensus** - Network reaches consensus (typically < 1 second)
5. **Execute** - CVM executes transaction
6. **Result** - Result returned to client

```python
# All handled automatically by SDK
result = convex.transact('(def x 42)', account)

# But you can see the lifecycle in logs
import logging
logging.basicConfig(level=logging.DEBUG)

result = convex.transact('(def x 42)', account)
# Logs show: prepare → sign → submit → result
```

## Next Steps

- **[Account Management](accounts)** - Manage keys and account names
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp)** - Learn the smart contract language
- **[Actor Development](/docs/tutorial/actors)** - Build smart contracts
