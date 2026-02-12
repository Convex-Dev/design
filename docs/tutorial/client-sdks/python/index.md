---
sidebar_position: 3
---

# Python SDK

The official Python client library for interacting with the Convex decentralised lattice network.

## Overview

The `convex-api` package provides a Pythonic interface to the Convex network, enabling you to:

- **Execute Queries** - Read network state without fees
- **Submit Transactions** - Execute atomic state transitions with cryptographic signatures
- **Manage Accounts** - Create and manage self-sovereign accounts with Ed25519 keys
- **Transfer Funds** - Send Convex Coins between accounts
- **Deploy Contracts** - Deploy and interact with smart contracts written in Convex Lisp

## Installation

Install via pip:

```bash
pip install convex-api
```

Or with Poetry:

```bash
poetry add convex-api
```

## Quick Example

```python
from convex_api import Convex, KeyPair

# Connect to the network
convex = Convex('https://peer.convex.live')

# Create a new account
key_pair = KeyPair()
account = convex.create_account(key_pair)

# Request test funds
convex.request_funds(100_000_000, account)

# Query your balance
balance = convex.get_balance(account)
print(f'Balance: {balance / 1_000_000_000} Convex Coins')

# Transfer funds
convex.transfer('#456', 50_000_000, account)
```

## Key Features

### 🐍 Pythonic API

Idiomatic Python with `snake_case` naming, exceptions for errors, and synchronous I/O patterns.

```python
# Pythonic method names
balance = convex.get_balance(account)
info = convex.get_account_info(account)
result = convex.transact('(map inc [1 2 3 4])', account)
```

### 📦 Account Objects

Encapsulate address, key pair, and optional name in a convenient `Account` object:

```python
from convex_api import Account, KeyPair

key_pair = KeyPair()
account = Account(key_pair, address=1234, name='my_account')

print(f'Address: {account.address}')
print(f'Public Key: {account.public_key}')
```

### 🔐 Flexible Key Management

Multiple ways to create and import key pairs:

```python
# Generate new keys
key_pair = KeyPair()

# Import from encrypted file
key_pair = KeyPair.import_from_file('my_keys.pem', 'secret_password')

# Import from mnemonic phrase
key_pair = KeyPair.import_from_mnemonic('word1 word2 word3 ...')

# Export for later use
key_pair.export_to_file('backup.pem', 'secret_password')
```

### 🔄 Automatic Sequence Retry

The SDK automatically retries transactions with sequence errors, handling concurrency gracefully:

```python
# Automatically retries up to 20 times on sequence conflicts
result = convex.transact('(transfer #789 1000000)', account)
```

### 🌐 CNS Integration

Built-in support for Convex Name Service (CNS):

```python
# Register an account name
convex.register_account_name('alice', account)

# Resolve names to addresses
address = convex.resolve_account_name('alice')

# Resolve any CNS name
address = convex.resolve_name('convex.trust')
```

## Copper and Convex Coins

The Convex network uses **copper** as the smallest unit of currency. Like Bitcoin's satoshis or Ethereum's wei, copper allows for precise fractional amounts:

**1 Convex Coin = 1,000,000,000 copper**

All balance and transfer amounts in the API are in **copper**:

```python
# Request 0.1 Convex Coins (100 million copper)
convex.request_funds(100_000_000, account)

# Transfer 0.05 Convex Coins (50 million copper)
convex.transfer('#456', 50_000_000, account)

# Display balance in Convex Coins
balance_copper = convex.get_balance(account)
balance_coins = balance_copper / 1_000_000_000
print(f'Balance: {balance_coins} CVX')
```

## Python Version Support

- **Python 3.8+** required
- **Python 3.10+** recommended for full type hint support

## Dependencies

- `requests` - HTTP client for REST API
- `cryptography` - Ed25519 signatures and key management
- `mnemonic` - BIP39 mnemonic phrase support
- `pydantic` - Data validation and serialisation

## Resources

- **[GitHub Repository](https://github.com/Convex-Dev/convex-api-py)** - Source code and examples
- **[PyPI Package](https://pypi.org/project/convex-api/)** - Install from Python Package Index
- **[Convex Documentation](https://docs.convex.world)** - Network and platform docs
- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** - Get help and share ideas

## Next Steps

- **[Quickstart Guide](python/quickstart)** - Build your first Python app on Convex
- **[Query Guide](python/queries)** - Learn how to read network state
- **[Transaction Guide](python/transactions)** - Submit state-changing operations
- **[Account Management](python/accounts)** - Manage keys and accounts
