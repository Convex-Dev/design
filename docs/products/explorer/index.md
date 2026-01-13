# Convex Explorer

The Convex Explorer is a peer-hosted interface for viewing live data from the Convex network. Instead of relying on a single central service, every Convex peer can serve the explorer, giving the community a resilient way to inspect network activity and smart-contract state.

## Quick Access

- Primary community instance: [https://peer.convex.live](https://peer.convex.live/explorer)
- Any Convex peer with the explorer module enabled can be accessed at `https://<peer-hostname>/explorer`

## Key Capabilities

- Real-time account balances, transaction history, and on-chain state
- Built-in support for inspecting Convex Lisp contracts and evaluating forms
- Node health dashboards, including peer status, stake, and consensus metrics
- Lightweight HTTP interface designed to run directly from a peer without extra infrastructure

## How to Use It

1. Open the explorer endpoint for the peer you want to inspect (for example, `https://peer.convex.live`).
2. Browse accounts, transactions, or smart contracts using the sidebar navigation.
3. Use the interactive Convex Lisp console to evaluate queries directly against the peer.

> Tip: Because each explorer instance is peer-backed, the data reflects exactly what that peer sees on the network. If you need to confirm consensus, compare results across multiple peers.

## Running Your Own Explorer

If you operate a Convex peer, the explorer will run by default on port 8080. The explorer will be available at the `/explorer` path for that peer.

We recommend securing your explorer endpoint with HTTPS and a reverse proxy (for example, [Caddy](https://caddyserver.com/)) to provide TLS termination and optionally restrict access.

## Troubleshooting

- **Explorer not loading**: Confirm that the peer is reachable and the explorer service is enabled.
- **Stale data**: Refresh the page or check another peer to rule out local network partitioning.
- **Permission issues**: Some peer operators may restrict the explorer to trusted networks; contact the operator if access is denied.
