---
sidebar_position: 2
---

# Faucet

A **faucet** dispenses small amounts of Convex Coins on test networks, so you can experiment without acquiring coins. On the public testnet you rarely call it directly — the SDKs use it to fund new accounts for you (see the [Quick Start](/docs/tutorial/quickstart)). This page covers requesting funds explicitly.

## Availability

- **Public testnet** — a faucet is available. The current endpoint is `https://mikera1337-convex-testnet.hf.space`.
- **Local peer** — when you run your own peer for development, you control funding directly (see [Local Testnets](/docs/tutorial/peer-operations/local-testnets)).
- **Production (Protonet, `peer.convex.live`)** — **no faucet.** Coins must be acquired legitimately (transfer from another account, an exchange, or network rewards).

A peer may also have its faucet disabled. A faucet request to such a peer is refused with `403 Forbidden` — treat that as "no faucet on this network".

> **Security note:** any service offering free *production* coins is a scam. Faucets exist only for testing.

## Requesting funds

Amounts are always in **copper** (1 CVM = 1,000,000,000 copper). 0.1 CVM — 100,000,000 copper — is plenty for most testing.

### TypeScript

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex('https://mikera1337-convex-testnet.hf.space');

// Fund a new account on creation: pass a faucet amount to createAccount
const keyPair = KeyPair.generate();
const account = await convex.createAccount(keyPair.accountKey, 100_000_000); // 0.1 CVM

// Top up an existing account
await convex.faucet(account.address, 100_000_000);
```

### Python

```python
from convex_sdk import Convex, KeyPair

convex = Convex('https://mikera1337-convex-testnet.hf.space')

# Faucet-sponsored account creation (the peer's faucet pays the juice)
key_pair = KeyPair()
account = convex.create_account(key_pair)

# Request funds for an account
convex.request_funds(100_000_000, account)  # 0.1 CVM

# Or top up only when needed: requests funds until the balance reaches min_balance
convex.topup_account(account, min_balance=10_000_000)
```

## Account creation is faucet-sponsored

Creating an account costs juice, which must be paid by an already-funded account. On the public testnet the peer's faucet account sponsors creation, so `createAccount` / `create_account` work from a fresh key with no funds. On production there is no faucet, so a new account must be created and funded by an existing account.

## Handling an unavailable faucet

If the faucet is disabled or the peer refuses the request, the call fails (HTTP `403 Forbidden`). Handle it as "no faucet here" rather than a transient error:

```python
from convex_sdk.exceptions import ConvexAPIError

try:
    convex.request_funds(100_000_000, account)
except ConvexAPIError as e:
    print(f'Faucet unavailable: {e}')  # likely a production peer or a disabled faucet
```

## Best practices

- **Request only what you need** — 0.1 CVM covers most testing; you rarely need whole coins.
- **Reuse funded accounts** — cache a funded test account across sessions rather than re-funding each run; `topup_account` (Python) makes this easy.
- **Don't depend on faucet availability in scripts** — treat a `403` as expected on production or restricted peers.

## See Also

- [Convex Coins Overview](index.md) — Convex Coin basics
- [Quick Start](/docs/tutorial/quickstart) — the fastest path to a funded account
- [TypeScript SDK — Quickstart](/docs/tutorial/client-sdks/typescript/quickstart)
- [Python SDK — Quickstart](/docs/tutorial/client-sdks/python/quickstart)
- [Local Testnets](/docs/tutorial/peer-operations/local-testnets) — run your own peer
