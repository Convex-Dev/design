# Convex MCP

Convex peers ship with built-in **Model Context Protocol (MCP)** servers, enabling AI agents and MCP-compatible tools to interact directly with the Convex network. Any peer with MCP enabled becomes a gateway for querying state, executing transactions, and managing digital assets — no custom integrations or centralised intermediaries required.

## Quick start

Connect any MCP client to a Convex peer:

```
https://peer.convex.live/mcp
```

That's it. The peer exposes 16 built-in tools for querying, transacting, signing, and encoding. Your AI agent or development tool can discover them automatically through MCP's standard `tools/list` method.

## Key capabilities

- **Direct network access** — sub-millisecond state queries, native Convex Lisp execution, no indexers or RPC layers
- **Flexible transaction signing** — direct signing, prepare/sign/submit with external approval, or combined sign-and-submit
- **Universal asset model** — fungible tokens, NFTs, and arbitrary digital assets through a unified [CAD019](/docs/cad/assets) interface
- **Built-in cryptography** — Ed25519 key generation, signing, verification, and hashing
- **Zero configuration** — MCP support is enabled by default on every Convex peer

## Running your own peer

For production use, run your own Convex peer for better performance, security, and privacy. MCP is enabled by default — the endpoint is available at `/mcp` with no additional configuration.

See the [Peer Operations guide](/docs/tutorial/peer-operations) for setup instructions.

## Learn more

- **[AI Agents User Guide](/docs/tutorial/agents)** — step-by-step guides for MCP integration, agent account management, and agentic economics
- **[CAD035: MCP Specification](/docs/cad/mcp)** — technical specification for the Convex MCP endpoint
- **[Model Context Protocol](https://modelcontextprotocol.io/)** — the MCP standard
