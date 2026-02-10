---
sidebar_position: 2
---

# Faucet

The **Convex Faucet** is a service that provides free test funds on test networks, enabling developers to experiment without purchasing Convex Coins.

## What is a Faucet?

A faucet is an automated service that dispenses small amounts of cryptocurrency for testing purposes. On Convex test networks, the faucet provides:

- **Free Convex Coins** - Small amounts sufficient for testing (typically 0.01 - 0.1 CVX)
- **No Authentication** - Anyone can request funds by providing an account address
- **Rate Limiting** - Prevents abuse by limiting requests per account/IP

## Availability

### Test Networks

✅ **Faucets are available on test networks:**

**Public Testnets** - For testing without local setup:
- `https://mikera1337-convex-testnet.hf.space` - Public testnet with faucet
- Check [Discord community](https://discord.com/invite/xfYGq4CT7v) for additional testnets

**Local Development Peers** - Best for development:
- Run your own peer locally for fastest performance
- Built-in account creation and funding
- See [Client Types Guide](/docs/tutorial/client-sdks/java/clients#local-peer-client) for setup

On test networks, you can freely request funds for development and testing.

### Production Networks

❌ **Faucets are NOT available on production networks:**

- `https://mikera1337-convex-testnet.hf.space` - Production peer (no faucet)
- Production Convex mainnet does not have public faucets
- You must acquire Convex Coins through legitimate means:
  - Purchase from exchanges
  - Receive transfers from other accounts
  - Earn through network participation

**Security Note**: Any "faucet" claiming to provide free production coins is likely a scam.

## Using the Faucet

### TypeScript

```typescript
import { Convex } from '@convex-world/convex-ts';

const convex = new Convex('https://mikera1337-convex-testnet.hf.space');

// Create account
const keyPair = KeyPair.generate();
convex.setAccount('#1234', keyPair);

// Request test funds (test networks only)
// Note: This will fail on production networks
await convex.requestFunds(100_000_000); // 0.1 CVX
```

### Python

```python
from convex_api import Convex, KeyPair

convex = Convex('https://mikera1337-convex-testnet.hf.space')

# Create account
key_pair = KeyPair()
account = convex.create_account(key_pair)

# Request test funds (test networks only)
# Note: This will fail on production networks
convex.request_funds(100_000_000, account)  # 0.1 CVX
```

## Faucet Limits

Test network faucets typically impose limits to prevent abuse:

### Amount Limits

- **Minimum Request**: 1,000 copper (0.000001 CVX)
- **Maximum Request**: 1,000,000,000 copper (1 CVX)
- **Default Amount**: 100,000,000 copper (0.1 CVX)

### Rate Limits

- **Per Account**: Limited requests per account per time period
- **Per IP Address**: Limited requests per IP address per time period
- **Cooldown Period**: Typically 1-24 hours between requests

## Account Creation and Faucets

### On Test Networks

Creating an account requires an existing funded account to pay the juice cost. On test networks, you have two options:

#### Option 1: Use Peer's Faucet Account

Most test peers provide a faucet account that sponsors new account creation:

```python
# Python
account = convex.create_account(key_pair)
# Faucet account pays for creation automatically
```

```typescript
// TypeScript
const keyPair = KeyPair.generate();
convex.setAccount(address, keyPair);
// Faucet sponsors creation if supported
```

#### Option 2: Fund First, Then Create

Some configurations require manual funding before creating accounts. If account creation fails:

1. Get funds from faucet to genesis account
2. Use funded account to create new accounts

### On Production Networks

**You cannot create accounts without existing funds on production networks.**

Options for production:

1. **Have someone create an account for you** - An existing funded account creates your account and transfers initial funds
2. **Purchase an existing account** - Acquire keys for an account that already has funds
3. **Receive a transfer first** - Someone transfers coins to your address before you activate it

## Faucet Best Practices

### For Developers

#### Check Network Type

Verify you're on a test network before requesting faucet funds:

```python
# Query network status to verify test network
result = convex.query('*state*', 1)
# Examine result to determine network type
```

#### Handle Faucet Failures

```python
from convex_api.exceptions import ConvexAPIError

try:
    convex.request_funds(100_000_000, account)
except ConvexAPIError as e:
    if e.code == 'FAUCET_DISABLED':
        print('Faucet not available - likely production network')
    elif e.code == 'RATE_LIMIT':
        print('Faucet rate limit exceeded - try again later')
    else:
        print(f'Faucet error: {e.code} - {e.message}')
```

```typescript
try {
  await convex.requestFunds(100_000_000);
} catch (error) {
  if (error.code === 'FAUCET_DISABLED') {
    console.log('Faucet not available - likely production network');
  } else if (error.code === 'RATE_LIMIT') {
    console.log('Faucet rate limit exceeded - try again later');
  } else {
    console.log('Faucet error:', error.message);
  }
}
```

#### Request Appropriate Amounts

```python
# ❌ DON'T - Request more than needed
convex.request_funds(1_000_000_000, account)  # 1 CVX excessive for testing

# ✅ DO - Request only what you need
convex.request_funds(100_000_000, account)  # 0.1 CVX sufficient for most tests
```

#### Use Top-Up Helper

The Python SDK provides a `topup_account()` helper that only requests funds when needed:

```python
# Only requests funds if balance < 10M copper
convex.topup_account(account, min_balance=10_000_000)

# Custom minimum balance
convex.topup_account(account, min_balance=50_000_000)
```

### For Network Operators

If you're running a test peer, configure the faucet:

```bash
# Enable faucet for test networks
convex.peer faucet --enable \
  --amount 100000000 \
  --cooldown 3600 \
  --max-per-ip 10
```

**Never enable faucets on production networks!**

## Common Faucet Errors

### FAUCET_DISABLED

```
Error: FAUCET_DISABLED - Faucet is not available on this network
```

**Cause**: You're trying to use the faucet on a production network or a peer with the faucet disabled.

**Solution**:
- Verify you're connected to a test network
- For production, acquire funds through legitimate means
- For test networks, check peer configuration

### RATE_LIMIT

```
Error: RATE_LIMIT - Faucet rate limit exceeded
```

**Cause**: Too many recent faucet requests from your account or IP address.

**Solution**:
- Wait for the cooldown period (typically 1-24 hours)
- Use a different account if testing multiple scenarios
- For development, save and reuse accounts with funds

### INSUFFICIENT_FUNDS

```
Error: INSUFFICIENT_FUNDS - Faucet account has insufficient funds
```

**Cause**: The faucet's own account has run out of funds (rare on public test networks).

**Solution**:
- Report to network operator
- Try again later after refill
- Use a different test peer

### AMOUNT_TOO_LARGE

```
Error: AMOUNT_TOO_LARGE - Requested amount exceeds faucet limit
```

**Cause**: Requested amount exceeds the faucet's maximum dispensation.

**Solution**:
- Request smaller amount (typically max 1 CVX)
- Make multiple requests with cooldown between

## Faucet Alternatives

### For Testing

If the faucet is unavailable or rate-limited:

1. **Reuse Test Accounts** - Save and reuse funded accounts across test sessions
2. **Fund One Account Well** - Request maximum from faucet once, then use that account to fund others
3. **Local Test Peer** - Run your own peer with unlimited faucet access

### For Production

Acquire Convex Coins through:

1. **Exchanges** - Purchase from cryptocurrency exchanges
2. **Peer-to-Peer** - Receive transfers from other users
3. **Network Rewards** - Earn through peer operation or staking
4. **Development Grants** - Apply for foundation grants for qualified projects

## Security Considerations

### Faucet Abuse Prevention

Test network operators implement protections:

- **Rate Limiting** - Prevents spam and DoS attacks
- **IP Tracking** - Identifies and blocks abusive IPs
- **Account Limits** - Caps total funds per account
- **CAPTCHA** - Some faucets use CAPTCHA for web interfaces

### Test Fund Management

Best practices for developers:

1. **Don't Rely on Faucet Availability** - Cache funded test accounts
2. **Request Conservatively** - Only request what you need
3. **Clean Up Test Accounts** - Return funds when done (optional, good citizenship)

## Faucet Architecture

For those interested in how faucets work:

1. **Faucet Account** - Peer maintains a funded account as the faucet
2. **API Endpoint** - `/api/v1/faucet` endpoint accepts requests
3. **Validation** - Checks rate limits, amount, and account validity
4. **Transaction** - Submits `(transfer #recipient amount)` transaction
5. **Response** - Returns amount transferred or error

## See Also

- [Convex Coins Overview](index.md) - Learn about Convex Coin basics
- [TypeScript SDK - Quickstart](/docs/tutorial/client-sdks/typescript/quickstart) - Using faucet in TypeScript
- [Python SDK - Quickstart](/docs/tutorial/client-sdks/python/quickstart) - Using faucet in Python
- [Running a Peer](/docs/products/convex-peer) - Configure faucet on your own peer
