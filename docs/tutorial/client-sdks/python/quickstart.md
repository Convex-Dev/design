---
sidebar_position: 1
---

# Quickstart

Build your first Python application on Convex in under 5 minutes.

## Prerequisites

- Python 3.8 or higher
- pip or Poetry package manager

## Step 1: Install the SDK

Install the `convex-api` package:

```bash
pip install convex-api
```

Or with Poetry:

```bash
poetry add convex-api
```

## Step 2: Connect to the Network

Create a new Python file `hello_convex.py`:

```python
from convex_api import Convex

# Connect to the public Convex network
convex = Convex('https://peer.convex.live')

print('Connected to Convex network')
```

The peer URL `https://peer.convex.live` connects you to the public Convex network. You can also run a local peer for development.

## Step 3: Create an Account

Generate a new key pair and create an account:

```python
from convex_api import Convex, KeyPair

convex = Convex('https://peer.convex.live')

# Generate a new Ed25519 key pair
key_pair = KeyPair()

# Create an account on the network
account = convex.create_account(key_pair)

print(f'Account created with address: {account.address}')
print(f'Public key: {key_pair.public_key}')
```

**Important**: Save your key pair! Without it, you cannot access your account:

```python
# Export keys to encrypted file
key_pair.export_to_file('my_account.pem', 'my_secret_password')

# Later, import them back
key_pair = KeyPair.import_from_file('my_account.pem', 'my_secret_password')
```

## Step 4: Request Test Funds

New accounts start with zero balance. Use the faucet to get test funds:

```python
# Request 100 million copper (0.1 Convex Coins)
amount = convex.request_funds(100_000_000, account)

print(f'Received {amount / 1_000_000_000} Convex Coins')
```

The faucet is available on test networks. Production networks require purchasing or earning Convex Coins.

## Step 5: Query Your Balance

Read your account balance using a query:

```python
# Query balance in copper
balance = convex.get_balance(account)

# Convert to Convex Coins
coins = balance / 1_000_000_000

print(f'Balance: {coins} CVX ({balance} copper)')
```

Queries are **read-only** and **free** - they don't consume any funds.

## Step 6: Execute a Transaction

Submit a transaction to execute Convex Lisp code:

```python
# Execute a simple Lisp expression
result = convex.transact('(map inc [1 2 3 4])', account)

print(f'Result: {result.value}')  # [2, 3, 4, 5]
```

Transactions **modify state** and **consume juice**. They require:
- A funded account (balance > 0)
- A valid key pair for signing
- Sufficient balance for execution costs

## Step 7: Transfer Funds

Send Convex Coins to another account:

```python
# Create a second account
recipient_key_pair = KeyPair()
recipient = convex.create_account(recipient_key_pair)

# Transfer 10 million copper (0.01 CVX)
convex.transfer(recipient.address, 10_000_000, account)

print(f'Transferred 0.01 CVX to account {recipient.address}')

# Check recipient balance
recipient_balance = convex.get_balance(recipient)
print(f'Recipient balance: {recipient_balance / 1_000_000_000} CVX')
```

## Complete Example

Here's the complete quickstart script:

```python
from convex_api import Convex, KeyPair

def main():
    # Connect to network
    convex = Convex('https://peer.convex.live')
    print('Connected to Convex')

    # Create account
    key_pair = KeyPair()
    account = convex.create_account(key_pair)
    print(f'Created account: #{account.address}')

    # Save keys
    key_pair.export_to_file('my_account.pem', 'secret_password')
    print('Keys saved to my_account.pem')

    # Request funds
    convex.request_funds(100_000_000, account)
    print('Received test funds')

    # Check balance
    balance = convex.get_balance(account)
    print(f'Balance: {balance / 1_000_000_000} CVX')

    # Execute transaction
    result = convex.transact('(+ 1 2 3)', account)
    print(f'Transaction result: {result.value}')

    # Query balance after transaction
    new_balance = convex.get_balance(account)
    juice_used = balance - new_balance
    print(f'Juice consumed: {juice_used} copper')

if __name__ == '__main__':
    main()
```

Run the script:

```bash
python hello_convex.py
```

Expected output:

```
Connected to Convex
Created account: #1234
Keys saved to my_account.pem
Received test funds
Balance: 0.1 CVX
Transaction result: 6
Juice consumed: 1480 copper
```

## Next Steps

- **[Query Guide](queries)** - Learn advanced query patterns
- **[Transaction Guide](transactions)** - Explore transaction capabilities
- **[Account Management](accounts)** - Manage keys and account names
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp)** - Learn the smart contract language

## Troubleshooting

### Import Error

If you get `ModuleNotFoundError: No module named 'convex_api'`:

```bash
# Check installation
pip show convex-api

# Reinstall if needed
pip install --upgrade convex-api
```

### Connection Error

If you cannot connect to `https://peer.convex.live`:

- Check your internet connection
- Try an alternative peer URL
- Check firewall settings

### Sequence Errors

If you get sequence errors when submitting multiple transactions:

```python
# The SDK automatically retries, but you can increase retry count
result = convex.transact(
    '(transfer #456 1000000)',
    account,
    sequence_retry_count=50  # Default is 20
)
```

### Insufficient Balance

If transactions fail with `FUNDS` error:

```python
# Check balance before transacting
balance = convex.get_balance(account)
if balance < 10_000_000:  # 0.01 CVX minimum
    convex.request_funds(100_000_000, account)
```
