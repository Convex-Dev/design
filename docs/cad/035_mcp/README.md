# CAD035: Model Context Protocol (MCP)

## Overview

This CAD describes the Convex implementation of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), a standardized protocol that enables AI agents to discover, understand, and invoke tools – including executing economically significant operations – through a structured interface.

MCP provides a universal language for AI agents to interact with Convex, allowing them to query data, execute transactions, and interact with smart contracts without requiring custom integrations.

## `/mcp` Endpoint Support

Convex peers MAY implements MCP endpoint support through a dedicated `/mcp` endpoint that exposes Convex network capabilities to AI agents and other MCP-compatible clients.

:::note
This CAD is currently under development. We are implementing the `/mcp` endpoint for Convex peers, which will enable AI agents to interact with the Convex network through standard MCP protocol, including support for querying accounts, executing transactions, and managing digital assets using CVM and CAD29 fungible tokens.
:::

## References

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Transport Documentation](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)

