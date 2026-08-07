---
slug: x402-preview
title: "x402: machine-payable APIs on Convex"
authors: [mikera, claude]
tags: [convex, agents, defi, networking]
---

[x402](https://www.x402.org/) revives HTTP's long-dormant `402 Payment Required` status code as an open standard for internet-native payments: a server states its price in a header, the client attaches a signed payment, and the server settles it before serving the response. No registration, no OAuth, no API keys — which is exactly the shape of commerce autonomous agents need.

Coming in the next Convex release: a complete x402 v2 implementation with **Convex as the settlement network**. The specification is already published as [CAD042](/docs/cad/x402), and the `convex-x402` module is on the develop branch now. This is a preview in the same spirit as our [Etch GC preview](/blog/etch-online-gc) — the design is settled and the code is real, and we'd rather show it before the release than after.

<!-- truncate -->

## The design in one sentence

A Convex x402 payment is a **pre-signed Convex transaction**, constructed and signed entirely by the payer, carried inside the x402 payment payload. That single decision buys most of the security properties by construction:

- **Non-custodial.** Private keys never leave the payer. Facilitators and resource servers only ever see a signed transaction they cannot alter.
- **Facilitator safety.** The facilitator never signs anything and holds no funds — it verifies against consensus state and relays the transaction unchanged.
- **Replay protection for free.** Convex transaction sequence numbers ([CAD010](/docs/cad/transactions)) guarantee a signed payment settles at most once, network-wide, with no nonce bookkeeping anywhere.
- **Any peer is a facilitator.** Verification is a read against local consensus state; settlement is an ordinary transaction submission. No third-party facilitator service, and no trust edge to one.

Payments use the x402 `exact` scheme in either the native Convex Coin (`slip44:864`, denominated in copper) or any [CAD029](/docs/cad/fungible) fungible token (`cad29:<address>`), settling with sub-second finality for fees of a few copper.

## What a peer can do with it

The peer REST API grows three facilitator endpoints — `POST /x402/verify`, `POST /x402/settle`, `GET /x402/supported` — and, more interestingly, the ability to **payment-gate any route** via configuration. A request without payment receives a `402` with the price in the `PAYMENT-REQUIRED` header; a request carrying a valid `PAYMENT-SIGNATURE` is settled against the peer's own consensus and served, with the receipt in `PAYMENT-RESPONSE`.

On the client side, `X402Client` pays demands automatically with locally-signed transactions. And services embedding the REST server can gate their own routes with custom payment policies — fixed price per call, credit accounts topped up by payment, or per-request pricing — with defined replay and retry semantics.

One more piece worth noting: a gate can offer several payment options per charge, and can accept *foreign* x402 kinds — say USDC on Base — by routing them to an external facilitator, while settling Convex kinds against itself. Convex-native and external payment rails compose in one `402` response.

## Why this fits agents

We made the case in [Agents with money](/blog/2025/11/18/agent-economics) that autonomous agents need instant, cheap, final settlement to transact at machine speed. x402 supplies the missing HTTP-level handshake: an agent hits an API, reads the price from the `402`, signs a transfer with its own key, retries the request, and has the resource plus an on-chain receipt — inside a second, for fees measured in copper. The [MCP tools](/docs/tutorial/agents/mcp) already give agents accounts and signing; x402 gives them something to spend on.

## Status, honestly

The module implements x402 version 2 end to end, but has not yet shipped in a numbered release — that lands with the next one. The normative spec in [CAD042](/docs/cad/x402) is stable, including the verification and settlement rules an independent implementation would need. Scoped CAD29 assets and an `upto`-style metered scheme are explicitly reserved for future revisions.

If you want to build against it early: the [CAD042 spec](/docs/cad/x402) plus the upstream [x402 v2 specification](https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md) are everything a client needs, and feedback on the spec is welcome on the [Convex Discord](https://discord.com/invite/xfYGq4CT7v).
