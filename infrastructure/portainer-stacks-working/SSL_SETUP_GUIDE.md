# SSL Certificate Setup Guide - Hostinger to YouMeYou Platform

## Phase 1: Purchase SSL Certificate from Hostinger

### Step 1: Access Hostinger Control Panel
1. Login to [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Go to **Domains** → **youmeyou.ai**
3. Navigate to **SSL Certificates** section

### Step 2: Choose SSL Certificate
**Recommended Option: Positive SSL Wildcard**
- **Price**: ~$50/year
- **Coverage**: `*.youmeyou.ai` (all subdomains)
- **Validity**: 1 year
- **Browser Trust**: Full trust, no warnings

### Step 3: Generate Certificate Signing Request (CSR)
1. In Hostinger panel, click **"Generate CSR"**
2. Fill in the details:
   ```
   Common Name: *.youmeyou.ai
   Organization: Your Company Name
   Organization Unit: IT Department
   City: Your City
   State: Your State
   Country: Your Country Code (e.g., IN for India)
   Email: your-email@youmeyou.ai
   ```
3. **Save the CSR** and **Private Key** - you'll need both

### Step 4: Complete SSL Purchase
1. Submit the CSR to Hostinger
2. Complete domain validation (usually email verification)
3. Wait for certificate issuance (usually 5-15 minutes)

### Step 5: Download Certificate Files
Once issued, download these files:
- `youmeyou_ai.crt` (Main certificate)
- `youmeyou_ai.ca-bundle` (Intermediate certificates)
- `youmeyou_ai.key` (Private key - if not saved from CSR step)

## Phase 2: Install SSL on Your VM

### Step 1: Upload Certificate Files to VM
```bash
# Create SSL directory on VM
ssh ubuntu@34.93.209.77 "mkdir -p /home/ubuntu/youmeyou-stacks/ssl-certs"

# Upload certificate files
scp youmeyou_ai.crt ubuntu@34.93.209.77:/home/ubuntu/youmeyou-stacks/ssl-certs/
scp youmeyou_ai.ca-bundle ubuntu@34.93.209.77:/home/ubuntu/youmeyou-stacks/ssl-certs/
scp youmeyou_ai.key ubuntu@34.93.209.77:/home/ubuntu/youmeyou-stacks/ssl-certs/
```

### Step 2: Create Combined Certificate File
```bash
# SSH to VM
ssh ubuntu@34.93.209.77

# Combine certificate with intermediate certificates
cd /home/ubuntu/youmeyou-stacks/ssl-certs
cat youmeyou_ai.crt youmeyou_ai.ca-bundle > youmeyou_ai_combined.crt
```

### Step 3: Update Nginx Configuration
The nginx configuration will be updated to use SSL certificates with proper SSL settings.

## Phase 3: Update DNS and Gateway Configuration

### Step 1: Update DNS Records
In Hostinger DNS management, ensure these A records point to your VM:
```
Type: A, Name: *.youmeyou.ai, Value: 34.93.209.77
Type: A, Name: youmeyou.ai, Value: 34.93.209.77
```

### Step 2: Update Gateway Stack
The gateway stack will be updated to:
- Listen on port 443 (HTTPS)
- Use SSL certificates
- Redirect HTTP to HTTPS
- Proper SSL configuration for security

## Phase 4: Test SSL Installation

### Step 1: Test SSL Certificate
```bash
# Test SSL certificate
openssl s_client -connect youmeyou.ai:443 -servername youmeyou.ai

# Test subdomain
openssl s_client -connect portainer-staging.youmeyou.ai:443 -servername portainer-staging.youmeyou.ai
```

### Step 2: Browser Test
- Visit `https://youmeyou.ai` - should show green lock
- Visit `https://portainer-staging.youmeyou.ai` - should show green lock
- No browser security warnings

## Security Benefits

✅ **Full Browser Trust** - No security warnings
✅ **Wildcard Coverage** - All subdomains protected
✅ **Docker Registry Access** - Portainer can access HTTPS registry
✅ **Professional Appearance** - Green lock in browser
✅ **SEO Benefits** - HTTPS is ranking factor

## Cost Breakdown

- **Hostinger Wildcard SSL**: ~$50/year
- **Alternative Free Options**: Let's Encrypt (requires more setup)
- **Enterprise Options**: $200-500/year (unnecessary for your use case)

## Next Steps

1. Purchase SSL certificate from Hostinger
2. Generate CSR and complete validation
3. Download certificate files
4. Follow installation guide above
5. Update nginx configuration
6. Test SSL installation

This approach provides the most reliable SSL solution with minimal browser warnings and full compatibility with Docker/Portainer HTTPS requirements. 