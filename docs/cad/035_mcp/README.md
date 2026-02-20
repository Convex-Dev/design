# CAD035: Model Context Protocol (MCP)

## Overview

This CAD describes the Convex implementation of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), a standardised protocol that enables AI agents to discover, understand, and invoke tools — including executing economically significant operations — through a structured interface.

MCP provides a universal language for AI agents to interact with Convex, allowing them to query data, execute transactions, manage digital assets, and receive real-time state change notifications without requiring custom integrations.

## `/mcp` Endpoint

Convex peers MAY implement MCP endpoint support through a dedicated `/mcp` endpoint that exposes Convex network capabilities to AI agents and other MCP-compatible clients.

The endpoint supports three HTTP methods:

- **POST `/mcp`** — JSON-RPC requests (tools, prompts, queries, transactions). Supports both standard JSON responses and Server-Sent Events (SSE) streaming when the client sends `Accept: text/event-stream`.
- **GET `/mcp`** — Opens an SSE stream for receiving asynchronous notifications (state change events, keep-alive pings). Requires a valid `Mcp-Session-Id` header.
- **DELETE `/mcp`** — Terminates a session and cleans up associated resources (watches, connections).

A discovery document is published at `/.well-known/mcp` for auto-detection by MCP clients.

## Protocol Version

The Convex MCP server implements MCP specification version **2025-06-18** with the Streamable HTTP transport.

## Sessions

Stateful sessions are created on `initialize` and identified by the `Mcp-Session-Id` response header. Sessions track:

- SSE connections for notification delivery
- State watches registered via `watchState`
- Session-scoped resources

Sessions are terminated explicitly via `DELETE /mcp` or cleaned up on connection timeout.

## Tools

The MCP server exposes tools organised into categories. Clients discover available tools via `tools/list`. The full set depends on whether the peer's signing service is configured.

### Core tools (always available)

22 tools covering queries, transactions, cryptography, encoding, and state watching:

- **Queries and state** — `query` (execute Convex Lisp), `queryState` (navigate the global state tree), `describeAccount`, `getBalance`, `lookup`, `resolveCNS`, `peerStatus`, `getTransaction`
- **Transactions** — `transact` (direct execution with seed), `prepare` / `submit` (two-step with external signing), `signAndSubmit`, `transfer` (convenience for coin/token transfers)
- **Accounts** — `createAccount` (with optional faucet funding)
- **Cryptography** — `keyGen`, `sign`, `validate`, `hash` (Ed25519 and SHA-256/SHA3)
- **Encoding** — `encode` / `decode` (CVM literals ↔ CAD3 binary)
- **State watching** — `watchState` / `unwatchState` (register watches on state paths; changes delivered as SSE notifications)

### Signing service tools (conditional)

When a peer is configured with a signing service, 12 additional tools are registered for server-side key management. Private keys are stored encrypted and never leave the server.

- **Key management** — `signingCreateKey`, `signingListKeys`, `signingSign`, `signingGetJWT`
- **Convenience** — `signingTransact` (execute using a stored key), `signingCreateAccount`, `signingListAccounts`
- **Elevated** — `signingImportKey`, `signingExportKey`, `signingDeleteKey`, `signingChangePassphrase` — these require a two-step browser confirmation flow to prevent programmatic abuse
- **Discovery** — `signingServiceInfo` (check availability, no authentication required)

## Prompts

The MCP server exposes guided workflow prompts via `prompts/list` and `prompts/get`. Prompts are user-controlled templates (triggered by slash commands or explicit selection) that guide LLMs through multi-step tasks using available tools.

Each prompt follows a three-message pattern: a **persona** message that teaches the LLM relevant Convex domain knowledge, a **request** message with `${argName}` placeholders substituted from user-supplied arguments, and an **assistant prefill** that anchors the response direction.

Some prompts are always available (e.g. account exploration, network status, Convex Lisp guidance); others are registered only when the signing service is configured (e.g. account creation, contract deployment, fund transfers).

## Server-Sent Events (SSE)

The MCP server supports real-time notifications via SSE for state watching. When a client registers a watch with `watchState`, the server monitors the specified path in the global CVM state and sends `notifications/stateChanged` events over the SSE stream whenever the value changes.

SSE is also used for streaming responses on POST when the client includes `Accept: text/event-stream`.

## Security Considerations

- **Seed-based tools** (`transact`, `signAndSubmit`, `transfer`) transmit the Ed25519 seed over the network — peers MUST use HTTPS
- **Signing service tools** keep private keys server-side, encrypted at rest with a user-chosen passphrase
- **Elevated operations** (import, export, delete) require interactive browser confirmation to prevent programmatic abuse
- **Queries** are read-only and require no authentication
- **Sessions** are server-side and scoped to a single client connection

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [MCP Streamable HTTP Transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [CAD004: Accounts](/docs/cad/accounts)
- [CAD026: Convex Lisp](/docs/cad/lisp)
- [CAD019: Asset Model](/docs/cad/assets)
- [Convex MCP Product Page](/docs/products/convex-mcp)

