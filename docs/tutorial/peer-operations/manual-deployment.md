---
sidebar_position: 3
---

# Manual Deployment

Install and configure a Convex peer manually for production use.

## Overview

Manual deployment gives you full control over peer installation and configuration. This guide covers traditional installation on Linux/Unix systems.

**→ For containerized deployment, see [Docker Deployment](docker-deployment)**

## Prerequisites

### System Requirements

**Minimum**:
- 4 CPU cores
- 8 GB RAM
- 100 GB SSD storage
- Ubuntu 20.04 LTS or later (or equivalent)

**Recommended**:
- 8+ CPU cores
- 16 GB+ RAM
- 500 GB+ SSD storage
- Dedicated server or VM

### Software Requirements

- **Java 21+** - OpenJDK or Oracle JDK
- **Git** - For source checkout (optional)
- **Network Access** - Ports 18888 (peer) and 8080 (REST API)

## Installation Steps

### Step 1: Install Java 21

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# Verify installation
java -version
# Should show: openjdk version "21..." or higher
```

### Step 2: Download Convex

**Option A: Download Release**

```bash
# Create installation directory
mkdir -p /opt/convex
cd /opt/convex

# Download latest release
wget https://github.com/Convex-Dev/convex/releases/download/v0.8.2/convex.jar

# Verify download
java -jar convex.jar version
```

**Option B: Build from Source**

```bash
# Clone repository
git clone https://github.com/Convex-Dev/convex.git
cd convex

# Build with Maven
mvn clean install -DskipTests

# Copy JAR
cp convex-integration/target/convex.jar /opt/convex/
```

### Step 3: Generate Peer Keys

```bash
cd /opt/convex

# Generate peer key pair
java -jar convex.jar key generate --output peer-keys.dat

# View public key (needed for staking)
java -jar convex.jar key show peer-keys.dat
```

**⚠️ Security**: Store `peer-keys.dat` securely with restricted permissions (600).

### Step 4: Create Configuration

Create `peer-config.edn`:

```clojure
{:port 18888
 :rest-port 8080
 :keypair-file "peer-keys.dat"
 :store-path "data/peer-store"
 :log-level :info
 :network :protonet
 :genesis "0xb0e44f2a645abfa539f5b96b7a0eabb0f902866feaff0f7c12d1213e02333f13"}
```

### Step 5: Create Data Directory

```bash
mkdir -p /opt/convex/data/peer-store
chown -R convex:convex /opt/convex/data
chmod 755 /opt/convex/data
```

## Running the Peer

### Manual Start

```bash
cd /opt/convex

# Start peer
java -Xmx4g -jar convex.jar peer start \
  --config peer-config.edn

# Peer will start and begin syncing
```

### Check Status

```bash
# Query peer status
curl http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"source":"(get-peer-info)"}'
```

## Systemd Service

For production, run as a systemd service:

### Create Service Unit

Create `/etc/systemd/system/convex-peer.service`:

```ini
[Unit]
Description=Convex Peer Node
After=network.target

[Service]
Type=simple
User=convex
Group=convex
WorkingDirectory=/opt/convex
ExecStart=/usr/bin/java -Xmx4g -jar /opt/convex/convex.jar peer start --config peer-config.edn
Restart=on-failure
RestartSec=10s

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=convex-peer

[Install]
WantedBy=multi-user.target
```

### Create Convex User

```bash
# Create system user
sudo useradd -r -s /bin/false convex

# Set ownership
sudo chown -R convex:convex /opt/convex
```

### Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable convex-peer

# Start service
sudo systemctl start convex-peer

# Check status
sudo systemctl status convex-peer
```

### View Logs

```bash
# Follow logs
sudo journalctl -u convex-peer -f

# View recent logs
sudo journalctl -u convex-peer -n 100
```

## Configuration Options

### Network Configuration

```clojure
{:network :protonet  ; or :testnet for test networks
 :genesis "0x..."    ; Network genesis hash
 :bootstrap-peers [  ; Initial peers to connect to
   "peer1.convex.live:18888"
   "peer2.convex.live:18888"
 ]}
```

### Performance Tuning

```clojure
{:max-connections 1000     ; Maximum peer connections
 :thread-pool-size 16      ; Worker threads
 :cache-size 1000000       ; State cache size
 :sync-batch-size 1000}    ; Blocks per sync batch
```

### Logging Configuration

```clojure
{:log-level :info           ; :debug :info :warn :error
 :log-file "logs/peer.log"  ; Log file path
 :log-rotation :daily}      ; :hourly :daily :weekly
```

## Monitoring

### Health Checks

```bash
# Check if peer is responding
curl http://localhost:8080/api/v1/health

# Query consensus state
curl http://localhost:8080/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"source":"*state*"}'
```

### Metrics

Monitor key metrics:
- Consensus point (should advance regularly)
- Memory usage
- Connection count
- Transaction throughput

### Log Monitoring

```bash
# Watch for errors
sudo journalctl -u convex-peer -f | grep ERROR

# Monitor consensus
sudo journalctl -u convex-peer -f | grep CONSENSUS
```

## Upgrading

### Upgrade Process

```bash
# Stop peer
sudo systemctl stop convex-peer

# Backup data
tar -czf backup-$(date +%Y%m%d).tar.gz /opt/convex/data

# Download new version
cd /opt/convex
wget https://github.com/Convex-Dev/convex/releases/download/v0.8.3/convex.jar \
  -O convex.jar.new

# Replace JAR
mv convex.jar convex.jar.old
mv convex.jar.new convex.jar

# Start peer
sudo systemctl start convex-peer

# Monitor startup
sudo journalctl -u convex-peer -f
```

## Backup and Recovery

### Backup Strategy

```bash
# Stop peer for consistent backup
sudo systemctl stop convex-peer

# Backup data directory
tar -czf backup-$(date +%Y%m%d).tar.gz /opt/convex/data

# Backup configuration
cp peer-config.edn peer-config.edn.backup
cp peer-keys.dat peer-keys.dat.backup

# Restart peer
sudo systemctl start convex-peer
```

### Recovery Process

```bash
# Stop peer
sudo systemctl stop convex-peer

# Restore data
tar -xzf backup-20260210.tar.gz -C /

# Verify permissions
sudo chown -R convex:convex /opt/convex/data

# Start peer
sudo systemctl start convex-peer
```

## Next Steps

1. **[Staking & Registration](staking)** - Stake and register your peer
2. **[Hosting Options](hosting)** - Infrastructure selection
3. **[Security Guide](security)** - Secure your deployment
4. **[Troubleshooting](troubleshooting)** - Common issues

## Resources

- **[Docker Deployment](docker-deployment)** - Alternative deployment method
- **[Convex CLI Reference](/)** - Complete CLI documentation
- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** - Get help
