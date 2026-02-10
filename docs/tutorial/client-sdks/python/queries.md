---
sidebar_position: 2
---

# Queries

Queries are read-only operations that execute Convex Lisp code without modifying network state.

## Basic Query Pattern

The simplest query executes Convex Lisp code from an account context:

```python
from convex_api import Convex, KeyPair

convex = Convex('https://peer.convex.live')

# Create an account for query context
key_pair = KeyPair()
account = convex.create_account(key_pair)

# Execute a query
result = convex.query('(+ 1 2 3)', account)

print(result.value)  # 6
```

## Queries are Free

Unlike transactions, queries:

- ✅ **Don't consume juice** - completely free to execute
- ✅ **Don't require balance** - work even with zero funds
- ✅ **Don't need signatures** - read-only access
- ✅ **Execute instantly** - no consensus delay

## Query Methods

### `query(transaction, address_account)`

Execute Convex Lisp source code as a read-only query.

```python
result = convex.query('(balance #123)', account)
```

**Parameters:**
- `transaction` (str): Convex Lisp source code to execute
- `address_account` (Account | int | str): Account, address, or address string for execution context

**Returns:** Dictionary with query result:
```python
{
    'value': <result_value>
}
```

### `get_balance(address_account)`

Get the balance of any account in copper:

```python
# Get your own balance
balance = convex.get_balance(account)

# Get another account's balance by address
balance = convex.get_balance(123)

# Or by address string
balance = convex.get_balance('#123')
```

**Returns:** Balance in copper (int)

### `get_account_info(address_account)`

Get detailed account information:

```python
info = convex.get_account_info(account)

print(f"Address: {info.address}")
print(f"Balance: {info.balance}")
print(f"Sequence: {info.sequence}")
print(f"Memory Size: {info.memorySize}")
print(f"Type: {info.type}")  # 'user', 'actor', or 'library'
```

**Returns:** `AccountDetailsResponse` with fields:
- `address` - Account address
- `balance` - Current balance in copper
- `sequence` - Transaction sequence number
- `memorySize` - Memory usage in bytes
- `allowance` - Memory allowance
- `type` - Account type (user/actor/library)
- `isActor` - Whether account is an actor
- `isLibrary` - Whether account is a library
- `environment` - Account environment (for actors)

## Query Patterns

### Checking Balances

```python
# Check if account has sufficient funds
balance = convex.get_balance(account)

if balance < 10_000_000:  # Less than 0.01 CVX
    print('Insufficient funds')
    convex.request_funds(100_000_000, account)
```

### Reading Contract State

```python
# Query a deployed contract's state
contract_address = '#789'
result = convex.query(f'(call {contract_address} (get-count))', account)

print(f'Contract count: {result.value}')
```

### Evaluating Expressions

```python
# Test Convex Lisp expressions before transacting
result = convex.query('(map inc [1 2 3 4 5])', account)
print(result.value)  # [2, 3, 4, 5, 6]

# Check syntax without executing
result = convex.query('(let [x 10] (* x x))', account)
print(result.value)  # 100
```

### Resolving Addresses

```python
# Resolve CNS names to addresses
address = convex.resolve_name('convex.trust')
print(f'convex.trust is at address #{address}')

# Resolve account names
address = convex.resolve_account_name('alice')
print(f'Account "alice" is at address #{address}')
```

### Reading Global State

```python
# Access special variables
balance_result = convex.query('*balance*', account)
print(f'My balance: {balance_result.value}')

address_result = convex.query('*address*', account)
print(f'My address: {address_result.value}')

timestamp_result = convex.query('*timestamp*', account)
print(f'Current timestamp: {timestamp_result.value}')
```

## Advanced Queries

### Multi-Step Queries

Execute multiple expressions in one query using `do`:

```python
query = """
(do
  (def x 10)
  (def y 20)
  (+ x y))
"""

result = convex.query(query, account)
print(result.value)  # 30
```

### Conditional Queries

Use Lisp conditionals to query based on state:

```python
query = """
(if (> *balance* 1000000)
  "Rich account"
  "Poor account")
"""

result = convex.query(query, account)
print(result.value)
```

### Query with Context

Query from a specific account's perspective:

```python
# Query as account #123
result = convex.query('*balance*', 123)

# Query as account object
result = convex.query('*balance*', account)

# Query as address string
result = convex.query('*balance*', '#123')
```

## Error Handling

Queries can fail due to syntax errors or runtime errors:

```python
from convex_api.exceptions import ConvexAPIError

try:
    result = convex.query('(invalid-function)', account)
except ConvexAPIError as e:
    print(f'Query failed: {e.code} - {e.message}')
```

Common error codes:
- `UNDECLARED` - Symbol not found
- `CAST` - Type error
- `ARITY` - Wrong number of arguments
- `BOUNDS` - Index out of bounds
- `NOBODY` - Account doesn't exist

## Best Practices

### 1. Query Before Transacting

Test expressions with queries before submitting transactions:

```python
# Test first
result = convex.query('(transfer #456 1000000)', account)

# If successful, transact
if 'errorCode' not in result:
    convex.transact('(transfer #456 1000000)', account)
```

### 2. Use Queries for Read-Only Data

Never use transactions when queries suffice:

```python
# ❌ BAD - wastes juice
result = convex.transact('(balance #123)', account)

# ✅ GOOD - free query
balance = convex.get_balance(123)
```

### 3. Cache Query Results

Query results don't change unless someone transacts:

```python
# Cache contract metadata
contract_info = convex.query(f'(call {contract_address} (get-metadata))', account)

# Reuse cached info until state changes
```

### 4. Query from Minimal Context

You don't need a funded account to query:

```python
# Create account with no funds just for querying
key_pair = KeyPair()
query_account = convex.create_account(key_pair)

# Query without ever funding it
result = convex.query('(+ 1 2)', query_account)
```

## Performance Tips

### Minimize Query Complexity

Complex queries take longer to execute:

```python
# ❌ SLOW - iterates entire range
result = convex.query('(reduce + (range 1000000))', account)

# ✅ FAST - simple arithmetic
result = convex.query('(* 1000000 500000)', account)
```

### Batch Related Queries

Use `do` to execute multiple queries in one request:

```python
query = """
(do
  (def balance *balance*)
  (def timestamp *timestamp*)
  {:balance balance :timestamp timestamp})
"""

result = convex.query(query, account)
print(result.value)  # {'balance': 100000000, 'timestamp': 1234567890}
```

## Next Steps

- **[Transaction Guide](transactions)** - Learn how to modify network state
- **[Account Management](accounts)** - Manage keys and accounts
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp)** - Learn the query language
