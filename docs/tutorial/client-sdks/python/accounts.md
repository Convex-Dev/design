---
sidebar_position: 4
---

# Account Management

Learn how to create, manage, and secure Convex accounts using key pairs and the Convex Name Service.

## Key Concepts

### Account

An **Account** represents an identity on the Convex network with:

- **Address** - Unique numeric identifier (e.g., `#1234`)
- **Key Pair** - Ed25519 cryptographic keys for signing
- **Balance** - Convex Coins (copper) owned by the account
- **Sequence** - Transaction counter (starts at 0)
- **Environment** - Variables and functions defined by the account

### KeyPair

A **KeyPair** contains Ed25519 cryptographic keys:

- **Public Key** - Shared with the network (64 hex characters)
- **Private Key** - Secret, used for signing transactions

**⚠️ Never share your private key!** Anyone with it can control your account.

## Creating Key Pairs

### Generate New Keys

Create a new random key pair:

```python
from convex_api import KeyPair

# Generate fresh Ed25519 keys
key_pair = KeyPair()

print(f'Public key: {key_pair.public_key}')
# Example: 0x36d8c5c40dbe2d1b0131acf41c38b9d37ebe04d85...
```

### Import from File

Load keys from an encrypted PEM file:

```python
# Import keys (requires password)
key_pair = KeyPair.import_from_file('my_keys.pem', 'secret_password')

print(f'Imported public key: {key_pair.public_key}')
```

### Import from Mnemonic

Restore keys from a BIP39 mnemonic phrase:

```python
# Import from 24-word phrase
mnemonic = 'witch collapse practice feed shame open despair creek road again ice least'
key_pair = KeyPair.import_from_mnemonic(mnemonic)

print(f'Restored public key: {key_pair.public_key}')
```

### Import from Text

Load keys from a PEM-formatted string:

```python
pem_text = """-----BEGIN ENCRYPTED PRIVATE KEY-----
MIGbMFcGCSqGSIb3DQEFDTBKMCkGCSqGSIb3DQEFDDAcBAi3qm1zgjCO5gICCAAw
...
-----END ENCRYPTED PRIVATE KEY-----"""

key_pair = KeyPair.import_from_text(pem_text, 'secret_password')
```

## Exporting Keys

### Export to File

Save keys to an encrypted PEM file:

```python
key_pair = KeyPair()

# Encrypt with password and save
key_pair.export_to_file('backup.pem', 'strong_password_123')

print('Keys saved to backup.pem')
```

**Best Practices:**
- Use a strong, unique password
- Store file in a secure location
- Make multiple backups
- Never commit to version control

### Export to Text

Get keys as an encrypted PEM string:

```python
pem_text = key_pair.export_to_text('my_password')

print(pem_text)
# -----BEGIN ENCRYPTED PRIVATE KEY-----
# MIGbMFcGCSqGSIb3DQEFDTBKMCkGCSqGSIb3DQEFDDA...
```

### Export as Mnemonic

Get a BIP39 mnemonic phrase:

```python
# Get 24-word recovery phrase
mnemonic = key_pair.export_to_mnemonic

print(f'Recovery phrase: {mnemonic}')
# witch collapse practice feed shame open despair creek road again ice least ...
```

**⚠️ Warning**: Store mnemonic securely! Anyone with it can restore your keys.

## Creating Accounts

### Create New Account

Register a new account address on the network:

```python
from convex_api import Convex, KeyPair

convex = Convex('https://peer.convex.live')

# Generate keys and create account
key_pair = KeyPair()
account = convex.create_account(key_pair)

print(f'Account created: #{account.address}')
print(f'Public key: {account.key_pair.public_key}')
```

### Load Existing Account

Reconstruct an account from saved keys and known address:

```python
from convex_api import Account, KeyPair

# Import keys
key_pair = KeyPair.import_from_file('my_keys.pem', 'password')

# Create Account object with known address
account = Account(key_pair, address=1234)

print(f'Loaded account: #{account.address}')
```

### Setup Account with Name

Create or load an account with a registered name:

```python
# Import keys
key_pair = KeyPair.import_from_file('alice_keys.pem', 'password')

# Creates new account or loads existing if name is registered
account = convex.setup_account('alice', key_pair)

print(f'Account: {account.name} at #{account.address}')
```

This method:
1. Checks if name exists in CNS
2. If exists, loads the account
3. If not, creates new account and registers name

## Account Properties

```python
account = convex.create_account(key_pair)

# Address (int)
print(f'Address: #{account.address}')

# Public key (bytes)
print(f'Public key bytes: {account.public_key}')

# Key pair object
print(f'Key pair: {account.key_pair}')

# Name (if registered)
print(f'Name: {account.name}')  # None if not registered
```

## Account Names (CNS)

The **Convex Name Service (CNS)** allows human-readable names for accounts.

### Register Account Name

Register a name in the format `account.<name>`:

```python
# Create account
key_pair = KeyPair()
account = convex.create_account(key_pair)

# Fund it for registration
convex.request_funds(100_000_000, account)

# Register name (costs juice)
account = convex.register_account_name('alice', account)

print(f'Registered: account.alice → #{account.address}')
```

### Resolve Account Names

Convert names to addresses:

```python
# Resolve account name
address = convex.resolve_account_name('alice')
print(f'account.alice is at #{address}')

# Returns None if not found
address = convex.resolve_account_name('unknown')
print(address)  # None
```

### Load Named Account

Load an account by its registered name:

```python
key_pair = KeyPair.import_from_file('alice_keys.pem', 'password')

# Load account by name
account = convex.load_account('alice', key_pair)

if account:
    print(f'Loaded: {account.name} at #{account.address}')
else:
    print('Account name not registered')
```

## Signing Transactions

Accounts sign transactions using their private keys:

```python
# SDK handles signing automatically
result = convex.transact('(def x 42)', account)

# Internally:
# 1. SDK prepares transaction
# 2. Account signs hash with private key
# 3. SDK submits signed transaction
```

### Manual Signing

For advanced use cases, manually sign data:

```python
# Sign a hash manually
hash_hex = '7e2f1062f5fc51ed65a28b5945b49425aa42df6b7e67107efec357794096e05e'

signature = account.sign(hash_hex)
print(f'Signature: {signature}')
```

## Transferring Account Control

Change the key pair that controls an account:

```python
# Generate new keys
new_keys = KeyPair()

# Create account to transfer TO
new_account = Account(new_keys, account.address)

# Transfer control (changes on-chain key)
transferred = convex.transfer_account(new_account, account)

print(f'Account #{transferred.address} now uses new keys')
print(f'New public key: {transferred.key_pair.public_key}')
```

**⚠️ Warning**:
- Save new keys BEFORE transferring!
- Old keys will no longer work
- Losing new keys means losing account access forever

## Key Security Best Practices

### 1. Store Keys Securely

```python
# ✅ GOOD - Encrypted PEM file
key_pair.export_to_file('/secure/path/keys.pem', 'strong_password')

# ✅ GOOD - Hardware wallet (requires custom integration)
# Store keys on hardware device, never expose private key

# ❌ BAD - Plaintext file
# Don't do this!

# ❌ BAD - In code
api_key = '0x123abc...'  # Don't hardcode keys
```

### 2. Use Strong Passwords

```python
# ❌ BAD - Weak password
key_pair.export_to_file('keys.pem', 'password123')

# ✅ GOOD - Strong password
import secrets
password = secrets.token_urlsafe(32)
key_pair.export_to_file('keys.pem', password)

print(f'Save this password: {password}')
```

### 3. Make Backups

```python
key_pair = KeyPair()

# Export multiple formats
key_pair.export_to_file('primary_backup.pem', password)
key_pair.export_to_file('secondary_backup.pem', password)

mnemonic = key_pair.export_to_mnemonic
print(f'Write down recovery phrase: {mnemonic}')
```

### 4. Separate Hot and Cold Wallets

```python
# Cold wallet - offline, secure storage
cold_key_pair = KeyPair()
cold_key_pair.export_to_file('/offline/storage/cold.pem', password)

# Hot wallet - online, small balance
hot_key_pair = KeyPair()
hot_account = convex.create_account(hot_key_pair)
convex.request_funds(100_000_000, hot_account)  # Only 0.1 CVX

# Transfer bulk funds to cold storage when not needed
```

### 5. Never Share Private Keys

```python
# ✅ GOOD - Share public key
print(f'My public key: {key_pair.public_key}')

# ✅ GOOD - Share address
print(f'Send funds to: #{account.address}')

# ❌ BAD - Never do this!
# print(f'My private key: ...')  # NEVER!
```

## Account Lifecycle

```python
from convex_api import Convex, KeyPair, Account

convex = Convex('https://peer.convex.live')

# 1. Generate keys
key_pair = KeyPair()

# 2. Create account on network
account = convex.create_account(key_pair)

# 3. Fund account
convex.request_funds(100_000_000, account)

# 4. Register name (optional)
convex.register_account_name('alice', account)

# 5. Backup keys
key_pair.export_to_file('alice_backup.pem', 'password')

# 6. Use account
convex.transact('(def x 42)', account)

# 7. Later: restore from backup
restored_keys = KeyPair.import_from_file('alice_backup.pem', 'password')
restored_account = convex.load_account('alice', restored_keys)
```

## Common Patterns

### Development Account

Quick account for testing:

```python
def create_dev_account(convex):
    key_pair = KeyPair()
    account = convex.create_account(key_pair)
    convex.request_funds(1_000_000_000, account)  # 1 CVX
    return account

# Use in development
convex = Convex('https://peer.convex.live')
dev_account = create_dev_account(convex)
```

### Production Account

Secure account for production:

```python
import os
from pathlib import Path

def load_production_account(convex, name):
    # Load from secure environment
    key_file = Path(os.environ['CONVEX_KEY_PATH'])
    password = os.environ['CONVEX_KEY_PASSWORD']

    key_pair = KeyPair.import_from_file(str(key_file), password)
    account = convex.load_account(name, key_pair)

    return account

# Use in production
account = load_production_account(convex, 'prod_service')
```

### Multi-Signature Pattern

Require multiple signatures (requires custom contract):

```python
# Deploy multi-sig contract
multisig_source = """
(deploy
  (do
    (def signers #{#123 #456 #789})
    (def threshold 2)

    (defn execute [action signatures]
      (if (>= (count signatures) threshold)
        (eval action)
        :insufficient-signatures))))
"""

result = convex.transact(multisig_source, account)
multisig_address = result.value
```

## Next Steps

- **[Query Guide](queries)** - Learn how to read network state
- **[Transaction Guide](transactions)** - Execute state-changing operations
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp)** - Learn the smart contract language
- **[Recipes](/docs/tutorial/recipes)** - Common account patterns and examples
