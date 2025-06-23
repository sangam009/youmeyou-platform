#!/bin/bash

# Simple Let's Encrypt SSL Setup Script for YouMeYou Platform
# This script uses HTTP challenge instead of DNS challenge

set -e

echo "🔒 Setting up Let's Encrypt SSL for YouMeYou Platform (HTTP Challenge)"
echo "=================================================================="

# Configuration
DOMAIN="youmeyou.ai"
EMAIL="admin@youmeyou.ai"  # Replace with your actual email
VM_IP="34.93.209.77"

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Email: $EMAIL"
echo "   VM IP: $VM_IP"
echo ""

# Step 1: Install Certbot
echo "📦 Installing Certbot..."
sudo apt update
sudo apt install -y certbot

# Step 2: Stop nginx temporarily for certificate generation
echo "🛑 Temporarily stopping nginx for certificate generation..."
docker stop youmeyou-gateway || true

# Step 3: Generate SSL certificate using HTTP challenge
echo "🎯 Generating SSL certificate using HTTP challenge..."
echo "   This will create certificates for: $DOMAIN"

sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "portainer-staging.$DOMAIN" \
    -d "registry-staging.$DOMAIN" \
    -d "registry-ui-staging.$DOMAIN"

# Step 4: Copy certificates to nginx directory
echo "📁 Setting up SSL certificates for nginx..."
sudo mkdir -p /home/ubuntu/youmeyou-stacks/ssl-certs
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
sudo chown ubuntu:ubuntu /home/ubuntu/youmeyou-stacks/ssl-certs/*

# Step 5: Create SSL-enabled nginx configuration
echo "🔧 Creating SSL-enabled nginx configuration..."
cat > /home/ubuntu/youmeyou-stacks/nginx-config/default-ssl.conf << 'EOF'
# Your IP address for restricted access
geo $allowed_ip {
    default 0;
    # Current user IP and broader range to handle future changes
    106.222.230.223 1;  # Current user IP
    106.222.0.0/16 1;   # Broader IP range to handle future changes
    127.0.0.1 1;        # Localhost for testing
    10.0.0.0/8 1;       # Internal network
    172.16.0.0/12 1;    # Docker networks
    192.168.0.0/16 1;   # Private networks
}

# Upstream definitions for microservices
upstream auth_service {
    server 10.0.1.2:3001;
}

upstream design_service {
    server 10.0.1.2:4000;
}

upstream payment_service {
    server 10.0.1.2:6000;
}

upstream portainer_service {
    server 10.0.1.2:9000;
}

upstream registry_service {
    server 10.0.1.2:5000;
}

upstream registry_ui_service {
    server 10.0.1.2:5001;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name youmeyou.ai portainer-staging.youmeyou.ai registry-staging.youmeyou.ai registry-ui-staging.youmeyou.ai;
    
    # Allow Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect everything else to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main domain HTTPS
server {
    listen 443 ssl http2;
    server_name youmeyou.ai;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # API Routes
    location /api/auth/ {
        proxy_pass http://auth_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/design/ {
        proxy_pass http://design_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/payment/ {
        proxy_pass http://payment_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoints
    location /health/auth {
        proxy_pass http://auth_service/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /health/design {
        proxy_pass http://design_service/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /health/payment {
        proxy_pass http://payment_service/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Default location
    location / {
        return 200 "YouMeYou Platform API Gateway - HTTPS Enabled\n";
        add_header Content-Type text/plain;
    }
}

# Portainer subdomain (restricted access)
server {
    listen 443 ssl http2;
    server_name portainer-staging.youmeyou.ai;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # IP restriction
    if ($allowed_ip = 0) {
        return 403;
    }
    
    location / {
        proxy_pass http://portainer_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Registry subdomain (restricted access)
server {
    listen 443 ssl http2;
    server_name registry-staging.youmeyou.ai;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # IP restriction
    if ($allowed_ip = 0) {
        return 403;
    }
    
    location / {
        proxy_pass http://registry_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Registry UI subdomain (restricted access)
server {
    listen 443 ssl http2;
    server_name registry-ui-staging.youmeyou.ai;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # IP restriction
    if ($allowed_ip = 0) {
        return 403;
    }
    
    location / {
        proxy_pass http://registry_ui_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Step 6: Update gateway stack to use SSL configuration
echo "🔄 Updating gateway stack configuration..."
# Replace the default.conf with SSL version
cp /home/ubuntu/youmeyou-stacks/nginx-config/default-ssl.conf /home/ubuntu/youmeyou-stacks/nginx-config/default.conf

# Step 7: Restart gateway with SSL support
echo "🚀 Restarting gateway with SSL support..."
docker start youmeyou-gateway

# Step 8: Set up auto-renewal
echo "⚡ Setting up SSL certificate auto-renewal..."
sudo crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker restart youmeyou-gateway"; } | sudo crontab -

echo ""
echo "✅ SSL Setup Complete!"
echo "🎉 Your services are now available with SSL:"
echo "   🌐 Main API: https://youmeyou.ai"
echo "   🔧 Portainer: https://portainer-staging.youmeyou.ai"
echo "   📦 Registry: https://registry-staging.youmeyou.ai"
echo "   🖥️  Registry UI: https://registry-ui-staging.youmeyou.ai"
echo ""
echo "🔒 SSL certificates will auto-renew every 12 hours"
echo "📝 Certificate location: /etc/letsencrypt/live/$DOMAIN/" 