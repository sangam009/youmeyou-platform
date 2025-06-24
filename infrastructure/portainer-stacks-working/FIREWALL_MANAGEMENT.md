# YouMeYou Platform - Firewall Access Management

This document explains how to manage firewall access for the YouMeYou staging platform using the automated script.

## Overview

The platform uses a security-first approach where:
- Only ports 80 (HTTP) and 443 (HTTPS) are exposed
- Access is restricted to specific IP addresses by default
- Nginx reverse proxy handles all routing to internal services
- Internal service ports (3001, 4000, 6000, etc.) are never exposed publicly

## Quick Start

### Update Your Current IP
```bash
./manage-firewall-access.sh update-ip
```

### Add a Custom IP Address
```bash
./manage-firewall-access.sh add-ip 203.0.113.1
./manage-firewall-access.sh add-ip 203.0.113.0/24  # For IP range
```

### List Current Access Rules
```bash
./manage-firewall-access.sh list
```

## Script Features

### 🔄 Dynamic IP Management
- **Auto-detect current IP**: Uses multiple IP detection services
- **Update firewall automatically**: Adds your current IP to allowed list
- **Smart duplicate handling**: Won't add the same IP twice

### 🎯 Custom IP Management
- **Add specific IPs**: Support for single IPs or CIDR ranges
- **Remove IPs**: Clean up old or unwanted IP addresses
- **IP validation**: Ensures proper IP format before adding

### 🌐 Public Access Control
- **Enable public access**: For demos, testing, or production launch
- **Confirmation prompts**: Prevents accidental public exposure
- **Easy disable**: Quickly restore IP-based restrictions

### 📊 Access Monitoring
- **List current rules**: See all allowed IPs and settings
- **Visual indicators**: Clear status of public vs restricted access
- **Detailed information**: Shows ports, priorities, and configurations

## Command Reference

| Command | Description | Example |
|---------|-------------|---------|
| `update-ip` | Allow access from your current IP | `./manage-firewall-access.sh update-ip` |
| `add-ip <IP>` | Add a custom IP or range | `./manage-firewall-access.sh add-ip 192.168.1.1` |
| `remove-ip <IP>` | Remove a specific IP | `./manage-firewall-access.sh remove-ip 192.168.1.1` |
| `enable-public` | Enable public access (with confirmation) | `./manage-firewall-access.sh enable-public` |
| `disable-public` | Disable public access | `./manage-firewall-access.sh disable-public` |
| `list` | Show current access rules | `./manage-firewall-access.sh list` |
| `delete` | Delete firewall rule completely | `./manage-firewall-access.sh delete` |
| `help` | Show help information | `./manage-firewall-access.sh help` |

## Common Use Cases

### 1. Working from Different Locations
When your IP changes (home, office, coffee shop):
```bash
./manage-firewall-access.sh update-ip
```

### 2. Team Access
Add team member's IP addresses:
```bash
./manage-firewall-access.sh add-ip 203.0.113.10  # John's IP
./manage-firewall-access.sh add-ip 203.0.113.20  # Sarah's IP
```

### 3. Office Network Access
Add entire office network:
```bash
./manage-firewall-access.sh add-ip 203.0.113.0/24
```

### 4. Demo or Presentation
Temporarily enable public access:
```bash
./manage-firewall-access.sh enable-public
# After demo:
./manage-firewall-access.sh disable-public
```

### 5. Clean Up Old IPs
Remove IPs that are no longer needed:
```bash
./manage-firewall-access.sh remove-ip 203.0.113.10
```

## Security Best Practices

### ✅ Recommended Practices
- **Regular IP updates**: Run `update-ip` when your IP changes
- **Minimal access**: Only add IPs that need access
- **Time-limited public access**: Disable public access after demos/testing
- **Regular cleanup**: Remove old team member IPs
- **Monitor access**: Use `list` command to review current rules

### ⚠️ Security Warnings
- **Public access**: Only enable when absolutely necessary
- **IP ranges**: Be careful with large CIDR ranges (e.g., /8, /16)
- **Temporary access**: Remember to remove temporary IPs
- **Team coordination**: Inform team when changing access rules

## Technical Details

### Firewall Rule Configuration
- **Rule Name**: `youmeyou-staging-web-access`
- **Network**: `youmeyou-staging-vpc`
- **Ports**: TCP 80, 443
- **Target Tags**: `youmeyou-staging`
- **Priority**: 1000

### IP Detection Services
The script tries multiple services to detect your current IP:
1. `ifconfig.me`
2. `icanhazip.com`
3. `ipinfo.io/ip`

### Architecture Integration
```
Internet → GCP Firewall → Nginx (ports 80/443) → Internal Services
                                ↓
                    ┌─────────────────────────┐
                    │  Nginx Reverse Proxy   │
                    └─────────────────────────┘
                                ↓
        ┌─────────────────┬─────────────────┬─────────────────┐
        │   Auth Service  │ Design Service  │ Payment Service │
        │   (port 3001)   │  (port 4000)    │  (port 6000)    │
        └─────────────────┴─────────────────┴─────────────────┘
```

## Troubleshooting

### Common Issues

#### 1. Script Can't Detect IP
```bash
# Error: Failed to detect current public IP
# Solution: Check internet connection or manually add IP
./manage-firewall-access.sh add-ip YOUR_CURRENT_IP
```

#### 2. Permission Denied
```bash
# Error: Permission denied
# Solution: Make script executable
chmod +x manage-firewall-access.sh
```

#### 3. GCloud Authentication
```bash
# Error: Authentication required
# Solution: Login to gcloud
gcloud auth login
gcloud config set project youmeyou
```

#### 4. Can't Access Platform
```bash
# Check current firewall rules
./manage-firewall-access.sh list

# Update to your current IP
./manage-firewall-access.sh update-ip
```

### Verification Steps

1. **Check firewall rule exists**:
   ```bash
   gcloud compute firewall-rules describe youmeyou-staging-web-access
   ```

2. **Test platform access**:
   ```bash
   curl -I https://staging.youmeyou.ai
   ```

3. **Check your current IP**:
   ```bash
   curl -s ifconfig.me
   ```

## Advanced Configuration

### Customizing the Script
Edit the configuration section in the script:
```bash
# Configuration
PROJECT_ID="youmeyou"
NETWORK="youmeyou-staging-vpc"
TARGET_TAGS="youmeyou-staging"
RULE_NAME="youmeyou-staging-web-access"
PORTS="tcp:80,tcp:443"
```

### Integration with CI/CD
You can use this script in automated deployments:
```bash
# In your deployment script
./manage-firewall-access.sh enable-public
# Deploy and test
./manage-firewall-access.sh disable-public
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify GCP authentication and permissions
3. Ensure the VM and firewall rule exist
4. Check platform logs if access issues persist

---

**Remember**: Always prioritize security by using the minimal access necessary and disabling public access when not needed. 