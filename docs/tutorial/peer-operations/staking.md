---
sidebar_position: 2
---

# Peer Staking and Registration

How to stake Convex Coins and register your peer on the network.

## Overview

To participate in Convex consensus as a peer, you must:

1. **Stake Convex Coins** — lock coins as collateral with `create-peer`
2. **Register peer data** — publish your peer's connection URL with `set-peer-data`
3. **Maintain stake** — keep sufficient stake to remain an active part of consensus

Staking uses a small set of CVM functions: `create-peer`, `set-peer-stake`, `set-stake`, `set-peer-data`, `get-peer-stake` and `evict-peer`. This guide shows each one. The economic model (rewards, slashing, delegated stake) is specified in [CAD016: Peer Staking](/docs/cad/peerstake).

## Prerequisites

- ✅ Funded Convex account with sufficient CVM balance (stake + juice)
- ✅ Ed25519 key pair for the peer identity (the *peer key*)
- ✅ Peer infrastructure ready ([deployment guides](manual-deployment))
- ✅ Network connectivity configured

## Staking Requirements

### Minimum Stake

Running a peer on Protonet requires a minimum stake of **1000 CVM**. A higher stake gives your peer proportionally greater weight in consensus. On testnets you can practise with smaller amounts.

### Stake Economics

**Benefits**

- Participate in Convex Convergent Proof of Stake (CPoS) consensus
- Earn rewards proportional to stake (rewards accrue to the peer's stake automatically — there is no separate claim step; see [CAD016](/docs/cad/peerstake) and [CAD020: Tokenomics](/docs/cad/tokenomics))

**Risks**

- Stake is locked while the peer participates
- Provable misbehaviour may lead to **slashing** (loss of stake)

## Generating Peer Keys

Each peer needs a unique Ed25519 key pair for its identity.

### Using the CLI

Keys are generated into your configured keystore (a PKCS#12 file), not a loose seed file:

```bash
# Generate a new random key pair in the keystore
convex key generate --type random

# List the public keys in your keystore
convex key list
```

### Using Java

```java
import convex.core.crypto.AKeyPair;

// Generate a peer key pair
AKeyPair peerKeys = AKeyPair.generate();
System.out.println("Peer Public Key: " + peerKeys.getAccountKey());
```

**⚠️ Security:** store peer keys securely. Loss of the peer key means loss of the peer identity.

## Staking Process

### Step 1: Prepare the Controlling Account

The account that submits `create-peer` controls the peer's stake. Ensure it has enough funds for the stake plus juice:

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

// Connect to your target network (Protonet shown; use the public testnet to practise)
Convex convex = Convex.connect("https://peer.convex.live");

AKeyPair controllerKeys = AKeyPair.create(controllerKeySeed);
convex.setKeyPair(controllerKeys);
convex.setAddress(controllerAddress);

Result balance = convex.query(Reader.read("(balance " + controllerAddress + ")")).get();
long balanceCopper = ((Number) balance.getValue()).longValue();
System.out.println("Balance: " + (balanceCopper / 1_000_000_000.0) + " CVM");
```

### Step 2: Create the Peer

`create-peer` registers the peer key and places its initial stake (in copper):

```java
import convex.core.data.AccountKey;

AccountKey peerKey = peerKeys.getAccountKey();
long stakeAmount = 1_000L * 1_000_000_000L; // 1000 CVM in copper

String stakeCommand = String.format("(create-peer %s %d)", peerKey, stakeAmount);
Result result = convex.transact(Reader.read(stakeCommand)).get();

if (!result.isError()) {
    System.out.println("✓ Peer created with stake");
} else {
    System.err.println("✗ create-peer failed: " + result.getErrorCode());
}
```

### Step 3: Register Peer Data

Publish the peer's connection URL so others can reach it. The metadata map uses a single `:url` of the form `"host:port"`:

```java
String registerCommand = String.format(
    "(set-peer-data %s {:url \"peer.example.com:18888\"})",
    peerKey);

Result result = convex.transact(Reader.read(registerCommand)).get();
System.out.println(result.isError() ? "✗ " + result.getErrorCode() : "✓ Peer data registered");
```

## Managing Stake

### Checking Stake

`get-peer-stake` reads a peer's current stake:

```java
String stakeQuery = String.format("(get-peer-stake %s)", peerKey);
Result result = convex.query(Reader.read(stakeQuery)).get();

if (!result.isError()) {
    long stake = ((Number) result.getValue()).longValue();
    System.out.println("Current Stake: " + (stake / 1_000_000_000.0) + " CVM");
}
```

### Changing Your Peer's Stake

`set-peer-stake` sets the peer's stake to an **absolute** value — there is no separate add/withdraw. To add stake, set a higher total; to reduce it, set a lower total; to fully unstake, set it to `0`:

```java
// Increase total stake to 2000 CVM
long newStake = 2_000L * 1_000_000_000L;
convex.transact(Reader.read(String.format("(set-peer-stake %s %d)", peerKey, newStake))).get();

// Fully unstake (stop participating in consensus)
convex.transact(Reader.read(String.format("(set-peer-stake %s 0)", peerKey))).get();
```

**⚠️ Warning:** setting stake to `0` removes the peer from consensus. Shut the peer down cleanly first.

### Delegated Stake

Any coin holder can back a peer they trust with *delegated* stake using `set-stake` (also an absolute set). This adds to the peer's consensus weight and lets the delegator share in rewards, without running a peer:

```java
// Delegate 500 CVM of stake to a trusted peer
long delegated = 500L * 1_000_000_000L;
convex.transact(Reader.read(String.format("(set-stake %s %d)", trustedPeerKey, delegated))).get();
```

### Evicting a Peer

`evict-peer` removes an inactive or misbehaving peer from the peer set (subject to network rules):

```java
convex.transact(Reader.read(String.format("(evict-peer %s)", peerKey))).get();
```

## Stake Security

✅ **Key management**

- Keep the peer key and the controlling account key separate
- Use hardware security modules (HSM) for high-value stakes
- Maintain secure offline backups

✅ **Stake protection**

- Monitor peer performance to avoid slashing
- Keep infrastructure maintained and reachable at the registered URL
- Set up alerting for stake changes

### Recovery Scenarios

**Lost peer key** — the peer cannot sign consensus messages; the controlling account can still adjust or remove the stake with `set-peer-stake`. Generate a new peer key and re-run `create-peer`.

**Lost controlling account key** — you cannot modify the stake. Protect this key accordingly.

## Monitoring Stake

```java
public class StakeMonitor {
    private final Convex convex;
    private final AccountKey peerKey;

    public StakeMonitor(Convex convex, AccountKey peerKey) {
        this.convex = convex;
        this.peerKey = peerKey;
    }

    public void checkStake() throws Exception {
        String query = String.format("(get-peer-stake %s)", peerKey);
        Result result = convex.query(Reader.read(query)).get();
        if (result.isError()) {
            System.err.println("⚠ Cannot query stake");
            return;
        }
        long stake = ((Number) result.getValue()).longValue();
        double stakeCoins = stake / 1_000_000_000.0;

        long minStake = 1_000L; // 1000 CVM Protonet minimum
        if (stakeCoins < minStake) {
            System.err.println("⚠ Stake below minimum: " + stakeCoins + " CVM");
        } else {
            System.out.println("✓ Stake adequate: " + stakeCoins + " CVM");
        }
    }
}
```

Set up alerting on: stake below the minimum threshold, unexpected stake changes, and loss of consensus participation.

## Troubleshooting

### `create-peer` / `set-peer-stake` failed

- **`:FUNDS`** — the controlling account lacks the balance for the stake plus juice. Check `(balance ...)`.
- **`:STATE`** — the peer already exists, or the stake is below the network minimum.
- **`:TRUST`** — the submitting account is not authorised to control this peer.

### Peer not appearing in consensus

- Stake below the minimum, or set to `0`
- Peer not reachable at its registered `:url`
- Registration metadata incorrect — re-check `set-peer-data`

## Next Steps

1. **[Choose a deployment method](manual-deployment)** — install your peer
2. **[Select hosting](hosting)** — infrastructure requirements
3. **[Security guide](security)** — secure your peer
4. **[Troubleshooting](troubleshooting)** — common issues

## Resources

- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** — `#peer-operations` channel
- **[CAD016: Peer Staking](/docs/cad/peerstake)** — the staking and rewards model
- **[CAD017: Peer Operations](/docs/cad/peerops)** — running a peer
- **[CAD020: Tokenomics](/docs/cad/tokenomics)** — network economics
