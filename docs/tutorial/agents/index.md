---
title: AI Agents
sidebar_position: 4
---

AI agents are first-class participants in the Convex economy. They can own accounts, hold assets, execute transactions, and contract with humans and other agents — all under the same rules, the same costs, and the same finality.

Convex doesn't distinguish between human users and autonomous agents. Every account on the network follows the same physics: deterministic execution, atomic transactions, and cryptographic authentication. This makes Convex a natural substrate for agentic systems where AI models need to interact with real economic state.

## Why Convex for AI agents?

- **Native MCP support** — Convex peers ship with built-in [Model Context Protocol](/docs/products/convex-mcp) servers, so any MCP-compatible AI agent can interact with the network out of the box
- **Deterministic execution** — the CVM guarantees identical results for identical inputs, eliminating a whole class of agent coordination bugs
- **Sub-second finality** — transactions settle in under a second, fast enough for real-time agent decision loops
- **Global state** — agents can read the entire network state (balances, contracts, assets) with a single query, no indexers required
- **Universal asset model** — one interface for fungible tokens, NFTs, and arbitrary digital assets ([CAD019](/docs/cad/assets))
- **Economic constraints** — juice pricing and memory accounting prevent runaway agents from spamming the network

## Guides

Each guide builds on the previous one, but you can jump directly to what you need:

- [MCP Integration](agents/mcp) — connect AI agents to Convex via the Model Context Protocol. Covers available tools, querying state, executing transactions, and signing approaches.
- [Account Management](agents/account-management) — create, fund, and secure agent accounts. Covers key management, controllers, and the trade-offs between full autonomy and delegated signing.
- [Agentic Economics](agents/agentic-economics) — design economic interactions between agents. Covers direct transactions, smart contract coordination, autonomous strategies, and multi-agent architectures.

## Further reading

- [Convex MCP Product Overview](/docs/products/convex-mcp) — full reference for the MCP server capabilities
- [CAD041: Model Context Protocol](/docs/cad/041_mcp) — technical specification
- [Actor Development](/docs/tutorial/actors) — build on-chain actors that agents can interact with
- [Account Control](/docs/tutorial/recipes/account-control) — recipe for managing accounts via controllers
