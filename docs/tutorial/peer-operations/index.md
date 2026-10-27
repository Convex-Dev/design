---
sidebar_position: 1
---

# Peer Operations Overview

Guide for connecting to, monitoring, and operating Convex peers.

## What is Peer Operations?

Peer Operations covers everything from connecting to existing peers to running your own peer infrastructure:

**For Developers** (connecting to peers):
- **[Connection Types](#connection-types)** - HTTP vs binary protocol
- **[Network Verification](#verifying-network-identity)** - Genesis hash and health checks
- **[Performance](#performance)** - What dominates latency, concurrency limits, monitoring

**For Operators** (running peers):
- **[Staking & Registration](peer-operations/staking)** - Stake coins and register your peer
- **[Manual Deployment](peer-operations/manual-deployment)** - Install and configure manually
- **[Docker Deployment](peer-operations/docker-deployment)** - Deploy with Docker/Compose
- **[Hosting Options](peer-operations/hosting)** - Infrastructure and requirements
- **[Security](peer-operations/security)** - Secure your peer infrastructure
- **[Troubleshooting](peer-operations/troubleshooting)** - Diagnose and fix issues

## Connection Types

Convex peers support two connection protocols with different performance characteristics.

### HTTP Protocol (REST API)

**Recommended for**: Web applications, general development

**Connection**:

```java
// Java — ConvexJSON is the REST client. convex.api.Convex takes a peer
// address (host:port) and throws IllegalArgumentException on an https:// URL
ConvexJSON convex = ConvexJSON.connect("https://peer.convex.live");
```

```typescript
// TypeScript
const convex = new Convex('https://peer.convex.live');
```

```python
# Python
from convex_sdk import Convex

convex = Convex('https://peer.convex.live')
```

**Characteristics**:
- Protocol: HTTPS with JSON payloads
- Port: 8080 by default for a peer's REST server; public peers are normally fronted by HTTPS on 443
- Firewall: Works through HTTP proxies

### Binary Protocol

**Recommended for**: Sustained query traffic, and peers you operate yourself

**Connection**:

```java
// Java
import convex.api.Convex;

Convex convex = Convex.connect("peer.convex.live:18888");
```

**Characteristics**:
- Protocol: Custom binary over TCP
- Port: 18888 by default — a separate port from the REST API, and not exposed by every peer
- Connection: Persistent and stateful, so there is no per-request connection setup
- Best suited to sustained query traffic; see [Performance](#performance) for why it makes little difference to transactions

### Connection Configuration

**Timeouts** — `setTimeout` takes milliseconds; the default is 20 seconds:

```java
Convex convex = Convex.connect("peer.convex.live:18888");
convex.setTimeout(30_000);
```

**Connection Pooling** (for high concurrency):

```java
import java.util.concurrent.ConcurrentLinkedQueue;

class ConvexConnectionPool {
    private final ConcurrentLinkedQueue<Convex> pool = new ConcurrentLinkedQueue<>();
    private final String endpoint;

    public ConvexConnectionPool(String endpoint) {
        this.endpoint = endpoint;
    }

    public Convex acquire() throws Exception {
        Convex convex = pool.poll();
        if (convex == null) {
            convex = Convex.connect(endpoint);
        }
        return convex;
    }

    public void release(Convex convex) {
        pool.offer(convex);
    }
}
```

## Network Health and Status

### Check Network Availability

```java
import convex.api.Convex;
import convex.core.Result;

Convex convex = Convex.connect("peer.convex.live:18888");

// A trivial query is enough: it proves the peer is reachable and evaluating
Result result = convex.query("*timestamp*").get();

if (!result.isError()) {
    System.out.println("Network operational, consensus timestamp: " + result.getValue());
} else {
    System.err.println("Network issue: " + result.getErrorCode());
}
```

Use a cheap query for liveness checks. Fetching `*state*` works, but returns the whole consensus state — a wasteful payload to pull on a monitoring interval.

### Query Network Metadata

Consensus points, the peer key and the genesis hash are *peer* metadata, served by `GET /api/v1/status` rather than by a query. What a query can reach is the consensus state itself:

```java
// Number of accounts on the network
Result accounts = convex.query("(count (:accounts *state*))").get();

// Number of timestamps with scheduled operations pending
Result schedule = convex.query("(count (:schedule *state*))").get();

// Memory allowance of the account the query runs as
Result memory = convex.query("*memory*").get();
```

Fetching `*state*` on its own returns the entire consensus state, which is large. Project the part you need, as above.

## Verifying network identity

Each network is identified by the hash of its **genesis state**. Two peers report the same genesis hash if and only if they belong to the same network, so checking it on startup is what stops an application from transacting against a testnet — or an impostor — when it meant to reach production.

The genesis hash is peer metadata, not consensus state: it is *not* available as a CVM special symbol, and a query for `*genesis*` fails with `:UNDECLARED` on every network. Read it from the peer's status instead.

### Protonet genesis hash

```
0xb0e44f2a645abfa539f5b96b7a0eabb0f902866feaff0f7c12d1213e02333f13
```

### Over the REST API

A peer that publishes a REST API returns its status map from `GET /api/v1/status`. The `genesis` field is the hash to compare:

```bash
curl -s http://localhost:8080/api/v1/status
```

This is the output of a freshly started local peer on Convex 0.8.18, which reports eleven fields. A running network has higher points, and its `genesis` no longer equals its `state`:

```json
{
  "consensus-point": 0,
  "proposal-point": 0,
  "genesis": "0x594e4776252fc7bebd700dbc9dacace73c7a3acf6707f06be12bb4457277c676",
  "state-position": 0,
  "peer": "0x81b20ad6461f0a27336d74e1e9fb1fb0f93eda05d15b6500485be5b15e9a9bf6",
  "belief": "0x1cc75783d8c1dd63efb172fff7741a82d75f3651cacd3300178152aaa4e27e59",
  "state": "0x594e4776252fc7bebd700dbc9dacace73c7a3acf6707f06be12bb4457277c676",
  "consensus": [0,
                0,
                0,
                0],
  "supported-protocol-version": 1,
  "block-point": 0,
  "states": "0x594e4776252fc7bebd700dbc9dacace73c7a3acf6707f06be12bb4457277c676"
}
```

Peers on older releases return fewer fields, but always read `genesis`. To verify Protonet, use the binary protocol below, which does not depend on the peer's REST API.

The TypeScript and Python examples compare a peer's genesis against a hash you recorded when you set the network up. Both take the peer URL as a constant, so point them at your own peer or testnet:

**TypeScript**:

```typescript
const PEER = 'http://localhost:8080';
const EXPECTED_GENESIS = '<GENESIS_HASH>';  // recorded when you created the network

const response = await fetch(`${PEER}/api/v1/status`);
if (!response.ok) throw new Error(`Status unavailable: HTTP ${response.status}`);

const status = await response.json();
if (status.genesis !== EXPECTED_GENESIS) {
  throw new Error(`Wrong network — genesis ${status.genesis}`);
}
```

**Python**:

```python
import requests

PEER = "http://localhost:8080"
EXPECTED_GENESIS = "<GENESIS_HASH>"  # recorded when you created the network

response = requests.get(f"{PEER}/api/v1/status", timeout=10)
response.raise_for_status()

genesis = response.json()["genesis"]
if genesis != EXPECTED_GENESIS:
    raise RuntimeError(f"Wrong network — genesis {genesis}")
```

### Over the binary protocol

A binary connection carries its own status request, which works whether or not the peer exposes a REST API. The result is a vector of status values, and `API.ensureStatusMap` turns it into the same keyword map the REST API reports:

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.cvm.Keywords;
import convex.core.data.ACell;
import convex.core.data.AMap;
import convex.core.data.Keyword;
import convex.peer.API;

String PROTONET_GENESIS = "0xb0e44f2a645abfa539f5b96b7a0eabb0f902866feaff0f7c12d1213e02333f13";

Convex convex = Convex.connect("peer.convex.live:18888");
Result result = convex.requestStatusSync();
if (result.isError()) throw new IllegalStateException("Status failed: " + result.getErrorCode());

AMap<Keyword, ACell> status = API.ensureStatusMap(result.getValue());
String genesis = status.get(Keywords.GENESIS).toString();

if (!genesis.equals(PROTONET_GENESIS)) {
    throw new IllegalStateException("Wrong network — genesis " + genesis);
}
```

### What to expect from each network

- **Protonet** — genesis is stable and will not change. Pin it, and fail closed if it does not match.
- **Testnets** — genesis changes whenever the network resets, so pin the *host*, not the hash, and read the current hash at startup.
- **Local peers** — a fresh genesis hash is generated on each new store, so a hard-coded value will break the first time you start from a clean directory.

Fail closed. A verification step that logs a warning and carries on provides no protection, because the case it exists to catch is precisely the one where the transaction should not be sent.

## Performance

### What actually dominates your latency

For a **signed transaction**, the choice of protocol barely matters. The round trip is made up of the network hops and the wait for consensus, and the difference between an HTTP request and a binary frame is small beside both — see the [latency breakdown](/docs/overview/performance#latency) for the stages. Optimising the transport for transactions is optimising the wrong stage.

For a **query**, the opposite holds. Queries never reach consensus: the peer answers from its current state, so the time is your network round trip plus a CVM evaluation measured in microseconds. Here the transport is the whole cost, and a local peer or a persistent binary connection is measurably faster than a fresh HTTPS request per call.

The practical rule: batch and parallelise transactions rather than trying to make each one faster, and keep queries on a connection you already hold open.

### Concurrency limits you will actually hit

A peer's REST API bounds how many `/api/v1/transact` requests are in flight, and holds a permit for the whole consensus wait. The defaults are 10,000 server-wide and 100 per client ([CAD017](/docs/cad/peerops#rest-transaction-concurrency)). A request over the per-client limit is rejected at once with HTTP 503; it is not queued. A load generator opening hundreds of parallel REST transactions against one peer will hit those 503s long before it stresses the network, so cap your in-flight transactions below the limit and retry on 503. The limits apply to REST transactions only, not to queries or to the binary protocol.

A client is identified by its direct socket address. Behind a reverse proxy every caller shares the proxy's address, so [CAD017](/docs/cad/peerops#rest-transaction-concurrency) says operators behind one SHOULD set `transact-limit-client` to `0` and apply per-client policy at the proxy. If you are load-testing someone else's peer, ask what limits they run.

### Practices worth adopting

For development, run a local peer: it removes network latency from the loop entirely, gives you the binary protocol, and lets you reset state between test runs.

For production, reuse connections rather than reconnecting per call, set timeouts that account for the consensus wait — the client default is 20 seconds — and retry with exponential backoff on `:TIMEOUT`. Verify the genesis hash at startup, and fail closed if it does not match. Monitor peer health continuously rather than discovering an unreachable peer through a user's failed transaction.

### Monitoring Example

```java
import java.util.concurrent.*;

import convex.api.Convex;
import convex.core.Result;

public class PeerMonitor {
    private final Convex convex;
    private final ScheduledExecutorService scheduler =
        Executors.newScheduledThreadPool(1);

    public PeerMonitor(Convex convex) {
        this.convex = convex;
    }

    public void startMonitoring() {
        scheduler.scheduleAtFixedRate(() -> {
            try {
                Result result = convex.query("*timestamp*").get();
                if (result.isError()) {
                    System.err.println("Peer health check failed: " + result.getErrorCode());
                } else {
                    System.out.println("Peer healthy");
                }
            } catch (Exception e) {
                System.err.println("Peer unreachable: " + e.getMessage());
            }
        }, 0, 30, TimeUnit.SECONDS);
    }

    public void stopMonitoring() {
        scheduler.shutdown();
    }
}
```

## Local Development Peer

For development, run a local peer for maximum speed and control.

**Quick Start**:

```java
import convex.peer.API;
import convex.peer.Server;
import convex.api.Convex;

// Creates a fresh single-peer network and launches it
Server server = API.launchPeer();

try {
    // Connect as the peer's controller account, which holds the genesis coins.
    // Convex.connect(server) alone leaves the origin address unset, so any
    // transaction fails with "Null Origin Address for transaction".
    Convex convex = Convex.connect(server, server.getPeerController(), server.getKeyPair());
    // Use for development
} finally {
    server.shutdown();
}
```

**Configuration**:

```java
import java.util.HashMap;

import convex.core.crypto.AKeyPair;
import convex.core.data.Keyword;
import convex.core.cvm.Keywords;
import convex.peer.API;
import convex.peer.Server;

// Peer configuration is a keyword map, not a builder
HashMap<Keyword, Object> config = new HashMap<>();
config.put(Keywords.KEYPAIR, AKeyPair.generate());
config.put(Keywords.PORT, 18888);

Server server = API.launchPeer(config);
```

**Advantages**:
- No network round trip
- No network dependency
- Full control
- Built-in account creation

**→ For production peer deployment, see the deployment guides below.**

## Running Production Peers

For production peer operation, see the following guides:

### Getting Started
1. **[Peer Staking & Registration](peer-operations/staking)** - Stake coins and register your peer
2. **[Choose Deployment Method](peer-operations/manual-deployment)** - Manual or Docker
3. **[Select Hosting](peer-operations/hosting)** - Infrastructure requirements
4. **[Secure Your Peer](peer-operations/security)** - Security best practices

### Deployment Options
- **[Manual Deployment](peer-operations/manual-deployment)** - Traditional installation
- **[Docker Deployment](peer-operations/docker-deployment)** - Containerized deployment

### Operations
- **[Troubleshooting](peer-operations/troubleshooting)** - Common issues and solutions
- **[Security](peer-operations/security)** - Secure your infrastructure

## Next Steps

**For Developers**:
- **[Networks Guide](/docs/tutorial/networks)** - Available networks
- **[Client SDKs](/docs/tutorial/client-sdks)** - Connect from your language
- **[Client Types](/docs/tutorial/client-sdks/java/clients)** - Detailed SDK guide

**For Operators**:
- **[Staking & Registration](peer-operations/staking)** - Start running a peer
- **[Deployment Guides](peer-operations/manual-deployment)** - Installation instructions
- **[Security Guide](peer-operations/security)** - Secure your peer

## Resources

- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** - `#peer-operations` channel
- **[Convex.world](https://convex.world)** - Official website
- **[GitHub](https://github.com/Convex-Dev/convex)** - Source code
