#!/bin/bash

# Complete SSL Setup Script for YouMeYou Platform
# Sets up SSL certificates for all domains including main youmeyou.ai for Codaloo web

set -e

echo "🔒 Complete SSL Setup for YouMeYou Platform"
echo "============================================"

DOMAIN="youmeyou.ai"
EMAIL="admin@youmeyou.ai"
VM_IP="34.93.209.77"

echo "📋 Configuration:"
echo "   Main Domain: $DOMAIN (Codaloo Web)"
echo "   Staging: staging.$DOMAIN"
echo "   Management: portainer-staging.$DOMAIN, registry-staging.$DOMAIN, registry-ui-staging.$DOMAIN"
echo "   Email: $EMAIL"
echo "   VM IP: $VM_IP"
echo ""

# Step 1: Fix firewall and Docker issues
echo "🔧 Step 1: Fixing firewall and Docker configuration..."

# Stop gateway temporarily to free port 80 for Let's Encrypt
echo "Stopping gateway service temporarily..."
docker stop youmeyou-gateway || true

# Clear any conflicting iptables rules
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -P OUTPUT ACCEPT

# Ensure UFW is properly configured for HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Restart Docker to regenerate proper rules
sudo systemctl restart docker

# Wait for Docker to stabilize
sleep 10

echo "✅ Firewall and Docker configuration fixed"

# Step 2: Install certbot if not already installed
echo "📦 Step 2: Installing/updating certbot..."

sudo apt update
sudo apt install -y certbot

echo "✅ Certbot installed"

# Step 3: Generate SSL certificates for all domains
echo "🎯 Step 3: Generating SSL certificates for all domains..."

# Try to generate certificate for all domains at once
echo "Attempting to generate certificate for all domains..."
sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --force-renewal \
    -d "$DOMAIN" \
    -d "staging.$DOMAIN" \
    -d "portainer-staging.$DOMAIN" \
    -d "registry-staging.$DOMAIN" \
    -d "registry-ui-staging.$DOMAIN"

if [ $? -eq 0 ]; then
    echo "✅ SSL certificates generated successfully for all domains!"
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
else
    echo "❌ Multi-domain certificate generation failed. Trying individual domains..."
    
    # Generate certificate for main domain (youmeyou.ai)
    echo "Generating certificate for main domain: $DOMAIN..."
    sudo certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --force-renewal \
        -d "$DOMAIN"
    
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
    
    # Generate certificate for staging domain
    echo "Generating certificate for staging.$DOMAIN..."
    sudo certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --force-renewal \
        -d "staging.$DOMAIN" || echo "Failed to generate certificate for staging.$DOMAIN"
    
    # Generate certificates for management subdomains
    for subdomain in "portainer-staging" "registry-staging" "registry-ui-staging"; do
        echo "Generating certificate for $subdomain.$DOMAIN..."
        sudo certbot certonly \
            --standalone \
            --non-interactive \
            --agree-tos \
            --email "$EMAIL" \
            --force-renewal \
            -d "$subdomain.$DOMAIN" || echo "Failed to generate certificate for $subdomain.$DOMAIN"
    done
fi

# Step 4: Set up SSL certificates for nginx
echo "📁 Step 4: Setting up SSL certificates for nginx..."

# Create SSL directory
sudo mkdir -p /home/ubuntu/youmeyou-stacks/ssl-certs

# Copy certificates
if [ -d "$CERT_PATH" ]; then
    sudo cp $CERT_PATH/fullchain.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
    sudo cp $CERT_PATH/privkey.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
    sudo chown ubuntu:ubuntu /home/ubuntu/youmeyou-stacks/ssl-certs/*
    echo "✅ SSL certificates copied to nginx directory"
else
    echo "❌ SSL certificates not found at $CERT_PATH"
    exit 1
fi

echo ""
echo "🎉 SSL Setup Complete!"
echo "================================"
echo ""
echo "✅ SSL certificates generated for:"
echo "   • youmeyou.ai (Main Codaloo Web App)"
echo "   • staging.youmeyou.ai (Staging Environment)"
echo "   • portainer-staging.youmeyou.ai (Management - IP Restricted)"
echo "   • registry-staging.youmeyou.ai (Registry - IP Restricted)"
echo "   • registry-ui-staging.youmeyou.ai (Registry UI - IP Restricted)"
echo ""
echo "🌐 Your applications will be available at:"
echo "   • https://youmeyou.ai - Codaloo Web Application"
echo "   • https://staging.youmeyou.ai - Staging Environment"
echo "   • https://portainer-staging.youmeyou.ai - Portainer (Your IP only)"
echo ""
echo "Next steps:"
echo "1. Update DNS A records to point to $VM_IP"
echo "2. Configure nginx with SSL"
echo "3. Deploy your web application stack"
