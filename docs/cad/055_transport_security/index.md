# CAD055: Transport Security

## Overview

A Convex operator runs several kinds of server: peers speaking the peer protocol ([CAD015](../015_peercomms/index.md)), lattice nodes replicating with each other ([CAD036](../036_lattice_node/index.md)), HTTP APIs such as REST and MCP ([CAD041](../041_mcp/index.md)), DLFS over WebDAV ([CAD028](../028_dlfs/index.md)), and Convex SQL over the PostgreSQL wire protocol ([CAD039](../039_convex_sql/index.md)). Their clients range from other Convex nodes to standard tools that know nothing of Convex.

This CAD specifies how these servers offer TLS: which identity a server presents, how each protocol negotiates TLS, what each kind of client can verify, and what an operator can rely on. It protects data in transit between a client and the endpoint that terminates TLS. It does not change authorisation, which remains with each protocol, and it does not cover data-level encryption, which is [CAD052](../052_encryption/index.md).

## Design objectives

### Standard TLS for standard clients

Each protocol uses TLS the way its existing clients already expect: HTTPS for HTTP clients, PostgreSQL's own negotiation for PostgreSQL clients. A browser, `psql`, a JDBC driver, a WebDAV client or an MCP client connects securely with its ordinary settings and no Convex-specific support.

### An identity the client can check

Clients verify a server in one of two ways. A Convex node usually knows the key of the node it is dialling, from configuration or trusted discovery, and can check that key directly. Every other client knows only a hostname and checks a certificate against the authorities it trusts. A server therefore presents whichever identity its clients can verify, and this CAD defines both.

### Operator's choice

TLS can be provided by the server itself, by a TLS-terminating proxy in front of it, or both, and an operator may run a server with no TLS at all, for example on a private network. Each server is configured independently.

### No silent downgrade

An operator who configures TLS, and a client that asks for it, can rely on getting it. Neither side falls back to plaintext without being told to.

## Specification

### TLS versions

Servers and clients MUST use TLS 1.3 ([RFC 8446](https://www.rfc-editor.org/rfc/rfc8446)) or TLS 1.2 ([RFC 5246](https://www.rfc-editor.org/rfc/rfc5246)), and MUST NOT negotiate an earlier version. A server MUST close a connection whose handshake does not complete within a bounded time.

### Identities

A TLS endpoint presents one of two identities.

#### Node identity

A **node identity** is a certificate signed directly by the node's Ed25519 key ([CAD004](../004_accounts/index.md)). The certificate authorises a TLS key pair, which MAY differ from the node key, so the node key need not be held by the TLS stack.

A client that expects a particular node key MUST accept the server only if:

- the leaf certificate is signed by the expected key, as a one-certificate path anchored at that key;
- the certificate is within its validity period;
- the certificate's key usage, if present, permits digital signatures, and its extended key usage, if present, includes server authentication;
- the handshake proves possession of the certificate's private key.

The hostname or address the client dialled does not establish identity, and no certificate authority is consulted. The expected key MUST come from the client's configuration or from trusted discovery, never from the certificate itself or a status reply. A client MUST NOT fall back to certificate-authority trust when node-identity verification fails.

Node identity is used by the peer protocol and lattice replication whenever the client knows the key to expect.

#### Service identity

A **service identity** is an ordinary X.509 certificate for the server's hostname or IP address, issued by a certificate authority the client trusts, or self-signed where the operator distributes it to clients, as in development. Clients verify it as their protocol normally does, including the hostname check ([RFC 9525](https://www.rfc-editor.org/rfc/rfc9525)).

Service identity is used by HTTP APIs, WebDAV, the PostgreSQL wire protocol, and Convex clients that do not know the node's key.

#### Serving both

An endpoint presents one identity on each connection. A server whose clients need both identities, such as a peer serving other peers and also Convex clients that know only its hostname, offers each identity on its own endpoint.

### Negotiation

#### Peer protocol and lattice replication

A TLS endpoint for the peer protocol is addressed as `tls://host:port`. The TLS handshake starts with the first byte, and the CAD015 framing and messages then follow unchanged inside TLS. A plaintext endpoint is a separate endpoint, addressed as `tcp://host:port` or `host:port`.

TLS does not replace the protocol's own checks. CAD015's challenge and response and every message signature apply as they do over TCP, and a completed handshake does not by itself make a connection trusted.

A client that cannot complete TLS to a `tls://` endpoint MUST NOT retry the same endpoint over TCP.

#### HTTP: REST, MCP and WebDAV

HTTP servers offer TLS as HTTPS ([RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)) with a service identity.

When a proxy terminates TLS, the server learns the client's scheme only from the proxy, through `Forwarded` ([RFC 7239](https://www.rfc-editor.org/rfc/rfc7239)) or `X-Forwarded-Proto`. A server MUST honour these headers only from proxies the operator has listed as trusted, and MUST ignore them from anyone else. A requirement that a request arrive over HTTPS, such as CAD041's rule for seed-carrying tools, is met by a request received over built-in TLS or reported as HTTPS by a trusted proxy.

#### PostgreSQL wire protocol

Servers follow PostgreSQL's negotiation:

- A client asks for TLS by sending `SSLRequest` before its startup message.
- A server offering TLS answers `S`, and the TLS handshake follows. A server not offering TLS answers `N`, and the client continues in plaintext or disconnects, according to its own settings.
- A client may instead first send `GSSENCRequest`. A server without GSSAPI encryption MUST answer `N`.
- After answering `S`, a server MUST NOT have received any bytes beyond the `SSLRequest`. If it has, it MUST close the connection without processing them, since they arrived unprotected ([CVE-2021-23214](https://www.postgresql.org/support/security/CVE-2021-23214/)).
- A server configured for TLS MUST refuse a startup message received outside TLS with a FATAL error, SQLSTATE `28000`, unless the operator has admitted plaintext clients.

With a service identity, clients can use every libpq `sslmode` up to `verify-full`. Servers MAY also accept PostgreSQL's direct TLS start, in which the client begins the TLS handshake immediately with ALPN protocol `postgresql`.

### Plaintext

On an endpoint configured for TLS, a server MUST NOT accept plaintext unless the operator has explicitly admitted plaintext clients on it. Where a protocol has no way to negotiate TLS on the same port, plaintext is offered only on a separate endpoint.

A client configured to require TLS MUST NOT continue in plaintext when TLS is refused or fails.

### Credentials

TLS client certificates are not used for authorisation; each protocol keeps its own. Credentials sent by a protocol in cleartext, such as PostgreSQL's cleartext password authentication, are protected only when the connection uses TLS. Operators SHOULD NOT require passwords on an endpoint that admits plaintext clients.

### Operation

Operators supply each TLS endpoint's certificate and private key, and own their issuance and renewal. An operator MAY combine built-in TLS with a proxy, for example to protect the hop between the proxy and the server.

## Security properties

- **In transit:** TLS gives confidentiality and integrity between the client and the endpoint that terminates TLS. With a proxy, the hop from proxy to server is protected only if the operator protects it.
- **Node identity:** binds the connection to the node key the client expected. It does not depend on certificate authorities or DNS, so neither a mis-issued certificate nor a hijacked hostname can impersonate the node. It also has no revocation service: a compromised TLS key stays acceptable until its certificate expires, so certificates SHOULD be short-lived.
- **Service identity:** as strong as the client's trusted authorities and its hostname check.
- **No new authority:** TLS grants nothing. Signed messages, protocol admission and each protocol's authorisation are unchanged, so a client that skips TLS gains no access it would not otherwise have.
- **Replicated data:** TLS protects data only while it moves. Data that must stay confidential from the nodes that store and replicate it needs [CAD052](../052_encryption/index.md).

## Related CADs

- [CAD015: Peer Communications](../015_peercomms/index.md)
- [CAD028: Data Lattice File System](../028_dlfs/index.md)
- [CAD036: Lattice Node](../036_lattice_node/index.md)
- [CAD039: Convex SQL](../039_convex_sql/index.md)
- [CAD041: Model Context Protocol](../041_mcp/index.md)
- [CAD052: Encryption](../052_encryption/index.md)
