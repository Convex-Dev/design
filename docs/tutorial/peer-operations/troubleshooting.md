---
sidebar_position: 7
---

# Troubleshooting

Common issues and solutions for Convex peer operations.

## Connection Issues

### Cannot Connect to Peer

**Symptoms**: Client cannot reach peer endpoint

**Check**:
```bash
# Test peer port
telnet peer.example.com 18888

# Test REST API
curl http://peer.example.com:8080/api/v1/health
```

**Common Causes**:
- Firewall blocking ports
- Peer not running
- Incorrect hostname/IP
- Network connectivity

**Solutions**:
1. Verify peer is running: `systemctl status convex-peer`
2. Check firewall rules: `sudo ufw status`
3. Verify port binding: `netstat -tlnp | grep 18888`
4. Check logs: `journalctl -u convex-peer`

### Peer Cannot Sync

**Symptoms**: Consensus point not advancing

**Check Sync Status**:
```bash
curl http://localhost:8080/api/v1/query \
  -d '{"source":"*state*"}'
```

**Common Causes**:
- No peers connected
- Network issues
- Corrupted state
- Insufficient resources

**Solutions**:
1. Check peer connections
2. Verify bootstrap peers configured
3. Check network connectivity
4. Review resource usage (CPU, memory, disk)
5. Consider state reset if corrupted

## Performance Issues

### High Latency

**Symptoms**: Slow query/transaction responses

**Diagnose**:
```bash
# Check system load
top

# Check disk I/O
iostat -x 1

# Check network
iftop
```

**Solutions**:
- Increase JVM heap: `-Xmx8g`
- Upgrade to SSD storage
- Increase CPU/RAM
- Optimize network

### High Memory Usage

**Symptoms**: Peer consuming excessive RAM

**Check Memory**:
```bash
# JVM memory
jmap -heap <pid>

# System memory
free -h
```

**Solutions**:
- Increase JVM heap if needed
- Check for memory leaks (monitor over time)
- Review cache configuration
- Consider heap dump analysis

### Slow State Access

**Symptoms**: Database queries slow

**Check**:
- Disk I/O performance
- Storage type (HDD vs SSD)
- Available disk space
- Database corruption

**Solutions**:
- Migrate to faster storage
- Clear unnecessary logs
- Verify database integrity
- Consider re-sync from peers

## Consensus Issues

### Not Participating in Consensus

**Symptoms**: Peer not producing blocks/proposals

**Check**:
1. Verify stake amount sufficient
2. Check peer registration
3. Verify peer keys correct
4. Check consensus logs

**Solutions**:
- Review [staking guide](staking)
- Verify peer metadata
- Check stake controller permissions
- Review consensus configuration

### Fork Detection

**Symptoms**: Different state than network

**Check Genesis**:
```bash
curl http://localhost:8080/api/v1/query \
  -d '{"source":"*genesis*"}'
```

**Solutions**:
1. Verify correct network
2. Check genesis hash matches
3. Consider full resync
4. Verify no local modifications

## Deployment Issues

### Service Won't Start

**Check Logs**:
```bash
# Systemd
journalctl -u convex-peer -n 100

# Docker
docker logs convex-peer
```

**Common Causes**:
- Port already in use
- Incorrect configuration
- Missing dependencies
- Permission issues
- Corrupted data

**Solutions**:
1. Check port availability: `lsof -i :18888`
2. Validate configuration file
3. Verify file permissions
4. Check Java version: `java -version`
5. Review error messages in logs

### Crashes/Restarts

**Check**:
```bash
# Recent crashes
journalctl -u convex-peer | grep -i crash

# OOM killer
dmesg | grep -i "out of memory"
```

**Solutions**:
- Increase JVM heap
- Check for memory leaks
- Review error logs
- Update to latest version
- Check system resources

## Security Issues

### Unauthorized Access Attempts

**Check Logs**:
```bash
# Failed authentication
journalctl -u convex-peer | grep -i "unauthorized"

# Network connections
netstat -an | grep 18888
```

**Solutions**:
- Review firewall rules
- Implement IP whitelisting
- Check for exposed services
- Review [security guide](security)

### Compromised Keys

**If peer keys compromised**:
1. Immediately stop peer
2. Use stake controller to withdraw stake
3. Generate new peer keys
4. Re-register with new keys
5. Investigate compromise source

## Data Issues

### State Corruption

**Symptoms**: Errors reading state, crashes

**Solutions**:
1. Stop peer
2. Backup current data
3. Attempt state repair
4. If repair fails, full resync
5. Restore from backup if available

### Disk Space Full

**Check**:
```bash
df -h /opt/convex
```

**Solutions**:
- Clear old logs
- Rotate logs more frequently
- Increase disk space
- Move data to larger volume

## Network Issues

### High Bandwidth Usage

**Monitor**:
```bash
# Real-time bandwidth
iftop

# Historical usage
vnstat
```

**Solutions**:
- Limit peer connections
- Check for DDoS attack
- Optimize sync settings
- Review traffic patterns

### Firewall Blocking

**Test Connectivity**:
```bash
# From external
telnet peer.example.com 18888

# Check firewall
sudo iptables -L -n
```

**Solutions**:
- Update firewall rules
- Check security groups (cloud)
- Verify NAT configuration
- Test from multiple locations

## Monitoring and Diagnosis

### Health Checks

```bash
#!/bin/bash
# health-check.sh

# Check if peer is responding
response=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:8080/api/v1/health)

if [ "$response" != "200" ]; then
  echo "ERROR: Peer not responding"
  exit 1
fi

# Check consensus advancing
state=$(curl -s http://localhost:8080/api/v1/query \
  -d '{"source":"*state*"}' | jq -r '.value')

if [ -z "$state" ]; then
  echo "ERROR: Cannot query state"
  exit 1
fi

echo "OK: Peer healthy, state: $state"
```

### Log Analysis

```bash
# Error summary
journalctl -u convex-peer --since "1 hour ago" | \
  grep ERROR | sort | uniq -c | sort -rn

# Consensus issues
journalctl -u convex-peer | grep -i consensus | tail -50

# Performance metrics
journalctl -u convex-peer | grep -i "performance\|latency"
```

## Getting Help

### Information to Collect

When seeking help, provide:
1. Peer version: `java -jar convex.jar version`
2. Operating system and version
3. Hardware specifications
4. Configuration file (redact sensitive data)
5. Recent logs (last 100 lines)
6. Genesis hash being used
7. What you were trying to do
8. What actually happened

### Support Channels

- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** - `#peer-operations` channel
- **[GitHub Issues](https://github.com/Convex-Dev/convex/issues)** - Bug reports
- **[Forum](/)** - Detailed discussions

## Next Steps

- **[Security Guide](security)** - Prevent issues
- **[Monitoring](/)** - Proactive monitoring
- **[Manual Deployment](manual-deployment)** - Deployment guide
- **[Docker Deployment](docker-deployment)** - Container deployment
