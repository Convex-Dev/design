# Convex MCP

Convex peers ship with built-in **Model Context Protocol (MCP)** servers, enabling AI agents and MCP-compatible tools to interact directly with the Convex network. Any peer with MCP enabled becomes a gateway for querying state, executing transactions, managing digital assets, and receiving real-time state change notifications — no custom integrations or centralised intermediaries required.

## Quick start

Connect any MCP client to a Convex peer:

```
https://peer.convex.live/mcp
```

That's it. The peer exposes over 30 built-in tools and guided prompts that your AI agent or development tool can discover automatically through MCP's standard `tools/list` and `prompts/list` methods.

## Key capabilities

- **Direct network access** — sub-millisecond state queries, native Convex Lisp execution, no indexers or RPC layers
- **Flexible transaction signing** — direct signing, prepare/sign/submit with external approval, or server-side signing via the built-in signing service
- **Real-time state watching** — register watches on any path in the global state tree and receive SSE notifications when values change
- **Universal asset model** — fungible tokens, NFTs, and arbitrary digital assets through a unified [CAD019](/docs/cad/assets) interface
- **Built-in cryptography** — Ed25519 key generation, signing, verification, and hashing
- **Guided prompts** — workflow prompts that teach LLMs Convex domain knowledge and guide them through common tasks like account exploration, contract deployment, and fund transfers
- **Signing service** — optional server-side key management where private keys are stored encrypted and never leave the server, with elevated operations requiring browser confirmation
- **Zero configuration** — MCP support is enabled by default on every Convex peer

## Running your own peer

For production use, run your own Convex peer for better performance, security, and privacy. MCP is enabled by default — the endpoint is available at `/mcp` with no additional configuration.

See the [Peer Operations guide](/docs/tutorial/peer-operations) for setup instructions.

## Learn more

- **[AI Agents User Guide](/docs/tutorial/agents)** — step-by-step guides for MCP integration, agent account management, and agentic economics
- **[CAD041: MCP Specification](/docs/cad/mcp)** — technical specification for the Convex MCP endpoint
- **[Model Context Protocol](https://modelcontextprotocol.io/)** — the MCP standard
