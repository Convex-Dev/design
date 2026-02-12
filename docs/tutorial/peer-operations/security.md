---
sidebar_position: 8
---

# Security Considerations

Security best practices for operating Convex peer nodes.

## Overview

Secure peer operation requires:
- 🔐 Key management
- 🛡️ Network security
- 👁️ Monitoring and alerting
- 🔄 Regular updates
- 📋 Incident response planning

## Key Management

### Peer Keys

**Protection**:
```bash
# Restrict permissions
chmod 600 /opt/convex/peer-keys.dat
chown convex:convex /opt/convex/peer-keys.dat

# Verify permissions
ls -la /opt/convex/peer-keys.dat
# Should show: -rw------- 1 convex convex
```

**Backup**:
```bash
# Encrypted backup
gpg --encrypt --recipient admin@example.com peer-keys.dat

# Store in multiple secure locations
# - Encrypted cloud storage
# - Hardware security module
# - Offline cold storage
```

**Rotation**:
- Rotate peer keys annually (if supported)
- Generate new keys if compromise suspected
- Keep backup of old keys for recovery

### Stake Controller Keys

**Separation**:
- Never store on same system as peer keys
- Use hardware wallet for high-value stakes
- Consider multi-signature for large stakes

**Cold Storage**:
```bash
# Generate offline
# Transfer only public key to peer
# Sign transactions on air-gapped system
```

**Access Control**:
- Limit who can access stake controller keys
- Use principle of least privilege
- Audit access logs regularly

## Network Security

### Firewall Configuration

**UFW (Ubuntu)**:
```bash
# Default deny
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow peer protocol
sudo ufw allow 18888/tcp

# Allow REST API (optional, if public)
sudo ufw allow 8080/tcp

# Enable firewall
sudo ufw enable
```

**iptables**:
```bash
# Allow peer protocol
iptables -A INPUT -p tcp --dport 18888 -j ACCEPT

# Allow REST API from specific IP
iptables -A INPUT -p tcp --dport 8080 -s 192.168.1.0/24 -j ACCEPT

# Drop everything else
iptables -A INPUT -j DROP
```

### SSH Hardening

**Best Practices**:
```bash
# /etc/ssh/sshd_config

# Disable root login
PermitRootLogin no

# Use key-based auth only
PasswordAuthentication no
PubkeyAuthentication yes

# Limit users
AllowUsers convex admin

# Change default port (optional)
Port 2222
```

### SSL/TLS for REST API

**Using Nginx Reverse Proxy**:
```nginx
server {
    listen 443 ssl http2;
    server_name peer.example.com;

    ssl_certificate /etc/ssl/certs/peer.crt;
    ssl_certificate_key /etc/ssl/private/peer.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Operating System Security

### System Updates

**Automatic Updates** (Ubuntu):
```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades

# Configure
sudo dpkg-reconfigure -plow unattended-upgrades

# /etc/apt/apt.conf.d/50unattended-upgrades
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
```

### User Security

**Create Dedicated User**:
```bash
# Create system user
sudo useradd -r -s /bin/false convex

# Limit privileges
# - No shell access
# - No sudo rights
# - Only peer files access
```

**Audit Logging**:
```bash
# Enable auditd
sudo apt install auditd

# Monitor peer files
sudo auditctl -w /opt/convex/ -p wa -k convex-watch
```

## Application Security

### Java Security Manager

**Enable Security Manager**:
```bash
java -Djava.security.manager \
  -Djava.security.policy=/opt/convex/security.policy \
  -jar convex.jar peer start
```

**Policy File** (`security.policy`):
```java
grant codeBase "file:/opt/convex/convex.jar" {
  permission java.net.SocketPermission "*:18888", "connect,accept,listen";
  permission java.net.SocketPermission "*:8080", "connect,accept,listen";
  permission java.io.FilePermission "/opt/convex/data/-", "read,write";
};
```

### JVM Hardening

**Security Options**:
```bash
java -Xmx4g \
  -Djava.security.egd=file:/dev/urandom \
  -Djavax.net.ssl.trustStore=/opt/convex/truststore.jks \
  -jar convex.jar peer start
```

## Monitoring and Alerting

### Security Monitoring

**Monitor**:
- Failed authentication attempts
- Unusual network activity
- Unexpected peer connections
- File system changes
- Resource usage spikes

**Log Monitoring**:
```bash
# Watch for security events
sudo journalctl -u convex-peer -f | grep -i "security\|auth\|error"

# Alert on suspicious activity
# Integrate with monitoring system (Prometheus, Datadog, etc.)
```

### Intrusion Detection

**Fail2ban**:
```bash
# Install
sudo apt install fail2ban

# Configure for SSH
# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600
```

**AIDE (File Integrity)**:
```bash
# Install
sudo apt install aide

# Initialize database
sudo aideinit

# Run checks
sudo aide --check
```

## Backup Security

### Encrypted Backups

```bash
# Encrypt with GPG
tar czf - /opt/convex/data | \
  gpg --encrypt --recipient backup@example.com > \
  backup-$(date +%Y%m%d).tar.gz.gpg

# Upload to secure storage
aws s3 cp backup-*.tar.gz.gpg s3://secure-bucket/ \
  --sse AES256
```

### Backup Verification

```bash
# Regular backup tests
# 1. Download backup
# 2. Decrypt
# 3. Extract
# 4. Verify integrity
# 5. Test restore procedure
```

## Incident Response

### Response Plan

**Preparation**:
1. Document incident response procedures
2. Identify key personnel
3. Maintain contact information
4. Test response plan quarterly

**Detection**:
- Automated monitoring alerts
- Log analysis
- Community reports
- Anomaly detection

**Response Steps**:
1. Assess severity
2. Contain threat
3. Investigate root cause
4. Remediate
5. Document incident
6. Post-mortem review

### Compromise Response

**If Peer Compromised**:
1. Immediately stop peer
2. Disconnect from network
3. Preserve logs for analysis
4. Use stake controller (from secure system) to withdraw stake
5. Investigate compromise vector
6. Rebuild from clean state
7. Generate new peer keys
8. Implement additional security measures

**If Stake Controller Compromised**:
1. Attempt emergency stake withdrawal (if possible)
2. Alert community immediately
3. Document compromise for network consideration
4. Legal reporting (if applicable)

## Compliance and Best Practices

### Security Checklist

**Pre-Deployment**:
- [ ] Keys generated securely offline
- [ ] Keys backed up and tested
- [ ] Firewall configured
- [ ] SSH hardened
- [ ] System updates enabled
- [ ] Monitoring configured
- [ ] Incident response plan documented

**Ongoing**:
- [ ] Weekly security updates applied
- [ ] Monthly backup verification
- [ ] Quarterly security audit
- [ ] Annual key rotation review
- [ ] Regular log review
- [ ] Performance monitoring

### Audit Logging

**Enable Comprehensive Logging**:
```bash
# System logs
sudo journalctl -u convex-peer

# Security logs
sudo journalctl -u ssh

# Audit logs
sudo ausearch -k convex-watch
```

**Log Retention**:
- Application logs: 30 days
- Security logs: 90 days
- Audit logs: 1 year

## Cloud Security

### AWS Security

**Security Groups**:
```hcl
# Terraform example
resource "aws_security_group" "convex_peer" {
  name = "convex-peer"

  ingress {
    from_port   = 18888
    to_port     = 18888
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Restrict REST API
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]  # Internal only
  }
}
```

**IAM Roles**:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:PutObject",
      "s3:GetObject"
    ],
    "Resource": "arn:aws:s3:::convex-backups/*"
  }]
}
```

### GCP Security

**Firewall Rules**:
```bash
# Allow peer protocol
gcloud compute firewall-rules create convex-peer \
  --allow tcp:18888 \
  --source-ranges 0.0.0.0/0

# Allow REST API from internal
gcloud compute firewall-rules create convex-api \
  --allow tcp:8080 \
  --source-ranges 10.0.0.0/8
```

## References

- **[OWASP Top 10](https://owasp.org/www-project-top-ten/)** - Security risks
- **[CIS Benchmarks](https://www.cisecurity.org/)** - Hardening guidelines
- **[NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)** - Security framework

## Next Steps

- **[Monitoring](troubleshooting#monitoring-and-diagnosis)** - Set up monitoring
- **[Troubleshooting](troubleshooting)** - Common security issues
- **[Deployment Guides](manual-deployment)** - Secure deployment

## Resources

- **[Discord Security Channel](https://discord.com/invite/xfYGq4CT7v)** - Security discussions
- **[Security Advisories](/)** - Network security updates
- **[Bug Bounty](/)** - Report vulnerabilities
