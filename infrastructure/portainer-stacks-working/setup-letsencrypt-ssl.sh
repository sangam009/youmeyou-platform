#!/bin/bash

# Let's Encrypt SSL Setup Script for YouMeYou Platform
# This script sets up wildcard SSL certificates using DNS challenge

set -e

echo "🔒 Setting up Let's Encrypt SSL for YouMeYou Platform"
echo "================================================="

# Configuration
DOMAIN="youmeyou.ai"
EMAIL="admin@youmeyou.ai"  # Replace with your actual email
VM_IP="34.93.209.77"

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Email: $EMAIL"
echo "   VM IP: $VM_IP"
echo ""

# Step 1: Install Certbot and DNS plugin
echo "📦 Installing Certbot and DNS plugins..."
sudo apt update
sudo apt install -y certbot python3-certbot-dns-cloudflare python3-certbot-dns-route53

# Step 2: Create DNS credentials file (you'll need to configure this)
echo "🔧 Setting up DNS credentials..."
sudo mkdir -p /etc/letsencrypt
sudo tee /etc/letsencrypt/dns-credentials.ini > /dev/null <<EOF
# DNS API credentials for Let's Encrypt DNS challenge
# You need to configure this based on your DNS provider

# For Hostinger (if they support API):
# dns_hostinger_api_key = your-api-key

# For Cloudflare (recommended alternative):
# dns_cloudflare_email = your-email@example.com
# dns_cloudflare_api_key = your-cloudflare-api-key

# For manual DNS challenge (fallback):
# This will require manual DNS record creation
EOF

sudo chmod 600 /etc/letsencrypt/dns-credentials.ini

echo "⚠️  IMPORTANT: You need to configure DNS credentials in /etc/letsencrypt/dns-credentials.ini"
echo ""

# Step 3: Generate wildcard certificate using DNS challenge
echo "🎯 Generating wildcard SSL certificate..."
echo "   This will create certificates for:"
echo "   - $DOMAIN"
echo "   - *.$DOMAIN (all subdomains)"
echo ""

# Manual DNS challenge (works with any DNS provider)
sudo certbot certonly \
  --manual \
  --preferred-challenges=dns \
  --email $EMAIL \
  --server https://acme-v02.api.letsencrypt.org/directory \
  --agree-tos \
  --manual-public-ip-logging-ok \
  -d $DOMAIN \
  -d "*.$DOMAIN"

echo ""
echo "✅ SSL Certificate generated successfully!"
echo ""

# Step 4: Create certificate directory for Docker
echo "📁 Setting up certificate directory for Docker..."
sudo mkdir -p /home/ubuntu/youmeyou-stacks/ssl-certs
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
sudo chown ubuntu:ubuntu /home/ubuntu/youmeyou-stacks/ssl-certs/*

echo "✅ Certificates copied to Docker directory"
echo ""

# Step 5: Set up auto-renewal
echo "🔄 Setting up auto-renewal..."
sudo tee /etc/cron.d/letsencrypt-renewal > /dev/null <<EOF
# Auto-renew Let's Encrypt certificates
0 2 * * * root certbot renew --quiet && systemctl reload nginx
EOF

echo "✅ Auto-renewal configured"
echo ""

# Step 6: Display certificate information
echo "📋 Certificate Information:"
echo "   Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "   Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "   Docker Cert: /home/ubuntu/youmeyou-stacks/ssl-certs/fullchain.pem"
echo "   Docker Key:  /home/ubuntu/youmeyou-stacks/ssl-certs/privkey.pem"
echo ""

echo "🎉 Let's Encrypt SSL setup completed!"
echo ""
echo "📝 Next Steps:"
echo "1. Update nginx configuration to use SSL certificates"
echo "2. Update Portainer stacks to use HTTPS"
echo "3. Test SSL certificate with: openssl s_client -connect $DOMAIN:443"
echo ""
echo "🔄 Certificate will auto-renew every 60 days" 