---
sidebar_position: 3
---

# Transactions

Transactions are state-changing operations that execute Convex Lisp code and modify the network state.

:::warning
convex-sdk 0.3.3 cannot submit transactions to peers running Convex 0.8.17 or later. See the [known limitations](/docs/tutorial/client-sdks/python).
:::

## Transaction Basics

Unlike queries, transactions:

- **Modify state** - Change account balances, deploy contracts, update data
- **Consume juice** - Require Convex Coins to pay for execution
- **Require signing** - Must be cryptographically signed by account key
- **Achieve consensus** - Confirmed by network consensus (sub-second)
- **Increment sequence** - Each account has a monotonic sequence number

## Basic Transaction Pattern

```python
from convex_sdk import Convex, KeyPair

convex = Convex('https://mikera1337-convex-testnet.hf.space')

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

**Returns:** a `SubmitTransactionResponse` model whose `value` attribute holds the result of the transaction as a Python value. Read it as `result.value`; the model is not a dictionary, so `result['value']` raises `TypeError`.

**Raises:**
- `ConvexAPIError` - If the transaction fails (after retries). The CVM error code is in `e.code` and the message in `e.text`
- `ValueError` - If the transaction string is empty

### `transfer(to_address_account, amount, account)`

Transfer Convex Coins to another account:

```python
# Transfer 0.01 CVM (10 million copper)
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

# The difference is what the transaction cost
balance_after = convex.get_balance(account)
cost = balance_before - balance_after

print(f'Transaction cost: {cost} copper')
```

Measured on a freshly started local peer, the cost in copper of a few transactions:

| Transaction | Cost (copper) |
|---|---|
| `(+ 1 2 3)` | about 15,000 |
| `(def x 10)` | about 24,000 |
| `(def my-map {:name "Alice" :age 30})` | about 74,000 |
| `(transfer #<address> 10000000)` | about 18,000 to 24,000, plus the 10,000,000 sent |
| Deploying the counter actor below | about 627,000 |

Costs rise with the memory a transaction allocates, and they depend on the network's current prices, so treat these as orders of magnitude and measure on the network you use.

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

# Transfer 0.05 CVM
convex.transfer(recipient.address, 50_000_000, account)

# Verify transfer
balance = convex.get_balance(recipient)
print(f'Recipient balance: {balance / 1_000_000_000} CVM')
```

### Deploying Smart Contracts

Deploy an actor (smart contract) using `deploy`:

Two details make the difference between a deployed actor and code that merely ran in your own account: the source passed to `deploy` must be **quoted**, so it executes inside the new account rather than the caller's, and any function meant to be reachable from outside needs the `^:callable` metadata. Note also that the state is named `counter-value` — `count` is a core function, and compiled code links core definitions statically, so an actor that defines `count` fails at call time with `:CAST`.

```python
# Deploy a simple counter contract
contract_source = """
(deploy
  '(do
     (def counter-value 0)

     (defn ^:callable increment []
       (def counter-value (inc counter-value))
       counter-value)

     (defn ^:callable get-count []
       counter-value)))
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
from convex_sdk.exceptions import ConvexAPIError

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
        print(f'Transaction failed: {e.code} - {e.text}')
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

**Warning**: Save the new keys before changing! Losing keys means losing account access.

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
from convex_sdk.exceptions import ConvexAPIError

# Test with query (free). A failing query raises, and changes nothing
try:
    convex.query('(transfer #456 1000000)', account)
except ConvexAPIError as e:
    print(f'Would fail: {e.code}')
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
from convex_sdk.exceptions import ConvexAPIError

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
# ❌ BAD - Two separate transactions: two fees, and if the second fails
# the first has already taken effect
convex.transact('(def x 10)', account)
convex.transact('(def y (* x 2))', account)

# ✅ GOOD - One atomic transaction: both steps apply or neither does
convex.transact('(do (def x 10) (def y (* x 2)))', account)
```

### 5. Keep Juice Costs Low

Minimize memory allocation and computation:

```python
# ❌ EXPENSIVE - Builds and stores a 1,000-element vector (about 2,700,000 copper)
convex.transact(
    '(def big-list (loop [i 0 v []] (if (< i 1000) (recur (inc i) (conj v i)) v)))',
    account
)

# ✅ CHEAPER - Store a single number (about 45,000 copper)
convex.transact('(def element-count 1000)', account)
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
