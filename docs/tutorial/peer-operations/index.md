---
sidebar_position: 1
---

# Peer Operations Overview

Guide for connecting to, monitoring, and operating Convex peer nodes.

## What is Peer Operations?

Peer Operations covers everything from connecting to existing peers to running your own peer infrastructure:

**For Developers** (connecting to peers):
- **[Connection Types](#connection-types)** - HTTP vs binary protocol
- **[Network Verification](#verifying-network-identity)** - Genesis hash and health checks
- **[Performance](#performance-optimization)** - Optimization and monitoring

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
// Java
Convex convex = Convex.connect("https://peer.convex.live");
```

```typescript
// TypeScript
const convex = new Convex('https://peer.convex.live');
```

```python
# Python
convex = Convex('https://peer.convex.live')
```

**Characteristics**:
- Protocol: HTTPS with JSON payloads
- Port: 18888 (default)
- Latency: 10-50ms typical
- Firewall: Works through HTTP proxies
- Connection: Stateless

### Binary Protocol

**Recommended for**: High-performance applications

**Connection**:

```java
// Java
import java.net.InetSocketAddress;

InetSocketAddress addr = InetSocketAddress.createUnresolved(
    "peer.convex.live",
    18888
);
Convex convex = Convex.connect(addr);
```

**Characteristics**:
- Protocol: Custom binary over TCP
- Port: 18888 (default)
- Latency: 5-20ms typical
- Connection: Persistent stateful
- Throughput: Higher than HTTP

### Connection Configuration

**Timeouts**:

```java
Convex convex = Convex.connect("https://peer.convex.live");
convex.setTimeout(Duration.ofSeconds(30));
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
import convex.core.lang.Reader;

Convex convex = Convex.connect("https://peer.convex.live");

// Query consensus state
Result result = convex.query(Reader.read("*state*")).get();

if (!result.isError()) {
    System.out.println("✓ Network operational");
} else {
    System.err.println("✗ Network issue: " + result.getErrorCode());
}
```

### Query Network Metadata

```java
// Peer information
Result peerInfo = convex.query(Reader.read("(get-peer-info)")).get();

// Current consensus point
Result consensus = convex.query(Reader.read("*state*")).get();

// Total accounts
Result accounts = convex.query(Reader.read("(count *accounts*)")).get();

// Memory usage
Result memory = convex.query(Reader.read("*memory*")).get();
```

## Verifying Network Identity

Each network has a unique **genesis hash**. Always verify you're connected to the correct network.

### Protonet Genesis Hash

```
0xb0e44f2a645abfa539f5b96b7a0eabb0f902866feaff0f7c12d1213e02333f13
```

### Verify Connection

```java
// Protonet genesis hash
String PROTONET_GENESIS = "0xb0e44f2a645abfa539f5b96b7a0eabb0f902866feaff0f7c12d1213e02333f13";

// Connect and verify
Convex convex = Convex.connect("https://peer.convex.live");
Result result = convex.query(Reader.read("*genesis*")).get();
String genesis = result.getValue().toString();

if (genesis.equals(PROTONET_GENESIS)) {
    System.out.println("✓ Connected to Protonet");
} else {
    System.err.println("⚠ Warning: Unknown network");
    System.err.println("Genesis: " + genesis);
}
```

### TypeScript Example

```typescript
const PROTONET_GENESIS = '0xb0e44f2a645abfa539f5b96b7a0eabb0f902866feaff0f7c12d1213e02333f13';

const convex = new Convex('https://peer.convex.live');
const result = await convex.query('*genesis*');

if (result.value.toString() === PROTONET_GENESIS) {
    console.log('✓ Connected to Protonet');
} else {
    console.warn('⚠ Unknown network:', result.value.toString());
}
```

### Python Example

```python
PROTONET_GENESIS = "0xb0e44f2a645abfa539f5b96b7a0eabb0f902866feaff0f7c12d1213e02333f13"

convex = Convex('https://peer.convex.live')
result = convex.query('*genesis*')

if str(result.value) == PROTONET_GENESIS:
    print("✓ Connected to Protonet")
else:
    print(f"⚠ Unknown network: {result.value}")
```

### Important Notes

- ⚠️ **Testnets** change genesis hash when they reset
- ⚠️ **Local peers** generate new genesis hash on startup
- ✅ **Protonet** genesis is stable - always verify for production
- 🔒 Prevents accidental connection to wrong network

## Performance Optimization

### Connection Performance

| Method | Latency | Throughput | Use Case |
|--------|---------|------------|----------|
| HTTP | 10-50ms | ~100 ops/sec | Web apps, general use |
| Binary | 5-20ms | ~500 ops/sec | High-performance apps |
| Local Peer | &lt;1ms | ~10,000 ops/sec | Development, testing |

### Best Practices

**For Development**:
- Use local peer for fastest iteration
- Binary protocol for integration tests
- Disable unnecessary logging

**For Production**:
- Use binary protocol for better throughput
- Implement connection pooling
- Monitor peer health proactively
- Verify genesis hash on startup
- Set appropriate timeouts
- Implement retry logic with exponential backoff

### Monitoring Example

```java
import java.util.concurrent.*;

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
                Result result = convex.query(Reader.read("*state*")).get();
                if (result.isError()) {
                    System.err.println("⚠ Peer health check failed");
                } else {
                    System.out.println("✓ Peer healthy");
                }
            } catch (Exception e) {
                System.err.println("✗ Peer unreachable: " + e.getMessage());
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
import convex.peer.Server;
import convex.api.Convex;

// Create and launch
Server server = Server.create();
server.launch();

try {
    Convex convex = Convex.connect(server);
    // Use for development
} finally {
    server.shutdown();
}
```

**Configuration**:

```java
import convex.peer.Config;

Config config = Config.create();
config = config.withPort(18888);
config = config.withRestPort(8080);

Server server = Server.create(config);
server.launch();
```

**Advantages**:
- Sub-millisecond latency
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
