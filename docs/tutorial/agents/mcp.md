---
title: MCP Integration
sidebar_position: 1
---

The **Model Context Protocol (MCP)** is a standardised interface that allows AI agents to discover and invoke tools across different systems. Convex peers ship with a built-in MCP server, turning any peer into a gateway for agents to query state, execute transactions, and manage assets on the Convex network.

## Connecting to a Convex peer

Every Convex peer with MCP enabled exposes an endpoint at:

```
https://<peer-hostname>/mcp
```

For a local peer this is typically `http://localhost:8080/mcp`. The peer also publishes a discovery document at `/.well-known/mcp` so that MCP clients can auto-detect the server.

### MCP client configuration

Most MCP-compatible tools (Claude Desktop, Cursor, Windsurf, etc.) accept a JSON configuration. To connect to a Convex peer:

```json
{
  "mcpServers": {
    "convex": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

For a public peer:

```json
{
  "mcpServers": {
    "convex": {
      "url": "https://peer.convex.live/mcp"
    }
  }
}
```

Once connected, the agent can discover all available tools through MCP's standard `tools/list` method.

## Available tools

Convex peers expose 16 built-in tools via MCP:

### Queries and state inspection

| Tool | Description |
|------|-------------|
| `query` | Execute a read-only Convex Lisp query (free, no signing required) |
| `lookup` | Find a symbol in an account's environment with metadata |
| `describeAccount` | Get account status: balance, sequence, key, controller, environment |
| `resolveCNS` | Resolve a Convex Name System (CNS) name to an address |
| `peerStatus` | Get peer status and network information |

### Transactions

| Tool | Description |
|------|-------------|
| `transact` | Execute a transaction directly (requires seed for signing) |
| `signAndSubmit` | Prepare, sign, and submit in one call (requires seed) |
| `prepare` | Prepare a transaction and return a hash for external signing |
| `submit` | Submit a pre-signed transaction to the network |

### Signing and cryptography

| Tool | Description |
|------|-------------|
| `sign` | Sign raw hex data with an Ed25519 seed |
| `validate` | Verify an Ed25519 signature |
| `keyGen` | Generate or derive a key pair from a seed |
| `hash` | Compute SHA-256 or SHA3 hash |

### Account management

| Tool | Description |
|------|-------------|
| `createAccount` | Create a new account with optional faucet payout |
| `getTransaction` | Retrieve a transaction by hash with its result |

### Encoding

| Tool | Description |
|------|-------------|
| `encode` | Encode Convex Lisp to CAD3 binary format |
| `decode` | Decode CAD3 binary to Convex Lisp |

## Querying state

The `query` tool is the starting point for most agent interactions. Queries are free (no transaction fees) and require no signing.

**Check an account balance:**

```json
{
  "name": "query",
  "arguments": {
    "source": "(balance #42)"
  }
}
```

**Read account details:**

```json
{
  "name": "query",
  "arguments": {
    "source": "(account #42)"
  }
}
```

**Resolve a CNS name:**

```json
{
  "name": "query",
  "arguments": {
    "source": "@convex.fungible"
  }
}
```

**Query a fungible token balance:**

```json
{
  "name": "query",
  "arguments": {
    "source": "(@convex.fungible/balance #128 #42)",
    "address": "42"
  }
}
```

Queries can execute arbitrary Convex Lisp, so agents can inspect any on-chain state — contract environments, asset holdings, governance parameters, etc.

## Executing transactions

Transactions modify on-chain state and require cryptographic signing. The MCP server supports three approaches, each with different security trade-offs.

### Approach 1: Direct transaction (agent holds seed)

The simplest approach. The agent provides its Ed25519 seed directly and the peer handles signing:

```json
{
  "name": "transact",
  "arguments": {
    "source": "(transfer #99 1000000)",
    "address": "42",
    "seed": "a1b2c3d4..."
  }
}
```

This is straightforward but means the agent (and the MCP connection) has access to the private key. Suitable for controlled environments where the agent is trusted.

### Approach 2: Prepare + external sign + submit (recommended)

A more secure pattern where the agent never touches the private key directly. Instead:

1. **Prepare** — the agent asks the peer to prepare the transaction and return a hash:

```json
{
  "name": "prepare",
  "arguments": {
    "source": "(transfer #99 1000000)",
    "address": "42"
  }
}
```

Response includes a `hash` field.

2. **Sign externally** — the hash is signed by a separate signing tool, hardware wallet, or human-in-the-loop approval process. This could be another MCP tool, a secure enclave, or a manual review step.

3. **Submit** — the agent submits the signed transaction:

```json
{
  "name": "submit",
  "arguments": {
    "hash": "0xabc123...",
    "sig": "0xdef456...",
    "accountKey": "0x789..."
  }
}
```

This pattern keeps the private key outside the agent's environment. The signing service can enforce policies (spending limits, allow-listed destinations, rate limits) before approving.

:::tip Recommended for production
The prepare/sign/submit flow is the recommended approach for production agent deployments. It provides defence in depth: even if the agent is compromised, it cannot sign transactions without approval from the signing service.
:::

### Approach 3: Combined sign and submit

A convenience method that combines preparation, signing, and submission:

```json
{
  "name": "signAndSubmit",
  "arguments": {
    "source": "(transfer #99 1000000)",
    "address": "42",
    "seed": "a1b2c3d4..."
  }
}
```

Like approach 1, the agent needs the seed. This is useful for fully autonomous agents in trusted environments.

## Running your own peer

For production agent deployments, running your own Convex peer is strongly recommended:

- **Performance** — direct local access eliminates network round-trips to public peers
- **Security** — your MCP endpoint isn't exposed to the public internet
- **Privacy** — query patterns and transaction data stay within your infrastructure
- **Reliability** — no dependency on third-party peer availability

See the [Peer Operations](/docs/tutorial/peer-operations) guide for setup instructions. MCP support is enabled by default — no additional configuration is needed.

:::warning
Public peers are suitable for experimentation and development, but production agent systems should use a dedicated peer. This ensures that your agent's private keys and transaction patterns are not exposed to shared infrastructure.
:::

## Example: agent workflow

A typical agent interaction with Convex via MCP follows this pattern:

1. **Query** — read current state (balances, prices, contract state)
2. **Decide** — the agent's model determines the next action
3. **Prepare** — create a transaction for the chosen action
4. **Sign** — approve and sign (directly or via signing tool)
5. **Submit** — execute the signed transaction
6. **Verify** — query the updated state to confirm the result

This loop runs continuously for autonomous agents, or on-demand for agents responding to user requests.

## Next steps

- [Account Management](./account-management) — set up accounts, keys, and security for your agents
- [Agentic Economics](./agentic-economics) — design economic interactions between agents
- [Convex MCP Reference](/docs/products/convex-mcp) — full product documentation
- [CAD035: MCP Specification](/docs/cad/mcp) — technical specification
