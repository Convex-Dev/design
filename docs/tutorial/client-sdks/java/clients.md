---
sidebar_position: 6
---

# Client Types

Java has three client classes, and picking the wrong one is the most common source of confusion in this SDK. They speak different protocols and return different result types.

| Class | Protocol | Port | Returns | Use for |
|---|---|---|---|---|
| `convex.java.ConvexJSON` | HTTPS + JSON (REST API) | 443, or 8080 on a local peer | `Map<String,Object>` | Web services, firewalled networks, anything reaching a peer over the internet |
| `convex.java.ConvexHTTP` | HTTPS + CVX data (REST API) | 443, or 8080 on a local peer | `Result` with CVM values | CVM values or transaction simulation from a peer that publishes only HTTP |
| `convex.api.Convex` | Convex binary protocol over TCP or TLS | 18888 | `Result` with CVM values | Sustained query traffic, embedded peers, tests |

`ConvexHTTP` and `Convex` return the same `Result` type, and `ConvexHTTP` is a subclass of `Convex`. `ConvexJSON` is a separate class.

:::warning `Convex.connect` takes a peer address, not a REST URL
`convex.api.Convex.connect` accepts `host`, `host:port`, `tcp://host:port` or `tls://host:port`, and the port defaults to 18888. An `http://` or `https://` URL is refused at once with `IllegalArgumentException: Unsupported transport: https`. To reach the REST API from Java, use `ConvexJSON` or `ConvexHTTP`.
:::

## REST client (`ConvexJSON`)

The REST client speaks HTTPS and JSON to a peer's REST API. This is the **recommended default** for most applications.

### When to use

- Web applications and services
- Getting started with Convex
- Applications behind firewalls or proxies
- Cloud deployments
- Any peer that publishes only an HTTP endpoint, such as the public testnet

### Connection

```java
import convex.java.ConvexJSON;

// A peer's HTTPS endpoint — port 443 is implied
ConvexJSON testnet = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");

// A local peer serves its REST API on port 8080 by default
ConvexJSON local = ConvexJSON.connect("http://localhost:8080");
```

### Characteristics

- **Protocol**: HTTPS with JSON payloads
- **Port**: 443 for a public peer; 8080 by default for a peer's own REST server
- **Results**: plain `Map<String,Object>`, so no CVM data types to unwrap
- **Firewall**: works through standard HTTP proxies
- **Connection**: stateless — a new HTTP request per operation
- **Accounts**: `useNewAccount(amount)` creates and funds an account in one call, where the peer runs a faucet

### Example

```java
import java.util.Map;

import convex.java.ConvexJSON;

public class RestClientExample {
    public static void main(String[] args) throws Exception {
        ConvexJSON convex = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");

        Map<String,Object> result = convex.query("(balance #11)");
        System.out.println("Balance: " + result.get("value"));
    }
}
```

## HTTP client with CVM results (`ConvexHTTP`)

`ConvexHTTP` calls the same REST API as `ConvexJSON` but exchanges CVX data rather than JSON, so it returns the same `Result` objects as the binary client. Use it to read CVM values, or to estimate transaction costs with `simulate`, from a peer that publishes only an HTTP endpoint.

```java
import java.net.URI;

import convex.core.Result;
import convex.core.data.prim.CVMLong;
import convex.java.ConvexHTTP;

ConvexHTTP convex = ConvexHTTP.connect(new URI("https://mikera1337-convex-testnet.hf.space"));

Result result = convex.query("(balance #11)").get();
CVMLong balance = result.getValue();
```

It is a thinner client than the binary one. It holds no connection, so `close()` does nothing, and `acquire` is not implemented (it returns `null`), so anything that fetches missing data by hash through the client does not work over it. For ordinary queries and transactions it behaves like any other `Convex`.

## Binary protocol client (`Convex`)

The binary client opens a direct TCP connection to a peer's Convex protocol port. Use it when you hold a long-lived connection and issue many operations over it.

### When to use

- Sustained query traffic over one connection
- Real-time applications
- Direct peer-to-peer communication
- Applications working with CVM data types directly rather than JSON

### Connection

```java
import convex.api.Convex;
import java.net.InetSocketAddress;

// Host and peer port. Note this is 18888, not the REST port
Convex convex = Convex.connect("peer.convex.live:18888");

// Equivalently, with an explicit socket address
InetSocketAddress peerAddress = InetSocketAddress.createUnresolved("peer.convex.live", 18888);
Convex sameConvex = Convex.connect(peerAddress);

// A peer that serves the binary protocol over TLS
Convex secure = Convex.connect("tls://peer.example.com:18888");
```

:::note Not every peer exposes it
The binary port is separate from the REST API and is often not published. The Hugging Face testnet is HTTP only, so use Protonet, your own peer, or a [local peer](#local-peer-client) when you need the binary protocol.
:::

### Characteristics

- **Protocol**: Convex binary protocol over TCP
- **Port**: 18888 by default — a different port from the REST API
- **Results**: `Result` carrying CVM values, so `getValue()` returns an `ACell` subtype
- **Firewall**: may require specific TCP port access
- **Connection**: persistent and stateful, so there is no per-request connection setup
- **Overhead**: lower bandwidth than HTTP/JSON

### Example

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.data.prim.CVMLong;

public class BinaryClientExample {
    public static void main(String[] args) throws Exception {
        Convex convex = Convex.connect("peer.convex.live:18888");

        // Queries need no account
        Result result = convex.query("(balance #11)").get();
        CVMLong balance = result.getValue();
        System.out.println("Balance: " + balance.longValue());

        // One connection serves any number of operations
        for (int i = 0; i < 100; i++) {
            convex.query("(+ 1 " + i + ")").get();
        }

        convex.close();
    }
}
```

To submit transactions, set the address and key pair of an account you control first, as described in the [account guide](accounts).

`Result.getValue()` returns an `ACell`, not a Java number. Assign it to the CVM type — `CVMLong`, `CVMDouble`, `AString` — and convert from there. `(Number) result.getValue()` does not compile.

### Performance tip

The binary client maintains a persistent connection, making it worthwhile for applications that issue many queries over time. The first connection has slightly higher overhead; subsequent operations avoid connection setup entirely.

## Local Peer Client

The local peer client gives you **direct access to a peer running in the same JVM**. This is the fastest possible option but requires expert knowledge and careful resource management.

### When to Use

- Testing and development
- Embedded applications
- When you need absolute maximum performance
- Running your own peer
- Advanced debugging and monitoring

### Connection

```java
import convex.api.Convex;
import convex.peer.API;
import convex.peer.Server;

// Start a local peer
Server server = API.launchPeer();

// Connect directly, as the peer's controller account
Convex convex = Convex.connect(server, server.getPeerController(), server.getKeyPair());
```

### Characteristics

- **Protocol**: Direct in-memory method calls
- **Performance**: Fastest (sub-millisecond latency)
- **Overhead**: No network or serialisation overhead
- **Resource**: Requires running full peer (memory intensive)
- **Expertise**: Requires understanding of peer lifecycle management
- **Use Case**: Primarily testing, development, and specialised deployments

### Example

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.peer.API;
import convex.peer.Server;

public class LocalPeerExample {
    public static void main(String[] args) throws Exception {
        // Creates a fresh single-peer network and launches it
        Server server = API.launchPeer();

        try {
            // Connect as the peer's own controller account, which holds the genesis coins.
            // Creating an account is itself a transaction, so the client needs an account
            // that can sign before it can make one.
            Convex convex = Convex.connect(server, server.getPeerController(), server.getKeyPair());

            // Create a test account and fund it
            AKeyPair keyPair = AKeyPair.generate();
            Address address = convex.createAccountSync(keyPair.getAccountKey());
            convex.transfer(address, 1_000_000_000L).get();

            // Switch the client over to the new account
            convex.setAddress(address);
            convex.setKeyPair(keyPair);

            // Execute operations with minimal latency
            Result result = convex.transact("(def my-value 42)").get();

            System.out.println("Result: " + result.getValue());

            convex.close();
        } finally {
            // Important: shut down peer properly
            server.shutdown();
        }
    }
}
```

Note the ordering: `createAccountSync` submits a transaction, so the client must already be signing as a funded account. Connecting with `Convex.connect(server)` alone leaves the origin address unset, and the call fails with `Null Origin Address for transaction`.

### Important Considerations

**Memory Requirements**: A local peer requires significant memory (typically 2-4GB minimum) for the full peer database and consensus state.

**Lifecycle Management**: You are responsible for properly starting and stopping the peer. Always use try-finally or try-with-resources to ensure cleanup.

**Testing Only**: Local peers are typically used for testing. Production applications usually connect to dedicated peer infrastructure.

**Peer Configuration**: Local peers can be configured with custom parameters:

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

## Choosing on performance

Which client is faster depends entirely on whether you are querying or transacting.

For **transactions**, the client barely matters. The round trip is made up of the network hops and the wait for consensus, and the difference between an HTTP request and a binary frame is small beside both ([latency breakdown](/docs/overview/performance#latency)). Throughput comes from submitting transactions concurrently, not from a faster transport.

For **queries**, the client is the whole cost. A query is answered from the peer's current state without consensus, so the time is your network round trip plus a CVM evaluation measured in microseconds. A persistent binary connection avoids per-request connection setup, and a local peer removes the network entirely.

The practical ordering, then: use a local peer for development and tests, the binary client when you hold a long-lived connection and issue many queries, and the HTTP client everywhere else — including anywhere a firewall or proxy stands between you and the peer.

One limit applies to the REST clients only. A peer's REST `/api/v1/transact` endpoint allows 100 concurrent transactions per client by default ([CAD017](/docs/cad/peerops#rest-transaction-concurrency)), and a request over that limit is rejected at once with HTTP 503 rather than queued. A load generator using `ConvexJSON` or `ConvexHTTP` should cap its in-flight transactions below the limit and retry on 503. The limit does not apply to queries or to the binary protocol.

## Switching Between Client Types

The binary client, the local peer client and `ConvexHTTP` all extend `convex.api.Convex` and return `Result`, so switching between them changes only the line that connects:

```java
Convex convex;

// Binary protocol against a remote peer
convex = Convex.connect("peer.convex.live:18888");

// HTTP to a peer that publishes no binary port
convex = ConvexHTTP.connect(new URI("https://mikera1337-convex-testnet.hf.space"));

// An in-process peer
Server server = API.launchPeer();
convex = Convex.connect(server, server.getPeerController(), server.getKeyPair());

// Same code from here on, whichever you chose
Result result = convex.query("(balance #11)").get();
```

`ConvexJSON` is a different type with a different result shape, so moving to or from it means changing how you read results as well as how you connect:

```java
ConvexJSON convex = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");
Map<String,Object> result = convex.query("(balance #11)");   // not a Result
```

## Best Practices

### Development and Testing

**Recommended**: Use a **local peer** for best development experience:

```java
// Local peer: fastest, full control, built-in faucet
Server server = API.launchPeer();
Convex convex = Convex.connect(server, server.getPeerController(), server.getKeyPair());
```

**Alternative**: Use a **public testnet** if you don't want to run a local peer. It is HTTP only, so this is the REST client:

```java
// Public testnet: good for learning, has faucet
ConvexJSON convex = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");
```

### Production

For production applications, connect to production peers:

```java
// REST over HTTPS: works everywhere, including behind proxies
ConvexJSON convex = ConvexJSON.connect("https://peer.convex.live");

// Binary protocol: a persistent connection on the peer port
Convex convex = Convex.connect("peer.convex.live:18888");
```

Protonet publishes both. A peer that only publishes an HTTPS endpoint supports the REST clients (`ConvexJSON` and `ConvexHTTP`) alone.

### Testing

Use local peer for unit and integration tests:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.*;

import convex.api.Convex;
import convex.core.Result;
import convex.core.data.prim.CVMLong;
import convex.peer.API;
import convex.peer.Server;

class MyConvexTest {
    private static Server server;
    private Convex convex;

    @BeforeAll
    static void startPeer() throws Exception {
        server = API.launchPeer();
    }

    @BeforeEach
    void connect() throws Exception {
        convex = Convex.connect(server, server.getPeerController(), server.getKeyPair());
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
        Result result = convex.query("(+ 1 2 3)").get();
        assertEquals(CVMLong.create(6), result.getValue());
    }
}
```

The expected value is a `CVMLong`, not a Java `long`: `assertEquals(6L, result.getValue())` fails because a `CVMLong` never equals a `Long`.

## Connection Configuration

### Timeouts

`setTimeout` takes **milliseconds**, and applies to operations that wait for a result:

```java
import convex.api.Convex;

Convex convex = Convex.connect("peer.convex.live:18888");

// Wait up to 30 seconds for a transaction to reach consensus
convex.setTimeout(30_000);
```

The default is 20 seconds, chosen so that ordinary scheduling delay on a loaded machine does not surface as a spurious `:TIMEOUT`. A transaction normally confirms in tens of milliseconds on a healthy network, so the default is a ceiling, not an expectation. Connection establishment and internal queue backpressure keep a separate, shorter 8-second bound, so lowering this value does not make a slow connection fail faster — it only shortens how long you wait for a result.

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

### REST client issues

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

### Binary client issues

**`IllegalArgumentException: Unsupported transport: https`**:
- You passed a REST URL to `Convex.connect`. Use `host:port` for the binary protocol, or switch to `ConvexJSON` or `ConvexHTTP` for the REST API

**`IOException: Failed to connect to peer`** (after about 8 seconds):
- Check you are using the peer port (18888), not the REST port
- Verify the peer publishes a binary port at all — many public peers expose only HTTPS, and the Hugging Face testnet is one
- Some networks block non-HTTP ports

**`Connection closed` in a `Result`**:
- The port accepted the connection but does not speak the binary protocol, as an HTTPS port does. Point the client at the peer's binary port instead

**Peer Disconnection**:
- Binary connections are persistent; implement reconnection logic
- Monitor connection state and reconnect on failure

### Local peer issues

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
