---
sidebar_position: 2
---

# Peer Staking and Registration

How to stake Convex Coins and register your peer on the network.

## Overview

To participate in Convex consensus as a peer, you must:
1. **Stake Convex Coins** - Lock coins as collateral
2. **Register Your Peer** - Submit peer information to the network
3. **Maintain Stake** - Keep sufficient stake to remain active

## Prerequisites

Before staking and registration:

- ✅ Funded Convex account with sufficient CVX balance
- ✅ Ed25519 key pair for peer identity
- ✅ Ed25519 key pair for stake controller
- ✅ Peer infrastructure ready ([deployment guides](manual-deployment))
- ✅ Network connectivity configured

## Staking Requirements

### Minimum Stake

**Production (Protonet)**:
- Minimum: To be determined by network governance
- Recommended: Higher stake = higher consensus weight

**Testnets**:
- Typically lower requirements for testing
- Check specific testnet documentation

### Stake Economics

**Stake Benefits**:
- Participate in consensus
- Earn transaction fees (juice)
- Receive staking rewards
- Voting rights in governance

**Stake Risks**:
- Stake locked during participation
- Potential slashing for misbehavior
- Network risk exposure

## Generating Peer Keys

Each peer needs a unique Ed25519 key pair for identity.

### Using Java

```java
import convex.core.crypto.AKeyPair;
import java.nio.file.Files;
import java.nio.file.Path;

// Generate peer key pair
AKeyPair peerKeys = AKeyPair.generate();

System.out.println("Peer Public Key: " + peerKeys.getAccountKey());

// Save seed securely
byte[] seed = peerKeys.getSeed();
Files.write(Path.of("peer-keypair.dat"), seed);
```

### Using CLI

```bash
# Generate peer keys using Convex CLI
convex key generate --output peer-keys.dat

# View public key
convex key show peer-keys.dat
```

**⚠️ Security**: Store peer key seeds securely. Loss of peer keys means loss of peer identity and stake access.

## Staking Process

### Step 1: Prepare Stake Account

Ensure your stake controller account has sufficient funds:

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

// Connect to network
Convex convex = Convex.connect("https://peer.convex.live");

// Load your stake controller key pair
AKeyPair stakeKeys = AKeyPair.create(stakeKeySeed);
convex.setKeyPair(stakeKeys);
convex.setAddress(stakeAddress);

// Check balance
Result balance = convex.query(
    Reader.read("(balance " + stakeAddress + ")")
).get();

long balanceCopper = ((Number) balance.getValue()).longValue();
System.out.println("Balance: " + (balanceCopper / 1_000_000_000.0) + " CVX");
```

### Step 2: Create Peer Stake

Submit a stake transaction for your peer:

```java
import convex.core.data.AccountKey;

// Your peer's public key
AccountKey peerKey = peerKeys.getAccountKey();

// Stake amount in copper (e.g., 100,000 CVX)
long stakeAmount = 100_000L * 1_000_000_000L;

// Create peer stake
String stakeCommand = String.format(
    "(create-peer %s %d)",
    peerKey,
    stakeAmount
);

Result result = convex.transact(Reader.read(stakeCommand)).get();

if (!result.isError()) {
    System.out.println("✓ Peer stake created");
    System.out.println("Result: " + result.getValue());
} else {
    System.err.println("✗ Stake failed: " + result.getErrorCode());
}
```

### Step 3: Register Peer Metadata

Register your peer's network information:

```java
// Peer metadata
String peerHost = "peer.example.com";
int peerPort = 18888;

String registerCommand = String.format(
    "(set-peer-data %s {:host \"%s\" :port %d})",
    peerKey,
    peerHost,
    peerPort
);

Result result = convex.transact(Reader.read(registerCommand)).get();

if (!result.isError()) {
    System.out.println("✓ Peer registered");
} else {
    System.err.println("✗ Registration failed: " + result.getErrorCode());
}
```

## Verifying Registration

Check your peer's registration status:

```java
// Query peer information
String queryCommand = String.format("(get-peer %s)", peerKey);
Result result = convex.query(Reader.read(queryCommand)).get();

if (!result.isError()) {
    System.out.println("Peer Info: " + result.getValue());
} else {
    System.err.println("Peer not found");
}
```

## Managing Stake

### Checking Stake Status

```java
// Query your peer's stake
String stakeQuery = String.format("(peer-stake %s)", peerKey);
Result result = convex.query(Reader.read(stakeQuery)).get();

if (!result.isError()) {
    long stake = ((Number) result.getValue()).longValue();
    System.out.println("Current Stake: " + (stake / 1_000_000_000.0) + " CVX");
}
```

### Adding More Stake

```java
// Add additional stake
long additionalStake = 10_000L * 1_000_000_000L;

String addStakeCommand = String.format(
    "(add-peer-stake %s %d)",
    peerKey,
    additionalStake
);

Result result = convex.transact(Reader.read(addStakeCommand)).get();
```

### Withdrawing Stake

To withdraw stake, you must first stop participating in consensus:

```java
// Step 1: Set peer as inactive
String deactivateCommand = String.format("(set-peer-stake %s 0)", peerKey);
Result result = convex.transact(Reader.read(deactivateCommand)).get();

// Step 2: Wait for unstaking period (if applicable)
// Network may have cooldown period before stake withdrawal

// Step 3: Withdraw stake
String withdrawCommand = String.format("(withdraw-stake %s)", peerKey);
result = convex.transact(Reader.read(withdrawCommand)).get();
```

**⚠️ Warning**: Withdrawing stake stops consensus participation. Ensure peer is properly shut down first.

## Stake Controller Management

The stake controller is the account that controls your peer's stake.

### Changing Stake Controller

```java
// Transfer stake control to new address
Address newController = Address.create(5678);

String transferCommand = String.format(
    "(set-peer-controller %s %s)",
    peerKey,
    newController
);

Result result = convex.transact(Reader.read(transferCommand)).get();
```

**⚠️ Important**: Losing access to the stake controller means losing control of your peer's stake.

## Stake Security

### Best Practices

✅ **Key Management**:
- Store peer keys separately from stake controller keys
- Use hardware security modules (HSM) for high-value stakes
- Implement key rotation procedures
- Maintain secure offline backups

✅ **Stake Protection**:
- Monitor peer performance to avoid slashing
- Keep peer infrastructure maintained
- Maintain adequate stake for consensus weight
- Set up alerting for stake changes

✅ **Operational Security**:
- Use separate accounts for stake controller and peer operations
- Implement multi-signature for high-value stakes
- Regular security audits
- Document recovery procedures

### Recovery Scenarios

**Lost Peer Keys**:
- Peer cannot sign consensus messages
- Stake controller can still withdraw stake
- Generate new peer keys and re-register

**Lost Stake Controller Keys**:
- Cannot modify or withdraw stake
- Peer can continue operating
- Stake permanently locked (unless recovery mechanism exists)

**Compromised Peer Keys**:
- Immediately stop peer
- Use stake controller to withdraw stake
- Investigate compromise
- Generate new peer keys

## Monitoring Stake

### Stake Health Checks

```java
public class StakeMonitor {
    private final Convex convex;
    private final AccountKey peerKey;

    public StakeMonitor(Convex convex, AccountKey peerKey) {
        this.convex = convex;
        this.peerKey = peerKey;
    }

    public void checkStake() throws Exception {
        // Query current stake
        String query = String.format("(peer-stake %s)", peerKey);
        Result result = convex.query(Reader.read(query)).get();

        if (result.isError()) {
            System.err.println("⚠ Cannot query stake");
            return;
        }

        long stake = ((Number) result.getValue()).longValue();
        double stakeCoins = stake / 1_000_000_000.0;

        // Check if stake is adequate
        long minStake = 50_000L * 1_000_000_000L; // Example: 50,000 CVX
        if (stake < minStake) {
            System.err.println("⚠ Stake below minimum: " + stakeCoins + " CVX");
        } else {
            System.out.println("✓ Stake adequate: " + stakeCoins + " CVX");
        }
    }
}
```

### Automated Alerts

Set up monitoring to alert on:
- Stake below minimum threshold
- Unexpected stake changes
- Peer registration changes
- Consensus participation status

## Governance Participation

Staked peers can participate in network governance:

### Voting on Proposals

```java
// Vote on governance proposal
long proposalId = 123;
boolean voteYes = true;

String voteCommand = String.format(
    "(vote-proposal %d %b)",
    proposalId,
    voteYes
);

Result result = convex.transact(Reader.read(voteCommand)).get();
```

### Submitting Proposals

```java
// Submit governance proposal
String proposal = "(update-network-parameter :min-stake 100000)";

String submitCommand = String.format(
    "(submit-proposal '%s)",
    proposal
);

Result result = convex.transact(Reader.read(submitCommand)).get();
```

## Economics and Rewards

### Earning Rewards

Peers earn rewards from:
- **Transaction Fees** - Share of juice paid by transactions
- **Staking Rewards** - Proportional to stake weight
- **Governance Participation** - Incentives for active governance

### Reward Claims

```java
// Claim accumulated rewards
String claimCommand = String.format("(claim-peer-rewards %s)", peerKey);
Result result = convex.transact(Reader.read(claimCommand)).get();

if (!result.isError()) {
    long rewards = ((Number) result.getValue()).longValue();
    System.out.println("Claimed: " + (rewards / 1_000_000_000.0) + " CVX");
}
```

## Troubleshooting

### Stake Transaction Failed

**FUNDS Error**:
- Insufficient balance for stake amount
- Check account balance
- Account for transaction juice costs

**TRUST Error**:
- Incorrect stake controller permissions
- Verify controller account controls peer
- Check key pair matches controller

### Peer Not Appearing in Consensus

**Common Causes**:
- Insufficient stake
- Peer not properly configured
- Network connectivity issues
- Registration metadata incorrect

**Solutions**:
1. Verify stake amount meets minimum
2. Check peer network configuration
3. Verify registration metadata
4. Review [deployment guides](manual-deployment)

### Unable to Withdraw Stake

**Locked Stake**:
- Stake may have lock period
- Check network unstaking rules
- Wait for cooldown period

**Active Peer**:
- Peer still participating in consensus
- Shut down peer first
- Set stake to zero before withdrawal

## Next Steps

1. **[Choose Deployment Method](manual-deployment)** - Install your peer
2. **[Select Hosting](hosting)** - Infrastructure requirements
3. **[Security Guide](security)** - Secure your peer
4. **[Troubleshooting](troubleshooting)** - Common issues

## Resources

- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** - `#peer-operations` channel
- **[Convex Economics](/)** - Token economics and rewards
- **[Governance](/)**  - Participation in network governance
