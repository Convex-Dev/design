---
sidebar_position: 5
---

# Assets

Convex has no special "token" primitive — fungible tokens and named assets are ordinary [actors](/docs/cad/fungible) you deploy and call. This guide issues and moves a fungible token, and registers names with the Convex Name System (CNS), from Python.

## Fungible tokens

Fungible tokens follow the [CAD029](/docs/cad/fungible) standard and are created with the built-in `convex.fungible` library.

### Deploy a token

```python
from convex_sdk import Convex, KeyPair

convex = Convex('https://mikera1337-convex-testnet.hf.space')
account = convex.create_account(KeyPair())
convex.request_funds(100_000_000, account)  # 0.1 CVM for juice

# Deploy a token with an initial supply of 1,000,000 units, held by the deployer
result = convex.transact('(deploy [(@convex.fungible/build-token {:supply 1000000})])', account)
token = result['value']   # the token's actor address (an integer)
print(f'Deployed token at #{token}')
```

### Check a balance

Pass the querying account as the second argument to `query`:

```python
balance = convex.query(f'(@convex.fungible/balance #{token} #{account.address})', account)['value']
print(f'Balance: {balance}')  # 1000000
```

### Transfer tokens

The generic `convex.asset` library moves any asset. The amount is paired with the token as `[token amount]`:

```python
recipient = convex.create_account(KeyPair())
convex.transact(f'(@convex.asset/transfer #{recipient.address} [#{token} 1000])', account)
```

### Total supply

```python
supply = convex.query(f'(@convex.fungible/total-supply #{token})', account)['value']
```

## CNS names

The Convex Name System maps human-readable names to addresses. Account names are registered under the `account.` namespace.

```python
# Register account.my-service -> your account address
convex.register_account_name('my-service', account.address, account)

# Resolve a name back to an address (returns an int, or None if unregistered)
address = convex.resolve_account_name('my-service')
```

`resolve_account_name(name)` resolves the `account.<name>` shorthand; `resolve_name(name)` resolves a full CNS path.

## See Also

- [CAD029: Fungible Token Standard](/docs/cad/fungible)
- [CAD014: Convex Name System](/docs/cad/cns)
- [Transactions](transactions.md) — submitting and confirming transactions
- [Managing Coins recipe](../../recipes/managing-coins/index.md)
