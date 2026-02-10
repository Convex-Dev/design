---
sidebar_position: 6
---

# Local Testnets

Run a local Convex testnet for development and testing.

## Overview

Local testnets provide:
- ✅ **Fastest development** - No network latency
- ✅ **Full control** - Configure as needed
- ✅ **Free funds** - Create accounts at will
- ✅ **Privacy** - No external exposure
- ✅ **Offline work** - No internet required

## Options

Choose the method that best fits your workflow:

| Method | Best For | Setup Time | Complexity |
|--------|----------|------------|------------|
| **[JVM Direct](#jvm-direct)** | Unit tests, library integration | Instant | Low |
| **[Convex Desktop](#convex-desktop)** | Interactive development, GUI | 1 minute | Low |
| **[CLI](#cli-peer)** | Scripts, automation | 1 minute | Low |
| **[Docker](#docker-peer)** | Consistent environment, CI/CD | 2 minutes | Medium |

## JVM Direct

Launch a peer directly in your JVM process - fastest option for testing.

### Use Cases

- ✅ Unit tests
- ✅ Integration tests
- ✅ Library development
- ✅ Quick experiments

### Quick Start

**Java**:
```java
import convex.peer.Server;
import convex.api.Convex;
import convex.core.Result;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import convex.core.lang.Reader;

public class LocalTestnetExample {
    public static void main(String[] args) throws Exception {
        // Launch local peer
        Server server = Server.create();
        server.launch();

        try {
            // Connect directly
            Convex convex = Convex.connect(server);

            // Create test account
            AKeyPair keyPair = AKeyPair.generate();
            Address address = convex.createAccountSync(keyPair.getAccountKey());

            // Fund account (no faucet needed, you control the peer!)
            convex.setKeyPair(keyPair);
            convex.setAddress(address);

            // Use for testing
            Result result = convex.transact(Reader.read("(def test-value 42)")).get();
            System.out.println("Result: " + result.getValue());

        } finally {
            // Clean shutdown
            server.shutdown();
        }
    }
}
```

### JUnit Test Example

```java
import org.junit.jupiter.api.*;
import convex.peer.Server;
import convex.api.Convex;

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

        // Create fresh account for each test
        AKeyPair keyPair = AKeyPair.generate();
        Address address = convex.createAccountSync(keyPair.getAccountKey());
        convex.setKeyPair(keyPair);
        convex.setAddress(address);
    }

    @Test
    void testTransaction() throws Exception {
        Result result = convex.transact(Reader.read("(+ 1 2 3)")).get();
        assertEquals(6L, result.getValue());
    }

    @AfterEach
    void disconnect() throws Exception {
        convex.close();
    }

    @AfterAll
    static void stopPeer() throws Exception {
        server.shutdown();
    }
}
```

### Configuration

```java
import convex.peer.Config;

// Custom configuration
Config config = Config.create();
config = config.withPort(18888);
config = config.withRestPort(8080);

Server server = Server.create(config);
server.launch();
```

### Advantages

- ⚡ **Sub-millisecond latency** - Direct method calls
- 🔧 **Full control** - Configure everything
- 🧪 **Isolated** - Clean state per test
- 📦 **No external dependencies** - Pure Java

### Considerations

- ⚠️ Requires 2-4 GB RAM
- ⚠️ State is ephemeral (lost on shutdown)
- ⚠️ Single-peer network (no consensus testing)

## Convex Desktop

Run a local peer with a full GUI for interactive development.

### Use Cases

- ✅ Interactive REPL
- ✅ Visual account management
- ✅ Transaction debugging
- ✅ Learning Convex Lisp
- ✅ Smart contract development

### Installation

**Download**:
```bash
# Linux/Mac
wget https://github.com/Convex-Dev/convex/releases/download/v0.8.2/convex.jar

# Or build from source
git clone https://github.com/Convex-Dev/convex.git
cd convex && mvn install
```

### Launch Desktop

```bash
# Start GUI
java -jar convex.jar desktop

# With custom memory
java -Xmx4g -jar convex.jar desktop
```

### Features

**GUI Includes**:
- **Peer Control** - Start/stop local peer
- **Account Manager** - Create/manage accounts
- **REPL** - Interactive Convex Lisp console
- **Actor Deployer** - Deploy smart contracts
- **Network Explorer** - Browse accounts and state
- **Transaction Builder** - Build and submit transactions

### Quick Start Workflow

1. **Launch** Convex Desktop
2. **Start Peer** - Click "Start Local Peer"
3. **Create Account** - Tools → New Account
4. **Fund Account** - Request funds (automatic for local peer)
5. **Use REPL** - Interactive Convex Lisp console

### Example: Deploy Actor via Desktop

```clojure
;; In Desktop REPL

;; 1. Create account (if not already)
(create-account)

;; 2. Deploy actor
(deploy
  '(do
     (defn greet [name]
       (str "Hello, " name "!"))

     (export greet)))

;; 3. Call actor function
(call actor-address (greet "World"))
```

### Advantages

- 🎨 **Visual interface** - See everything
- 🔍 **REPL** - Instant feedback
- 📊 **State exploration** - Browse accounts
- 🎓 **Learning-friendly** - Interactive environment

### Considerations

- ⚠️ GUI overhead (slower than headless)
- ⚠️ Not suitable for automation
- ⚠️ Requires display (no headless servers)

## CLI Peer

Run a local peer from the command line - ideal for scripts and automation.

### Use Cases

- ✅ Shell scripts
- ✅ Automation
- ✅ CI/CD pipelines
- ✅ Headless servers
- ✅ Background services

### Quick Start

```bash
# Start peer in background
java -jar convex.jar peer start --config local-config.edn &

# Wait for startup
sleep 5

# Use peer
curl http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"source":"(+ 1 2 3)"}'

# Stop peer
pkill -f convex.jar
```

### Configuration File

Create `local-config.edn`:

```clojure
{:port 18888
 :rest-port 8080
 :store-path "data/local-peer"
 :log-level :info
 :local-mode true}  ; Run as local testnet
```

### Automation Script

```bash
#!/bin/bash
# start-local-testnet.sh

CONVEX_JAR="convex.jar"
CONFIG="local-config.edn"
PID_FILE="peer.pid"

# Start peer
java -jar $CONVEX_JAR peer start --config $CONFIG &
echo $! > $PID_FILE

# Wait for ready
echo "Waiting for peer to start..."
while ! curl -s http://localhost:8080/api/v1/health > /dev/null; do
  sleep 1
done

echo "✓ Local peer ready at http://localhost:8080"
```

```bash
#!/bin/bash
# stop-local-testnet.sh

PID_FILE="peer.pid"

if [ -f $PID_FILE ]; then
  kill $(cat $PID_FILE)
  rm $PID_FILE
  echo "✓ Peer stopped"
else
  echo "No peer PID file found"
fi
```

### Using in Scripts

```bash
# Start peer
./start-local-testnet.sh

# Run tests
./run-tests.sh

# Stop peer
./stop-local-testnet.sh
```

### CI/CD Integration

**GitHub Actions**:
```yaml
name: Test with Local Peer

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Set up Java
        uses: actions/setup-java@v2
        with:
          java-version: '21'

      - name: Start Local Peer
        run: |
          wget https://github.com/Convex-Dev/convex/releases/download/v0.8.2/convex.jar
          java -jar convex.jar peer start --config local-config.edn &
          sleep 10

      - name: Run Tests
        run: mvn test

      - name: Stop Peer
        run: pkill -f convex.jar
```

### Advantages

- 🚀 **Scriptable** - Automation-friendly
- 🔄 **CI/CD** - Perfect for pipelines
- 💻 **Headless** - No GUI needed
- 📝 **Logging** - File-based logs

### Considerations

- ⚠️ Manual process management
- ⚠️ Requires cleanup handling
- ⚠️ No interactive features

## Docker Peer

Run a local peer in a Docker container for consistent, isolated environment.

### Use Cases

- ✅ Consistent development environment
- ✅ Multi-developer teams
- ✅ CI/CD pipelines
- ✅ Isolated testing
- ✅ Easy cleanup

### Quick Start

**Docker Run**:
```bash
# Start local peer
docker run -d \
  --name convex-local \
  -p 18888:18888 \
  -p 8080:8080 \
  -e LOCAL_MODE=true \
  convex/convex:latest peer start

# Check status
docker logs convex-local

# Use peer
curl http://localhost:8080/api/v1/health

# Stop and remove
docker stop convex-local
docker rm convex-local
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  convex-local:
    image: convex/convex:latest
    container_name: convex-local-testnet
    ports:
      - "18888:18888"
      - "8080:8080"
    environment:
      - LOCAL_MODE=true
      - JAVA_OPTS=-Xmx2g
      - LOG_LEVEL=info
    volumes:
      - convex-local-data:/app/data
    command: peer start

volumes:
  convex-local-data:
```

**Usage**:
```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Stop and remove data
docker-compose down -v
```

### Makefile for Convenience

```makefile
.PHONY: start stop logs clean test

start:
	docker-compose up -d
	@echo "Waiting for peer to be ready..."
	@sleep 5
	@echo "✓ Local testnet ready at http://localhost:8080"

stop:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	docker system prune -f

test: start
	./run-tests.sh
	$(MAKE) stop
```

**Usage**:
```bash
make start   # Start local testnet
make test    # Run tests
make stop    # Stop testnet
make clean   # Clean up everything
```

### CI/CD Integration

**GitHub Actions with Docker**:
```yaml
name: Test with Docker Peer

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      convex:
        image: convex/convex:latest
        ports:
          - 18888:18888
          - 8080:8080
        env:
          LOCAL_MODE: true

    steps:
      - uses: actions/checkout@v2

      - name: Wait for Peer
        run: |
          timeout 60 bash -c 'until curl -s http://localhost:8080/api/v1/health; do sleep 1; done'

      - name: Run Tests
        run: mvn test -Dconvex.peer.url=http://localhost:8080
```

### Advantages

- 📦 **Consistent environment** - Same everywhere
- 🔒 **Isolated** - No host contamination
- 🧹 **Easy cleanup** - `docker-compose down -v`
- 🚀 **CI/CD friendly** - Standard tooling

### Considerations

- ⚠️ Docker overhead (slight performance impact)
- ⚠️ Requires Docker installed
- ⚠️ Volume management needed for persistence

## Comparison

### Performance

| Method | Startup Time | Latency | Throughput |
|--------|-------------|---------|------------|
| JVM Direct | Instant | Sub-ms | Highest |
| Convex Desktop | ~5 seconds | Sub-ms | High |
| CLI | ~3 seconds | Sub-ms | High |
| Docker | ~5 seconds | 1-2ms | Good |

### Best Practices

**Development**:
- Use **JVM Direct** for unit tests (fastest)
- Use **Desktop** for interactive development
- Use **CLI** for integration tests
- Use **Docker** for team consistency

**CI/CD**:
- Prefer **Docker** (consistent, isolated)
- Use **CLI** if Docker unavailable
- Avoid **Desktop** (GUI not needed)
- Consider **JVM Direct** for pure Java tests

**Learning**:
- Start with **Desktop** (visual, interactive)
- Move to **JVM Direct** as you progress
- Experiment with **CLI** for automation
- Try **Docker** for deployment practice

## Next Steps

### For Development
- **[Client SDKs](/docs/tutorial/client-sdks)** - Connect from your language
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp)** - Learn the language
- **[Smart Contract Tutorial](/docs/tutorial/actors)** - Build actors

### For Production
- **[Networks Guide](/docs/tutorial/networks)** - Public networks
- **[Manual Deployment](manual-deployment)** - Production setup
- **[Docker Deployment](docker-deployment)** - Container deployment

## Resources

- **[GitHub Repository](https://github.com/Convex-Dev/convex)** - Source code
- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** - Get help
- **[API Documentation](/docs/api)** - API reference
