---
sidebar_position: 4
---

# Docker Deployment

Deploy a Convex peer using Docker for simplified container-based deployment.

## Overview

Docker deployment provides:
- ✅ Simplified installation
- ✅ Consistent environment
- ✅ Easy upgrades
- ✅ Portable configuration

**→ For traditional installation, see [Manual Deployment](manual-deployment)**

## Prerequisites

- **Docker** 20.10+ installed
- **Docker Compose** 2.0+ (optional, recommended)
- 4+ GB RAM allocated to Docker
- 100+ GB disk space

## Quick Start

### Using Docker Run

```bash
# Pull image
docker pull convex/convex:latest

# Run peer
docker run -d \
  --name convex-peer \
  -p 18888:18888 \
  -p 8080:8080 \
  -v convex-data:/app/data \
  convex/convex:latest peer start
```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  peer:
    image: convex/convex:latest
    container_name: convex-peer
    ports:
      - "18888:18888"  # Peer port
      - "8080:8080"    # REST API
    volumes:
      - convex-data:/app/data
      - ./peer-config.edn:/app/config/peer-config.edn:ro
      - ./peer-keys.dat:/app/keys/peer-keys.dat:ro
    environment:
      - JAVA_OPTS=-Xmx4g
      - NETWORK=protonet
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  convex-data:
```

Start with:

```bash
docker-compose up -d
```

## Configuration

### Environment Variables

```bash
# docker-compose.yml environment section
environment:
  - JAVA_OPTS=-Xmx4g -XX:+UseG1GC
  - NETWORK=protonet
  - PEER_PORT=18888
  - REST_PORT=8080
  - LOG_LEVEL=info
```

### Configuration File

Mount custom configuration:

```yaml
volumes:
  - ./peer-config.edn:/app/config/peer-config.edn:ro
```

`peer-config.edn`:

```clojure
{:port 18888
 :rest-port 8080
 :store-path "/app/data/peer-store"
 :log-level :info
 :network :protonet}
```

### Peer Keys

Mount peer keys securely:

```yaml
volumes:
  - ./peer-keys.dat:/app/keys/peer-keys.dat:ro
```

**⚠️ Security**: Set restrictive file permissions (600) on host.

## Management

### Start/Stop

```bash
# Start
docker-compose start

# Stop
docker-compose stop

# Restart
docker-compose restart
```

### View Logs

```bash
# Follow logs
docker-compose logs -f peer

# Last 100 lines
docker-compose logs --tail=100 peer
```

### Check Status

```bash
# Container status
docker-compose ps

# Health check
curl http://localhost:8080/api/v1/health
```

## Monitoring

### Resource Usage

```bash
# Container stats
docker stats convex-peer

# Detailed info
docker inspect convex-peer
```

### Health Checks

Add to `docker-compose.yml`:

```yaml
services:
  peer:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

## Upgrading

### Pull New Image

```bash
# Pull latest
docker-compose pull

# Restart with new image
docker-compose up -d
```

### Backup Before Upgrade

```bash
# Backup data volume
docker run --rm \
  -v convex-data:/data \
  -v $(pwd):/backup \
  ubuntu tar czf /backup/convex-data-$(date +%Y%m%d).tar.gz /data
```

## Networking

### Custom Network

```yaml
networks:
  convex-net:
    driver: bridge

services:
  peer:
    networks:
      - convex-net
```

### Expose Ports

```yaml
ports:
  - "18888:18888"   # Peer protocol
  - "8080:8080"     # REST API
```

## Persistence

### Data Volumes

```yaml
volumes:
  convex-data:/app/data     # Peer state
  convex-logs:/app/logs     # Logs
```

### Backup Strategy

```bash
# Backup script
#!/bin/bash
docker-compose stop
docker run --rm \
  -v convex-data:/data \
  -v /backups:/backup \
  ubuntu tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data
docker-compose start
```

## Next Steps

- **[Hosting Options](hosting)** - Infrastructure requirements
- **[Security Guide](security)** - Secure your deployment
- **[Monitoring](troubleshooting#monitoring-and-diagnosis)** - Production monitoring

## Resources

- **[Docker Documentation](https://docs.docker.com/)**
- **[Docker Compose Reference](https://docs.docker.com/compose/)**
- **[Manual Deployment](manual-deployment)** - Alternative method
