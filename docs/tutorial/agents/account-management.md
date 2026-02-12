---
title: Account Management
sidebar_position: 2
---

AI agents interact with Convex through regular accounts — the same kind of account that humans use. There are no special "agent accounts". An agent needs an address, and optionally a key pair, to participate in the network.

This guide covers how to create, fund, and secure accounts for agent use.

## Creating an agent account

### Via MCP

Use the `createAccount` tool to create an account with an optional faucet payout (available on testnets):

```json
{
  "name": "createAccount",
  "arguments": {
    "faucet": 100000000
  }
}
```

The response includes the new account address and a generated key pair. On testnets the faucet provides initial funds; on the protonet you would fund the account separately.

To create an account with a specific public key (e.g. one you generated elsewhere):

```json
{
  "name": "createAccount",
  "arguments": {
    "accountKey": "89b5142678bfef7a2245af5ae5b9ab1e10c282b375fa297c5aaeccc48ac97cac"
  }
}
```

### Via the TypeScript SDK

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');
const kp = KeyPair.generate();
const info = await convex.createAccount(kp, 100_000_000);
convex.setAccount(info.address, kp);
```

### Via Convex Lisp

If you already have an account, you can create new accounts on-chain:

```clojure
;; Create account with a public key
(create-account 0x89b5142678bfef7a2245af5ae5b9ab1e10c282b375fa297c5aaeccc48ac97cac)
```

## Key management approaches

The most important security decision for an agent deployment is how the agent accesses its signing key. There are two primary approaches.

### Option 1: Agent holds the private key

The agent has the Ed25519 seed (private key) in its environment or configuration. It can sign transactions directly using the `transact` or `signAndSubmit` MCP tools.

```json
{
  "name": "transact",
  "arguments": {
    "source": "(transfer #99 1000000)",
    "address": "42",
    "seed": "a1b2c3d4e5f6..."
  }
}
```

**Advantages:**
- Simple setup — no external signing infrastructure
- Fully autonomous — agent can transact at any time without external approval

**Risks:**
- A compromised agent has full access to the key
- The seed is visible to the MCP transport layer
- No spending limits or policy enforcement

This approach is suitable for development, testnets, and controlled environments where the agent runs in trusted infrastructure.

### Option 2: MCP signing tool (recommended)

The agent prepares transactions but a separate signing service handles the actual signing. The agent uses the `prepare` and `submit` tools, while a dedicated signing tool or service holds the key.

```
Agent                     Signing Service              Peer
  │                             │                        │
  │── prepare(source, addr) ───────────────────────────►│
  │◄─────────────────────────── hash ───────────────────│
  │                             │                        │
  │── "please sign this hash" ─►│                        │
  │◄── signature ──────────────│                        │
  │                             │                        │
  │── submit(hash, sig, key) ──────────────────────────►│
  │◄─────────────────────────── result ─────────────────│
```

The signing service can be:
- Another MCP tool that the agent calls (e.g. a `convex-signer` tool)
- A hardware security module (HSM) or secure enclave
- A human approval workflow for high-value transactions
- A policy engine that enforces spending limits, allow-listed addresses, and rate limits

**Advantages:**
- Agent never sees the private key
- Signing service can enforce arbitrary policies
- Defence in depth — compromised agent cannot steal funds
- Supports human-in-the-loop review

**Risks:**
- More complex setup
- Signing service becomes a dependency (agent cannot transact if it's unavailable)

:::tip Best practice
For production deployments, use the signing tool approach. Even a simple signing service that checks a spending limit per transaction provides significant protection against agent misbehaviour or compromise.
:::

## Account controllers

Convex accounts can have a **controller** — another account that can execute arbitrary code in the controlled account's context using `eval-as`. This is a powerful mechanism for agent governance.

### Setting a controller

When creating an agent account, set a controller so that a human or governance system can intervene if needed:

```clojure
;; As the agent account (using key authority)
(set-controller #100)

;; Or as an existing controller
(eval-as #42 '(set-controller #100))
```

### What a controller can do

A controller can execute any code in the agent's account:

```clojure
;; Reset the agent's key (e.g. after key rotation)
(eval-as #42 '(set-key 0xNEW_PUBLIC_KEY))

;; Recover funds from a misbehaving agent
(eval-as #42 '(transfer #100 *balance*))

;; Upgrade agent logic stored in the account
(eval-as #42 '(defn ^:callable strategy [] (new-implementation)))
```

:::warning
Only set a controller you trust completely — a controller has full authority over the account. For agents, the controller is typically the deployer's own account or a governance actor.
:::

See the [Account Control recipe](/docs/tutorial/recipes/account-control) for more detail on working with controllers.

## Funding agent accounts

Agents need a Convex Coin balance to pay for transaction execution (juice costs).

### On testnets

Use the faucet when creating the account:

```json
{
  "name": "createAccount",
  "arguments": {
    "faucet": 100000000
  }
}
```

Or fund an existing account:

```clojure
;; From another account with funds
(transfer #42 100000000)
```

### On the protonet

Transfer funds from a treasury or operational account. There is no faucet on the production network. Plan your agent's operational budget based on expected transaction volume and juice costs.

### Monitoring balance

Agents should monitor their own balance to avoid running out of funds:

```json
{
  "name": "query",
  "arguments": {
    "source": "*balance*",
    "address": "42"
  }
}
```

## Managing multiple agents

Each agent should have its own account. This provides:
- **Isolation** — one agent's transactions don't affect another's sequence numbers
- **Auditability** — on-chain history is per-account
- **Independent key management** — each agent can have its own security model

### Deterministic key derivation

Use the `keyGen` MCP tool with a master seed and agent-specific derivation:

```json
{
  "name": "keyGen",
  "arguments": {
    "seed": "master-seed-hex"
  }
}
```

Or derive keys programmatically using the TypeScript SDK:

```typescript
import { KeyPair } from '@convex-world/convex-ts';

// Deterministic: same seed always produces same key pair
const agentKey = KeyPair.fromSeed(agentSeedHex);
```

This allows you to recreate agent keys from a master secret without storing individual seeds.

## Next steps

- [Agentic Economics](./agentic-economics) — design economic interactions between your agents
- [MCP Integration](./mcp) — connect agents to the network
- [Actor Development](/docs/tutorial/actors) — build on-chain actors that agents can interact with
