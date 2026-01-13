# Convex MCP

Convex peers can act as **Model Context Protocol (MCP) servers**, enabling AI agents and other MCP-compatible clients to interact directly with the Convex network. This transforms any Convex peer into a standardized gateway for autonomous agents to query data, execute transactions, and manage digital assets on the Convex lattice.

## Overview

The Model Context Protocol provides a universal language for AI agents to discover, understand, and invoke tools across different systems. When a Convex peer exposes an MCP endpoint, it becomes a powerful bridge between AI agents and the Convex network, allowing autonomous systems to participate directly in the Convex economy.

Convex peers ship with full MCP support built-in and enabled by default, making it easy to deploy MCP servers that provide direct, authenticated access to the Convex network without requiring custom integrations or centralised intermediaries.

## Key Capabilities

### Direct Network Access

- **Real-time, authenticated streams**: AI agents get direct access to peer state without indexers or centralised RPCs
- **Sub-millisecond state access**: Query the entire global Convex state at massive scale with minimal latency
- **Native Convex Lisp support**: Execute sophisticated queries and transactions using the full CVM (Convex Virtual Machine) environment

### Transaction Management

- **Prepare/submit phases**: Simulate transactions before committing, with zero cost and zero front-running risk
- **Pluggable signing**: Support for multi-agent review chains, hardware wallets, air-gapped human-in-the-loop, or fully autonomous Ed25519 signing
- **Economic operations**: Execute transactions that transfer value, manage assets, and interact with smart contracts

### Asset Management

- **Universal asset model**: Interact with fungible tokens (CAD29), NFTs, and other digital assets through a unified interface
- **CAD019 compliance**: All asset operations follow the mathematically rigorous asset model standard
- **Composable operations**: Code written for one asset type works with any asset type

## How to Use It

### Accessing an MCP Server

Convex peers with MCP enabled expose the MCP endpoint at:

```
https://<peer-hostname>/mcp
```

For example, if you're running a peer locally:
```
http://localhost:8080/mcp
```

### Connecting from an MCP Client

MCP clients (including AI agents, development tools, and automation systems) can connect to a Convex peer's MCP endpoint using standard MCP transport protocols. The peer will expose tools for:

- **Querying accounts**: Get balances, transaction history, and account state
- **Executing transactions**: Prepare and submit Convex Lisp transactions
- **Asset operations**: Transfer fungible tokens, manage NFTs, and interact with smart contracts
- **State inspection**: Query on-chain data, contract state, and network metrics

### Example: AI Agent Integration

An AI agent configured to use a Convex peer as an MCP server can:

1. Discover available tools through MCP's standard discovery mechanism
2. Query account balances and state using `convexQuery` tools
3. Prepare transactions using Convex Lisp code
4. Submit transactions with appropriate authentication
5. Monitor transaction results and state changes in real-time

## Running Your Own MCP Server

If you operate a Convex peer, MCP support is enabled by default. The MCP endpoint will be available at the `/mcp` path for that peer.

### Configuration

MCP support is built into Convex peers and requires no additional configuration. However, peer operators may want to:

- **Secure the endpoint**: Use HTTPS and a reverse proxy (e.g., [Caddy](https://caddyserver.com/)) for TLS termination
- **Control access**: Restrict MCP access to trusted networks or implement authentication if needed
- **Monitor usage**: Track MCP requests and transactions for operational visibility

### Network Considerations

Since MCP servers run directly on peers, they provide:

- **No single point of failure**: Each peer can serve as an independent MCP server
- **Direct network access**: No intermediaries between the MCP client and the Convex network
- **Resilient infrastructure**: If one peer is unavailable, clients can connect to other peers

## Use Cases

### Autonomous Economic Agents

AI agents can operate as first-class economic citizens on Convex, owning assets, executing trades, and participating in smart contracts autonomously. The MCP interface enables agents to:

- Own and manage digital assets
- Execute complex economic strategies
- Coordinate with other agents through on-chain contracts
- Operate 24/7 without human intervention

### Development and Automation

Developers can use MCP-compatible tools to:

- Automate testing and deployment workflows
- Build monitoring and alerting systems
- Create integration layers between Convex and other systems
- Develop tooling that works with any MCP-compatible client

### Multi-Agent Systems

MCP enables sophisticated multi-agent architectures where:

- Agents can discover and invoke tools dynamically
- Different agents can use different peers for redundancy
- Agent coordination happens both on-chain (via Convex contracts) and off-chain (via MCP tool discovery)

## Technical Foundation

The Convex MCP implementation is built on:

- **Model Context Protocol**: Standardized protocol for tool discovery and invocation
- **Convex Network**: Lattice-based decentralized execution environment
- **Convex Lisp (CVM)**: Full programming language for on-chain logic
- **CAD019 Asset Model**: Universal standard for digital asset behavior
- **CAD035**: Convex's specification for MCP endpoint support

## References

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Transport Documentation](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [CAD035: Model Context Protocol (MCP)](/docs/cad/mcp)
- [CAD019: Asset Model](/docs/cad/assets)

## Troubleshooting

- **MCP endpoint not accessible**: Confirm that the peer is running and the MCP service is enabled (enabled by default)
- **Connection refused**: Check that the peer is reachable and the correct port is configured
- **Authentication errors**: Verify that the MCP client is using appropriate credentials if authentication is required
- **Transaction failures**: Review transaction preparation and ensure sufficient account balance for fees
