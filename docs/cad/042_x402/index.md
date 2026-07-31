# CAD042: x402 Protocol

## Overview

This CAD specifies the Convex binding for the [x402 protocol](https://www.x402.org/), an open standard for internet-native payments built around the HTTP `402 Payment Required` status code.

x402 lets a client pay for a resource or API call in-band, without registration, OAuth or payment intermediaries: the server states its price, the client attaches a signed payment, and the server settles it before serving the resource. Convex is well suited as an x402 settlement network — payments are ordinary transactions with sub-second finality, fees of a few copper, and Ed25519 signatures throughout.

This CAD defines everything a conforming implementation needs:

- Convex **network identifiers** (CAIP-2) and **asset identifiers** for payments
- The Convex binding of the x402 **`exact` payment scheme**: payload format, verification rules and settlement rules
- **Facilitator** behaviour, including the HTTP endpoints Convex peers may serve

The upstream [x402 v2 specification](https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md) governs the protocol envelope (the `PaymentRequired`, `PaymentPayload`, `VerifyResponse` and `SettlementResponse` schemas, and the HTTP transport headers `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE` and `PAYMENT-RESPONSE`). This CAD does not restate that envelope; it specifies the Convex-specific content. Convex implementations MUST target x402 version 2 (`x402Version: 2`).

## Design

A Convex x402 payment is a **pre-signed Convex transaction**, constructed and signed entirely by the payer, carried inside the x402 payment payload. This gives the binding several properties by construction:

- **Non-custodial**: private keys never leave the payer. Facilitators and resource servers only ever see a signed transaction they cannot alter.
- **Facilitator safety**: the facilitator never signs anything and holds no funds; it verifies against consensus state and relays the transaction unchanged. Sponsorship abuse is impossible.
- **Replay protection for free**: transaction sequence numbers ([CAD010](../010_transactions/index.md)) guarantee a signed payment settles at most once, network-wide, with no nonce bookkeeping anywhere.
- **Peer as facilitator**: verification is a read against local consensus state and settlement is an ordinary transaction submission, so any Convex peer can act as its own facilitator. No third-party facilitator service is required, removing that trust edge entirely.

## Network Identifiers

Convex networks are identified in CAIP-2 form with the `convex` namespace:

```
convex:<reference>
```

The `reference` takes one of two forms, which implementations MUST treat as equivalent when they denote the same network:

- **Genesis hash**: the lowercase hex encoding of the network's genesis hash, truncated to 32 characters (128 bits), mirroring the Solana convention of truncating the genesis blockhash. This form works for any network — including private and local test networks — without a registry.
- **Well-known alias**: a name registered in this CAD, pinning an exact network via the registry below.

### Alias registry

| Alias | Network | Genesis hash |
|-------|---------|--------------|
| `convex:protonet` | Protonet (production) | *to be published* |
| `convex:main` | Reserved for mainnet; currently Protonet | *to be published* |
| `convex:testnet` | Public testnet; currently Protonet | *to be published* |
| `convex:local` | Local development networks | none (generic) |

:::note
Pending mainnet launch, `protonet`, `main` and `testnet` all denote the same network. The registry will diverge when mainnet launches, and the truncated genesis hash values will be published here.
:::

A facilitator MUST accept either reference form for a network it settles against, SHOULD advertise both forms in its `/supported` response where an alias exists, and MUST reject payments whose `network` matches neither form for that network (`invalid_network`).

## Asset Identifiers

The `asset` field of a payment requirement identifies what the payment is denominated in:

| Asset | `asset` value | Atomic unit |
|-------|---------------|-------------|
| Native Convex Coin | `slip44:864` | copper (10⁻⁹ Convex Gold) |
| CAD29 fungible token | `cad29:<address>` per [CAD029](../029_fungible/index.md), e.g. `cad29:789` | the token's own integer units |

`amount` MUST be a base-10 string of atomic units. Requirements MAY include `extra: {"decimals": <n>, "symbol": "<sym>"}` as a display hint (9 and `"CVM"` for the native coin; the token's `decimals` value otherwise).

Scoped CAD29 assets (`cad29:<addr>-<scope>`) are reserved for a future revision and MUST be rejected by current implementations (`invalid_payment_requirements`).

`payTo` and `payer` values are Convex account addresses in standard `#<n>` notation, e.g. `"#13"`.

## The `exact` Scheme on Convex

The x402 `exact` scheme transfers a precise, server-known amount. On Convex the scheme-specific `payload` object is:

```json
{
  "transaction": "<hex of the CAD3 multi-cell encoding of a SignedData<ATransaction>>"
}
```

Hex MUST be lowercase without a `0x` prefix, consistent with the Convex REST API's transaction encoding conventions.

### Canonical transaction forms

The signed transaction MUST take exactly one of two canonical forms, determined by the requirement's `asset`:

- **Native coin** (`slip44:864`): a `Transfer` transaction `{origin, sequence, target, amount}` where `target` equals `payTo` and `amount` equals the required amount.
- **CAD29 token** (`cad29:<addr>`): a `Call` transaction with `target` equal to the token address, `offer` = 0, function `direct-transfer`, and args `[<payTo-address> <amount> nil]` — i.e. exactly:

  ```clojure
  (call <token> (direct-transfer <payTo> <amount> nil))
  ```

  matching the `convex.fungible` library's plain transfer with no attached data.

No other transaction shape is acceptable. Verification SHOULD be implemented by reconstructing the canonical transaction from the requirements and the presented origin and sequence, then requiring cell equality — this whitelists every field at once, leaving only origin and sequence free, and means the verifier never reasons about arbitrary CVM code.

### Verification rules

A facilitator (or self-verifying resource server) MUST check, against its latest consensus state:

1. The payload decodes as a `SignedData<ATransaction>` within a strict size bound (canonical payment transactions are under 300 bytes; 4 KiB is a generous bound). Decoding MUST be bounded and storeless: payment payloads are attacker-controlled and MUST NOT touch the peer's primary store.
2. The transaction matches the canonical form above for the requirement's `asset`.
3. The destination equals `payTo` and the amount equals `amount` exactly.
4. The Ed25519 signature verifies against the origin account's **current** account key. An account with no account key (an actor) is invalid.
5. The transaction's sequence number equals the origin account's next sequence (current + 1). Lower means already spent; higher cannot be confirmed.
6. Funds suffice: for the native coin, balance ≥ amount plus a fee allowance covering juice costs; for tokens, token balance ≥ amount and coin balance covers the fee allowance. The fee allowance SHOULD be generous rather than precise — verification is advisory and settlement is the source of truth.
7. `x402Version` is 2, and the scheme and network are supported.

Verification is read-only and free.

### Settlement rules

1. Re-run verification (state may have moved since any earlier `verify`).
2. Submit the signed transaction **unchanged** via a Convex client and await the `Result`, bounded by `maxTimeoutSeconds` and a facilitator-side ceiling.
3. Settlement succeeds iff the `Result` carries no error code. The `SettlementResponse` MUST report `transaction` as `0x` followed by the hex SHA3-256 hash of the signed transaction, plus `network`, `payer` and `amount`.
4. On a sequence failure, the facilitator SHOULD check whether that exact transaction hash is already in consensus (a retried request may race its own earlier settlement) and, if so, report success idempotently. Idempotent settlement means a client retry after a network failure is served without being charged twice.

### Error reasons

Standard x402 error codes apply (`insufficient_funds`, `invalid_network`, `invalid_scheme`, `unsupported_scheme`, `invalid_x402_version`, `invalid_payload`, `invalid_payment_requirements`, `invalid_transaction_state`, `unexpected_verify_error`, `unexpected_settle_error`), plus Convex-specific reasons:

| Reason | Meaning |
|--------|---------|
| `invalid_exact_convex_payload_transaction` | Transaction does not match the canonical form for the requirements |
| `invalid_exact_convex_payload_signature` | Signature does not verify against the origin's current account key |
| `invalid_exact_convex_payload_sequence` | Sequence number is not the origin account's next sequence |

Convex error code mapping at settlement: `:FUNDS` → `insufficient_funds`, `:SEQUENCE` → `invalid_exact_convex_payload_sequence`, signature failure → `invalid_exact_convex_payload_signature`, timeout → `invalid_transaction_state`, anything else → `unexpected_settle_error`.

### Properties and deviations

- **Fees**: the payer's origin account pays juice fees in addition to the exact amount (a few copper). This is a documented deviation from the strictest "only the amount moves" reading of the exact scheme, comparable to other chains where someone must pay execution costs; on Convex it is the payer rather than the facilitator, which is the safer default.
- **No validity window**: Convex transactions carry no expiry. An unsettled signed payment remains valid until the payer's sequence advances; a payer can cancel outstanding payments by submitting any transaction. Facilitators MUST settle promptly and MUST NOT hold signed payments. `maxTimeoutSeconds` bounds only the settlement wait.
- **Client sequencing**: payments consume sequence numbers, so a client making concurrent payments MUST serialise payment construction, and SHOULD read its sequence from consensus rather than any locally cached value — a cached sequence goes stale whenever a payment settles out-of-band, and a reused sequence replays the previous payment instead of paying.
- **Settle-before-serve**: resource servers MUST settle before serving when using the `exact` scheme. A merely verified payment can still be spent elsewhere first; only settlement is proof of payment.

## Facilitator Endpoints

Convex peers MAY serve x402 facilitator endpoints through their REST API:

- **POST `/x402/verify`** — verifies a payment without settling it. Body: `{x402Version, paymentPayload, paymentRequirements}`; returns a `VerifyResponse`.
- **POST `/x402/settle`** — settles a payment by submitting its signed transaction for consensus. Same body; returns a `SettlementResponse`.
- **GET `/x402/supported`** — lists supported payment kinds: `{kinds: [{x402Version, scheme, network}...], extensions: [], signers: {}}`. The `signers` map MUST be empty: the Convex exact scheme never requires facilitator signatures.

The facilitator base URL for clients is simply `https://<peer>/x402`. These endpoints are public by default when x402 is enabled, consistent with the peer REST API's public-by-default posture: verification is free and read-only, and settlement only relays payer-signed transactions.

Resource servers on Convex peers MAY payment-gate arbitrary routes: a request without a valid `PAYMENT-SIGNATURE` receives a `402` response with the `PAYMENT-REQUIRED` header (implementations SHOULD mirror the JSON in the response body for debuggability); a request with a valid payment is settled and then served, with the receipt in the `PAYMENT-RESPONSE` header.

## Security Considerations

- Payment headers and bodies are attacker-controlled. Implementations MUST bound base64 and JSON parsing, cap transaction size, decode storelessly, and structurally whitelist transaction shapes.
- Verification performs signature checks and state reads; public endpoints SHOULD run it under admission control and concurrency limits.
- Two payments with the same sequence can both pass verification; consensus serialises settlement and exactly one succeeds. Settle-before-serve makes this safe for the server.
- The submitting peer sees payments before consensus. For a transfer to the operator's own account there is nothing to front-run; the general mitigation is the standard one — use trusted, well-staked peers.
- A resource server using a remote facilitator trusts it to report settlement honestly (standard x402 posture). Running the facilitator in-process on the operator's own peer removes that trust edge.

## Implementation

The reference implementation lives in the [Convex repository](https://github.com/Convex-Dev/convex):

- `convex-x402` — protocol model, exact scheme verification, facilitator core and a paying HTTP client
- `convex-restapi` — the facilitator endpoints and the payment gate, configured via the `rest.x402` section

See `docs/proposals/X402.md` in that repository for implementation notes, configuration and usage.

## Future Work

- **MCP transport**: x402 v2 defines an MCP binding (`_meta["x402/payment"]`), a natural fit for paid tools on the Convex MCP server ([CAD041](../041_mcp/index.md)).
- **Metered payments**: an `upto`-style scheme for pay-per-use, for which the Convex UCAN delegation machinery is well shaped (a payer-signed authorisation to spend up to a cap, settled in aggregate).
- **Scoped CAD29 assets** in the exact scheme.
- **Standardisation**: contributing `scheme_exact_convex.md` to the upstream x402 specification repository, and registering the `convex` CAIP-2 namespace.

## References

- [x402 protocol](https://www.x402.org/) and the [x402 v2 specification](https://github.com/coinbase/x402/blob/main/specs/x402-specification-v2.md), including the [HTTP transport](https://github.com/coinbase/x402/blob/main/specs/transports-v2/http.md) and the [`exact` scheme](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact.md)
- [CAIP-2](https://chainagnostic.org/CAIPs/caip-2) chain identifiers and [CAIP-19](https://chainagnostic.org/CAIPs/caip-19) asset identifiers
- [CAD010](../010_transactions/index.md) transactions, [CAD019](../019_assets/index.md) assets, [CAD029](../029_fungible/index.md) fungible tokens, [CAD041](../041_mcp/index.md) MCP
