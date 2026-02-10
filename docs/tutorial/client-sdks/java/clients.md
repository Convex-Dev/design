---
sidebar_position: 6
---

# Client Types

The Java SDK provides three different ways to connect to the Convex network, each with different performance characteristics and use cases.

## Overview

| Client Type | Speed | Complexity | Use Case |
|-------------|-------|------------|----------|
| **HTTP Client** | Fast | Simple | Most applications, web services, general use |
| **Binary Client** | Faster | Moderate | High-throughput applications, real-time systems |
| **Local Peer** | Fastest | Expert | Testing, development, embedded systems |

## HTTP Client (REST API)

The HTTP client connects to a Convex peer's REST API endpoint. This is the **recommended default** for most applications.

### When to Use

- ✅ Web applications and services
- ✅ Getting started with Convex
- ✅ Applications behind firewalls/proxies
- ✅ Cloud deployments
- ✅ When simplicity matters more than raw speed

### Connection

```java
import convex.api.Convex;

// Connect to peer's HTTP endpoint (default port 18888)
Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

// With explicit port
Convex convex = Convex.connect("https://peer.example.com:18888");
```

### Characteristics

- **Protocol**: HTTPS with JSON payloads
- **Port**: 18888 (default)
- **Performance**: Fast (typical latency 10-50ms depending on network)
- **Firewall**: Works through standard HTTP proxies
- **SSL/TLS**: Full encryption support
- **Connection**: Stateless (new HTTP request per operation)

### Example

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.lang.Reader;

public class HttpClientExample {
    public static void main(String[] args) throws Exception {
        // Connect via HTTP to public testnet
        Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

        // Execute query
        Result result = convex.query(
            Reader.read("(balance #13)")
        ).get();

        System.out.println("Balance: " + result.getValue());

        convex.close();
    }
}
```

## Binary Protocol Client

The binary client establishes a direct TCP connection to a peer using Convex's efficient binary protocol. Use this for **high-performance applications** that need lower latency.

### When to Use

- ✅ High-throughput transaction systems
- ✅ Real-time applications
- ✅ When you need minimal latency
- ✅ Direct peer-to-peer communication
- ✅ Applications with sustained connection requirements

### Connection

```java
import convex.api.Convex;
import java.net.InetSocketAddress;

// Connect to peer's binary protocol port (default 18888)
InetSocketAddress peerAddress = InetSocketAddress.createUnresolved(
    "mikera1337-convex-testnet.hf.space",
    18888
);

Convex convex = Convex.connect(peerAddress);
```

### Characteristics

- **Protocol**: Custom binary protocol over TCP
- **Port**: 18888 (default, same as HTTP)
- **Performance**: Faster (typical latency 5-20ms)
- **Firewall**: May require specific TCP port access
- **Connection**: Persistent stateful connection
- **Overhead**: Lower bandwidth usage than HTTP/JSON
- **Multiplexing**: Multiple concurrent requests on single connection

### Example

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;
import java.net.InetSocketAddress;

public class BinaryClientExample {
    public static void main(String[] args) throws Exception {
        // Connect via binary protocol
        InetSocketAddress peerAddress = InetSocketAddress.createUnresolved(
            "mikera1337-convex-testnet.hf.space",
            18888
        );

        Convex convex = Convex.connect(peerAddress);

        // Set up account
        AKeyPair keyPair = AKeyPair.generate();
        convex.setKeyPair(keyPair);
        convex.setAddress(Address.create(1234));

        // Execute many transactions efficiently
        for (int i = 0; i < 100; i++) {
            Result result = convex.transact(
                Reader.read("(def x " + i + ")")
            ).get();
            System.out.println("Transaction " + i + " completed");
        }

        convex.close();
    }
}
```

### Performance Tip

The binary client maintains a persistent connection, making it ideal for applications that submit many operations over time. The first connection has slightly higher overhead, but subsequent operations are much faster than HTTP.

## Local Peer Client

The local peer client gives you **direct access to a peer running in the same JVM**. This is the fastest possible option but requires expert knowledge and careful resource management.

### When to Use

- ✅ Testing and development
- ✅ Embedded applications
- ✅ When you need absolute maximum performance
- ✅ Running your own peer node
- ✅ Advanced debugging and monitoring

### Connection

```java
import convex.api.Convex;
import convex.peer.Server;

// Start a local peer
Server server = Server.create();
server.launch();

// Connect directly to local peer
Convex convex = Convex.connect(server);
```

### Characteristics

- **Protocol**: Direct in-memory method calls
- **Performance**: Fastest (sub-millisecond latency)
- **Overhead**: No network or serialization overhead
- **Resource**: Requires running full peer (memory intensive)
- **Expertise**: Requires understanding of peer lifecycle management
- **Use Case**: Primarily testing, development, and specialized deployments

### Example

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;
import convex.peer.Server;

public class LocalPeerExample {
    public static void main(String[] args) throws Exception {
        // Create and launch local peer
        Server server = Server.create();
        server.launch();

        try {
            // Connect directly to local peer
            Convex convex = Convex.connect(server);

            // Create test account with funds
            AKeyPair keyPair = AKeyPair.generate();
            Address address = convex.createAccountSync(keyPair.getAccountKey());

            // Set up client
            convex.setKeyPair(keyPair);
            convex.setAddress(address);

            // Execute operations with minimal latency
            Result result = convex.transact(
                Reader.read("(def my-value 42)")
            ).get();

            System.out.println("Result: " + result.getValue());

            convex.close();
        } finally {
            // Important: shut down peer properly
            server.shutdown();
        }
    }
}
```

### Important Considerations

**Memory Requirements**: A local peer requires significant memory (typically 2-4GB minimum) for the full node database and consensus state.

**Lifecycle Management**: You are responsible for properly starting and stopping the peer. Always use try-finally or try-with-resources to ensure cleanup.

**Testing Only**: Local peers are typically used for testing. Production applications usually connect to dedicated peer infrastructure.

**Peer Configuration**: Local peers can be configured with custom parameters:

```java
import convex.peer.Config;
import convex.peer.Server;

// Create peer with custom configuration
Config config = Config.create();
config = config.withPort(18888);
config = config.withRestPort(8080);

Server server = Server.create(config);
server.launch();
```

## Performance Comparison

Approximate latency for a simple query operation:

| Client Type | Typical Latency | Throughput |
|-------------|----------------|------------|
| HTTP Client | 10-50ms | ~100 ops/sec |
| Binary Client | 5-20ms | ~500 ops/sec |
| Local Peer | &lt;1ms | ~10,000 ops/sec |

**Note**: Actual performance depends on:
- Network conditions
- Hardware specifications
- Peer load and configuration
- Operation complexity
- Concurrent usage patterns

## Switching Between Client Types

You can easily switch between client types by changing only the connection code. The rest of your application code remains identical:

```java
// Option 1: HTTP
Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

// Option 2: Binary Protocol (same functionality)
InetSocketAddress addr = InetSocketAddress.createUnresolved("mikera1337-convex-testnet.hf.space", 18888);
Convex convex = Convex.connect(addr);

// Option 3: Local Peer (same functionality)
Server server = Server.create();
server.launch();
Convex convex = Convex.connect(server);

// All three support the same API:
Result result = convex.query(Reader.read("(balance #13)")).get();
```

## Best Practices

### Development and Testing

**Recommended**: Use a **local peer** for best development experience:

```java
// Local peer: fastest, full control, built-in faucet
Server server = Server.create();
server.launch();
Convex convex = Convex.connect(server);
```

**Alternative**: Use a **public testnet** if you don't want to run a local peer:

```java
// Public testnet: good for learning, has faucet
Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");
```

### Production

For production applications, connect to production peers:

```java
// Production: use peer.convex.live or your own peer infrastructure
Convex convex = Convex.connect("https://peer.convex.live");

// Or binary protocol for better performance
InetSocketAddress peerAddress = InetSocketAddress.createUnresolved(
    "peer.convex.live",
    18888
);
Convex convex = Convex.connect(peerAddress);
```

### Testing

Use local peer for unit and integration tests:

```java
import org.junit.jupiter.api.*;

class MyConvexTest {
    private static Server server;
    private Convex convex;

    @BeforeAll
    static void startPeer() throws Exception {
        server = Server.create();
        server.launch();
    }

    @BeforeEach
    void connect() throws Exception {
        convex = Convex.connect(server);
    }

    @AfterEach
    void disconnect() throws Exception {
        convex.close();
    }

    @AfterAll
    static void stopPeer() throws Exception {
        server.shutdown();
    }

    @Test
    void testQuery() throws Exception {
        Result result = convex.query(Reader.read("(+ 1 2 3)")).get();
        assertEquals(6L, result.getValue());
    }
}
```

## Connection Configuration

### Timeouts

Configure connection and request timeouts:

```java
import convex.api.Convex;
import java.time.Duration;

Convex convex = Convex.connect("https://mikera1337-convex-testnet.hf.space");

// Set timeout for operations
convex.setTimeout(Duration.ofSeconds(30));
```

### Connection Pooling

For high-concurrency applications, consider maintaining a pool of connections:

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

## Troubleshooting

### HTTP Client Issues

**Connection Refused**:
- Verify peer URL is correct
- Check peer is running and accessible
- Verify firewall/proxy settings

```bash
# Test peer accessibility
curl https://mikera1337-convex-testnet.hf.space/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"source":"(+ 1 2 3)"}'
```

### Binary Client Issues

**Connection Timeout**:
- Verify peer hostname and port
- Check TCP port 18888 is accessible
- Some networks block non-HTTP ports

**Peer Disconnection**:
- Binary connections are persistent; implement reconnection logic
- Monitor connection state and reconnect on failure

### Local Peer Issues

**OutOfMemoryError**:
- Increase JVM heap size: `-Xmx4g`
- Local peers require significant memory

**Port Already in Use**:
- Another peer is already running on the same port
- Configure peer with different port or stop existing peer

## Next Steps

- **[Query Guide](queries)** - Learn how to read network state
- **[Transaction Guide](transactions)** - Submit state-changing operations
- **[Account Management](accounts)** - Manage keys and accounts

## Resources

- **[Convex Peer Documentation](/docs/products/convex-peer)** - Running your own peer
- **[Javadoc API Reference](https://javadoc.io/doc/world.convex/convex-java)** - Complete API documentation
- **[GitHub Repository](https://github.com/Convex-Dev/convex)** - Source code (convex-java module)
