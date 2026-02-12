---
sidebar_position: 5
---

# Hosting Options

Infrastructure requirements and hosting options for Convex peers.

## Hardware Requirements

### Minimum Specifications

**Suitable for**: Testnet participation, development

- **CPU**: 4 cores (2.5+ GHz)
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Network**: 100 Mbps symmetric
- **Uptime**: 95%+

### Recommended Specifications

**Suitable for**: Production (Protonet), high stake

- **CPU**: 8+ cores (3.0+ GHz)
- **RAM**: 16+ GB
- **Storage**: 500+ GB NVMe SSD
- **Network**: 1 Gbps symmetric
- **Uptime**: 99.9%+

### Enterprise Specifications

**Suitable for**: Major validators, high availability

- **CPU**: 16+ cores (3.5+ GHz)
- **RAM**: 32+ GB
- **Storage**: 1+ TB NVMe SSD (RAID 10)
- **Network**: 10 Gbps symmetric
- **Uptime**: 99.99%+
- **Redundancy**: Hot standby peer

## Storage Considerations

### Storage Requirements

**Growth Rate**:
- State: ~10 GB/year (estimated)
- Logs: ~1 GB/month
- Backups: 2-3x current state

**Performance**:
- IOPS: 10,000+ recommended
- Latency: &lt;1ms for state access
- Type: NVMe SSD strongly recommended

### Storage Configuration

```bash
# Recommended filesystem layout
/opt/convex/
├── data/          # 500 GB+ (state data)
├── logs/          # 50 GB (application logs)
└── backups/       # 1 TB (backups)
```

## Network Requirements

### Bandwidth

**Minimum**:
- Download: 100 Mbps
- Upload: 100 Mbps
- Monthly: ~500 GB

**Recommended**:
- Download: 1 Gbps
- Upload: 1 Gbps
- Monthly: ~2 TB

### Ports

**Required**:
- `18888` - Peer protocol (TCP, inbound/outbound)
- `8080` - REST API (TCP, optional public)

**Firewall Rules**:

```bash
# Ubuntu/Debian with UFW
sudo ufw allow 18888/tcp   # Peer protocol
sudo ufw allow 8080/tcp    # REST API (optional)
sudo ufw enable
```

### IP Address

**Requirements**:
- Static IP address (required)
- IPv4 (required)
- IPv6 (recommended)
- Reverse DNS configured (recommended)

## Cloud Providers

### AWS (Amazon Web Services)

**Recommended Instance**: `c5.2xlarge` or higher

**Configuration**:
```
Type: c5.2xlarge
CPU: 8 vCPUs
RAM: 16 GB
Storage: 500 GB EBS (gp3, 10,000 IOPS)
Network: Up to 10 Gbps
Cost: ~$300/month
```

**Setup**:
1. Launch EC2 instance (Ubuntu 22.04 LTS)
2. Attach EBS volume for data
3. Configure Security Group (ports 18888, 8080)
4. Allocate Elastic IP
5. Follow [Manual Deployment](manual-deployment) guide

**Considerations**:
- ✅ Mature platform, extensive docs
- ✅ Good global availability
- ⚠️ Higher cost than alternatives
- ⚠️ Complex pricing model

### Google Cloud Platform (GCP)

**Recommended Instance**: `n2-standard-8` or higher

**Configuration**:
```
Type: n2-standard-8
CPU: 8 vCPUs
RAM: 32 GB
Storage: 500 GB SSD persistent disk
Network: 16 Gbps
Cost: ~$350/month
```

**Setup**:
1. Create Compute Engine instance
2. Attach persistent SSD
3. Configure VPC firewall rules
4. Reserve static IP
5. Follow [Manual Deployment](manual-deployment) guide

**Considerations**:
- ✅ Competitive pricing
- ✅ Strong network performance
- ✅ Good regional coverage

### Microsoft Azure

**Recommended Instance**: `Standard_D8s_v5`

**Configuration**:
```
Type: Standard_D8s_v5
CPU: 8 vCPUs
RAM: 32 GB
Storage: 512 GB Premium SSD
Network: 12.5 Gbps
Cost: ~$400/month
```

**Setup**:
1. Create Virtual Machine (Ubuntu)
2. Attach Premium SSD
3. Configure Network Security Group
4. Reserve public IP
5. Follow deployment guide

**Considerations**:
- ✅ Enterprise integration
- ✅ Hybrid cloud options
- ⚠️ Higher cost

### DigitalOcean

**Recommended Droplet**: `CPU-Optimized 8GB`

**Configuration**:
```
Type: CPU-Optimized
CPU: 8 vCPUs
RAM: 16 GB
Storage: 100 GB SSD
Network: 8 TB transfer
Cost: ~$240/month
```

**Setup**:
1. Create Droplet (Ubuntu 22.04)
2. Attach Block Storage volume
3. Configure firewall
4. Reserve IP address
5. Follow deployment guide

**Considerations**:
- ✅ Simple pricing
- ✅ Easy to use
- ✅ Good value
- ⚠️ Limited regions

### Hetzner

**Recommended Server**: `CPX41` (Cloud) or `AX52` (Dedicated)

**Cloud Configuration**:
```
Type: CPX41
CPU: 8 vCPUs
RAM: 16 GB
Storage: 240 GB NVMe
Network: 20 TB traffic
Cost: ~$50/month
```

**Considerations**:
- ✅ Excellent value
- ✅ Good performance
- ⚠️ Limited to Europe
- ⚠️ Strict abuse policies

### OVH Cloud

**Recommended**: `c2-15` or dedicated server

**Configuration**:
```
Type: c2-15
CPU: 8 vCores
RAM: 15 GB
Storage: 200 GB NVMe
Network: 1 Gbps
Cost: ~$70/month
```

**Considerations**:
- ✅ Competitive pricing
- ✅ Good European presence
- ⚠️ Complex interface

## Dedicated Servers

### When to Use Dedicated

**Advantages**:
- Better performance per dollar
- Predictable costs
- No noisy neighbors
- Full hardware control

**Use dedicated when**:
- Running multiple peers
- High stake value
- Maximum performance needed
- Cost optimization important

### Providers

**Hetzner Dedicated**:
- Excellent value
- Fast provisioning
- European locations
- ~$50-200/month

**OVH Dedicated**:
- Competitive pricing
- Global locations
- Good hardware options
- ~$60-300/month

**Leaseweb**:
- Flexible configurations
- Global presence
- Custom hardware
- ~$100-500/month

## Colocation

### When to Consider

**Suitable for**:
- Multiple peers
- Maximum control
- Cost optimization at scale
- Custom hardware requirements

**Requirements**:
- Own hardware
- Colocation facility
- Remote hands service
- Network connectivity

**Cost Considerations**:
- Hardware: $2,000-10,000 upfront
- Rack space: $100-500/month per U
- Power: $50-200/month
- Network: $100-1,000/month

## Geographic Distribution

### Location Selection

**Consider**:
- Network latency to other peers
- Legal jurisdiction
- Data sovereignty requirements
- Cost and availability

**Recommended Regions**:
- North America (East Coast, West Coast)
- Europe (Frankfurt, London, Amsterdam)
- Asia Pacific (Singapore, Tokyo)

### Multi-Region Deployment

For high availability:
1. Primary peer in main region
2. Hot standby in different region
3. Automated failover
4. Shared stake control

## Kubernetes Deployment

### When to Use K8s

**Suitable for**:
- Running multiple peers
- Existing K8s infrastructure
- Advanced orchestration needs
- Team familiar with K8s

**Basic Deployment**:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: convex-peer
spec:
  serviceName: convex-peer
  replicas: 1
  selector:
    matchLabels:
      app: convex-peer
  template:
    metadata:
      labels:
        app: convex-peer
    spec:
      containers:
      - name: peer
        image: convex/convex:latest
        ports:
        - containerPort: 18888
        - containerPort: 8080
        resources:
          requests:
            cpu: 4
            memory: 8Gi
          limits:
            cpu: 8
            memory: 16Gi
        volumeMounts:
        - name: data
          mountPath: /app/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 500Gi
```

## Cost Optimization

### Tips for Reducing Costs

1. **Right-size resources**: Start smaller, scale as needed
2. **Use spot/preemptible instances**: For testnets only
3. **Reserved instances**: Commit for 1-3 years (30-70% savings)
4. **Monitor usage**: Identify waste, optimize
5. **Compare providers**: Benchmark cost vs performance

### Cost Estimation

**Monthly Cloud Costs (USD)**:
- Minimum spec: $100-150
- Recommended spec: $250-400
- Enterprise spec: $500-1,000+

**Monthly Dedicated Costs (USD)**:
- Entry level: $50-100
- Mid-range: $100-300
- High-end: $300-1,000+

## Next Steps

- **[Manual Deployment](manual-deployment)** - Install on your infrastructure
- **[Docker Deployment](docker-deployment)** - Container-based deployment
- **[Security Guide](security)** - Secure your infrastructure
- **[Monitoring](troubleshooting#monitoring-and-diagnosis)** - Production monitoring

## Resources

- **[AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/)**
- **[GCP Pricing Calculator](https://cloud.google.com/products/calculator)**
- **[Hetzner Server Finder](https://www.hetzner.com/dedicated-rootserver)**
- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** - Get recommendations
