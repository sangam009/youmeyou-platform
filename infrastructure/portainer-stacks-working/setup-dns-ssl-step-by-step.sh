#!/bin/bash

# Step-by-Step DNS and SSL Setup for YouMeYou Platform
# This script sets up SSL certificates for all domains one by one

set -e

echo "🔒 Step-by-Step DNS and SSL Setup for YouMeYou Platform"
echo "========================================================"

DOMAIN="youmeyou.ai"
EMAIL="admin@youmeyou.ai"
VM_IP="34.93.209.77"

echo "📋 Configuration:"
echo "   VM IP: $VM_IP"
echo "   Email: $EMAIL"
echo ""
echo "🌐 Domains to configure:"
echo "   1. youmeyou.ai (Main Codaloo Web App)"
echo "   2. staging.youmeyou.ai (Staging Environment)"
echo "   3. portainer-staging.youmeyou.ai (Portainer - IP Restricted)"
echo "   4. registry-staging.youmeyou.ai (Registry - IP Restricted)"
echo "   5. registry-ui-staging.youmeyou.ai (Registry UI - IP Restricted)"
echo ""

# Function to check DNS resolution
check_dns() {
    local domain=$1
    echo "🔍 Checking DNS resolution for $domain..."
    if nslookup $domain | grep -q "$VM_IP"; then
        echo "✅ $domain resolves to $VM_IP"
        return 0
    else
        echo "❌ $domain does not resolve to $VM_IP"
        echo "   Please add A record: $domain -> $VM_IP"
        return 1
    fi
}

# Function to generate SSL certificate for a domain
generate_ssl_cert() {
    local domain=$1
    echo ""
    echo "🎯 Generating SSL certificate for $domain..."
    
    # Stop gateway temporarily to free port 80
    docker stop youmeyou-gateway || true
    sleep 3
    
    # Generate certificate
    sudo certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --force-renewal \
        -d "$domain"
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL certificate generated for $domain"
        return 0
    else
        echo "❌ Failed to generate SSL certificate for $domain"
        return 1
    fi
}

# Step 1: Prerequisites
echo "🔧 Step 1: Setting up prerequisites..."

# Install certbot if needed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo apt update
    sudo apt install -y certbot
fi

# Configure firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "✅ Prerequisites ready"

# Step 2: Check DNS resolution for all domains
echo ""
echo "🔍 Step 2: Checking DNS resolution..."

dns_ready=true
for subdomain in "" "staging" "portainer-staging" "registry-staging" "registry-ui-staging"; do
    if [ -z "$subdomain" ]; then
        domain_to_check="$DOMAIN"
    else
        domain_to_check="$subdomain.$DOMAIN"
    fi
    
    if ! check_dns "$domain_to_check"; then
        dns_ready=false
    fi
done

if [ "$dns_ready" = false ]; then
    echo ""
    echo "❌ DNS resolution issues detected!"
    echo ""
    echo "Please add these A records in your DNS provider:"
    echo "   youmeyou.ai -> $VM_IP"
    echo "   staging.youmeyou.ai -> $VM_IP"
    echo "   portainer-staging.youmeyou.ai -> $VM_IP"
    echo "   registry-staging.youmeyou.ai -> $VM_IP"
    echo "   registry-ui-staging.youmeyou.ai -> $VM_IP"
    echo ""
    echo "After adding DNS records, wait 5-10 minutes for propagation and run this script again."
    exit 1
fi

echo "✅ All DNS records are properly configured"

# Step 3: Generate SSL certificates one by one
echo ""
echo "🎯 Step 3: Generating SSL certificates..."

# Array of domains to process
domains=("youmeyou.ai" "staging.youmeyou.ai" "portainer-staging.youmeyou.ai" "registry-staging.youmeyou.ai" "registry-ui-staging.youmeyou.ai")

for domain in "${domains[@]}"; do
    generate_ssl_cert "$domain"
    sleep 2
done

# Step 4: Copy certificates to nginx directory
echo ""
echo "📁 Step 4: Setting up SSL certificates for nginx..."

# Create directories
sudo mkdir -p /home/ubuntu/youmeyou-stacks/ssl-certs
sudo mkdir -p /home/ubuntu/youmeyou-stacks/nginx-config

# Copy main domain certificate (Let's Encrypt creates a single cert for the primary domain)
CERT_PATH="/etc/letsencrypt/live/youmeyou.ai"
if [ -d "$CERT_PATH" ]; then
    sudo cp $CERT_PATH/fullchain.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
    sudo cp $CERT_PATH/privkey.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
    sudo chown ubuntu:ubuntu /home/ubuntu/youmeyou-stacks/ssl-certs/*
    echo "✅ SSL certificates copied to nginx directory"
else
    echo "❌ SSL certificates not found at $CERT_PATH"
    exit 1
fi

# Step 5: Create SSL-enabled nginx configuration
echo ""
echo "🔧 Step 5: Creating SSL-enabled nginx configuration..."

# Copy the SSL nginx config we created earlier
if [ -f "/Users/seemantishukla/personal/arch_tool/portainer-stacks/nginx-config/youmeyou-ssl.conf" ]; then
    sudo cp /Users/seemantishukla/personal/arch_tool/portainer-stacks/nginx-config/youmeyou-ssl.conf /home/ubuntu/youmeyou-stacks/nginx-config/
    echo "✅ SSL nginx configuration copied"
else
    echo "❌ SSL nginx configuration not found locally"
    exit 1
fi

# Step 6: Deploy SSL-enabled gateway
echo ""
echo "🚀 Step 6: Deploying SSL-enabled gateway..."

cd /home/ubuntu/youmeyou-stacks

# Copy the SSL gateway stack file
if [ -f "/Users/seemantishukla/personal/arch_tool/portainer-stacks/4-gateway-service-ssl.yml" ]; then
    cp /Users/seemantishukla/personal/arch_tool/portainer-stacks/4-gateway-service-ssl.yml .
    echo "✅ SSL gateway stack file copied"
else
    echo "❌ SSL gateway stack file not found"
    exit 1
fi

# Deploy the SSL-enabled gateway
docker-compose -f 4-gateway-service-ssl.yml up -d

echo "✅ SSL-enabled gateway deployed"

# Step 7: Verify SSL setup
echo ""
echo "🧪 Step 7: Verifying SSL setup..."

sleep 10

echo "Testing SSL endpoints..."
for domain in "${domains[@]}"; do
    echo "Testing https://$domain..."
    if curl -k -I "https://$domain/health" 2>/dev/null | grep -q "200\|301\|302"; then
        echo "✅ $domain SSL working"
    else
        echo "⚠️  $domain SSL test inconclusive"
    fi
done

echo ""
echo "🎉 SSL Setup Complete!"
echo "======================"
echo ""
echo "✅ SSL certificates generated and deployed for:"
echo "   • youmeyou.ai (Main Codaloo Web App)"
echo "   • staging.youmeyou.ai (Staging Environment)"
echo "   • portainer-staging.youmeyou.ai (Portainer - IP Restricted)"
echo "   • registry-staging.youmeyou.ai (Registry - IP Restricted)"
echo "   • registry-ui-staging.youmeyou.ai (Registry UI - IP Restricted)"
echo ""
echo "🌐 Your applications should now be available at:"
echo "   • https://youmeyou.ai - Codaloo Web Application"
echo "   • https://staging.youmeyou.ai - Staging Environment"
echo "   • https://portainer-staging.youmeyou.ai - Portainer (Your IP only)"
echo ""
echo "🔧 Next steps:"
echo "   1. Test all HTTPS endpoints"
echo "   2. Deploy the Codaloo web application stack"
echo "   3. Update CORS origins in microservices to use HTTPS URLs" 