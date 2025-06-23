#!/bin/bash

# Setup SSL for Registry Only
# This script generates SSL certificates only for registry-staging.youmeyou.ai

echo "🔐 Setting up SSL for Registry subdomain only..."

EMAIL="sangam.sangamdubey@gmail.com"
DOMAIN="registry-staging.youmeyou.ai"

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Step 1: Stop gateway temporarily to free port 80
echo "🛑 Stopping gateway temporarily..."
docker stop youmeyou-gateway

# Step 2: Generate SSL certificate for registry subdomain only
echo "🎯 Generating SSL certificate for $DOMAIN..."

sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --force-renewal \
    -d "$DOMAIN"

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate generated successfully for $DOMAIN"
    
    # Step 3: Copy certificates to nginx directory
    echo "📁 Setting up SSL certificates for nginx..."
    
    # Create SSL directory
    sudo mkdir -p /home/ubuntu/youmeyou-stacks/ssl-certs
    
    # Copy certificates
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
        sudo chown ubuntu:ubuntu /home/ubuntu/youmeyou-stacks/ssl-certs/*
        echo "✅ SSL certificates copied to nginx directory"
    else
        echo "❌ SSL certificates not found in /etc/letsencrypt/live/$DOMAIN"
    fi
    
    # Step 4: Start gateway again
    echo "🚀 Starting gateway..."
    docker start youmeyou-gateway
    
    # Wait for gateway to start
    sleep 5
    
    echo ""
    echo "🎉 SSL setup complete for registry!"
    echo "   - Registry HTTPS: https://registry-staging.youmeyou.ai"
    echo "   - All other services remain HTTP"
    
else
    echo "❌ Failed to generate SSL certificate"
    echo "🚀 Starting gateway again..."
    docker start youmeyou-gateway
    exit 1
fi 