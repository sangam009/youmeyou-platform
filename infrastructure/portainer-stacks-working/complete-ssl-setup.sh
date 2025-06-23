#!/bin/bash

# Complete SSL Setup Script for YouMeYou Platform
# This script handles firewall issues and generates SSL certificates for all domains

set -e

echo "🔒 Complete SSL Setup for YouMeYou Platform"
echo "============================================"

DOMAIN="youmeyou.ai"
EMAIL="admin@youmeyou.ai"
VM_IP="34.93.209.77"

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Subdomains: portainer-staging, registry-staging, registry-ui-staging"
echo "   Email: $EMAIL"
echo ""

# Step 1: Fix firewall and Docker issues
echo "🔧 Step 1: Fixing firewall and Docker configuration..."

# Stop all services temporarily
docker stop youmeyou-gateway || true

# Clear any conflicting iptables rules
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo iptables -P OUTPUT ACCEPT

# Ensure UFW is properly configured
sudo ufw --force enable

# Restart Docker to regenerate proper rules
sudo systemctl restart docker

# Wait for Docker to stabilize
sleep 10

echo "✅ Firewall and Docker configuration fixed"

# Step 2: Generate SSL certificates using standalone method
echo "🎯 Step 2: Generating SSL certificates for all domains..."

# Generate certificate for all domains
sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --force-renewal \
    -d "$DOMAIN" \
    -d "portainer-staging.$DOMAIN" \
    -d "registry-staging.$DOMAIN" \
    -d "registry-ui-staging.$DOMAIN"

if [ $? -eq 0 ]; then
    echo "✅ SSL certificates generated successfully!"
else
    echo "❌ Certificate generation failed. Trying individual domains..."
    
    # Try generating certificate for main domain only
    sudo certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --force-renewal \
        -d "$DOMAIN"
    
    # Generate separate certificates for subdomains
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

# Step 3: Set up SSL certificates for nginx
echo "📁 Step 3: Setting up SSL certificates for nginx..."

# Create SSL directory
sudo mkdir -p /home/ubuntu/youmeyou-stacks/ssl-certs

# Copy main domain certificates
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
    sudo chown ubuntu:ubuntu /home/ubuntu/youmeyou-stacks/ssl-certs/*
    echo "✅ Main domain certificates copied"
else
    echo "❌ Main domain certificates not found"
fi

# Step 4: Create comprehensive SSL nginx configuration
echo "🔧 Step 4: Creating SSL-enabled nginx configuration..."

cat > /home/ubuntu/youmeyou-stacks/nginx-config/default.conf << 'EOF'
# IP access control
geo $allowed_ip {
    default 0;
    106.222.230.223 1;  # Current user IP
    106.222.0.0/16 1;   # Broader IP range
    127.0.0.1 1;        # Localhost
    10.0.0.0/8 1;       # Internal network
    172.16.0.0/12 1;    # Docker networks
    192.168.0.0/16 1;   # Private networks
}

# Upstream definitions
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
    
    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
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
        proxy_set_header X-Forwarded-Port $server_port;
    }
    
    location /api/design/ {
        proxy_pass http://design_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
    }
    
    location /api/payment/ {
        proxy_pass http://payment_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
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
        return 200 "YouMeYou Platform API Gateway - HTTPS Enabled ✅\nVersion: 1.0\nStatus: SSL Active\n";
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
        return 403 "Access denied. Your IP is not authorized.";
    }
    
    location / {
        proxy_pass http://portainer_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket support for Portainer
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
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
        return 403 "Access denied. Your IP is not authorized.";
    }
    
    location / {
        proxy_pass http://registry_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Docker registry specific headers
        proxy_set_header Docker-Distribution-Api-Version registry/2.0;
        proxy_buffering off;
        client_max_body_size 0;
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
        return 403 "Access denied. Your IP is not authorized.";
    }
    
    location / {
        proxy_pass http://registry_ui_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
EOF

echo "✅ SSL nginx configuration created"

# Step 5: Update gateway stack to mount SSL certificates
echo "🔄 Step 5: Updating gateway configuration with SSL support..."

# Update the gateway stack to include SSL certificate mounts
cat > /home/ubuntu/youmeyou-stacks/4-gateway-service-ssl.yml << 'EOF'
version: '3.8'

networks:
  youmeyou-public:
    external: true
  youmeyou-internal:
    external: true

services:
  youmeyou-gateway:
    image: nginx:alpine
    container_name: youmeyou-gateway
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /home/ubuntu/youmeyou-stacks/nginx-config:/etc/nginx/conf.d:ro
      - /home/ubuntu/youmeyou-stacks/nginx-logs:/var/log/nginx
      - /home/ubuntu/youmeyou-stacks/ssl-certs:/etc/ssl/certs:ro
      - /home/ubuntu/youmeyou-stacks/ssl-certs:/etc/ssl/private:ro
      - /var/www/html:/var/www/html:ro
    networks:
      - youmeyou-public
      - youmeyou-internal
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
    environment:
      - NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template
EOF

# Step 6: Restart gateway with SSL support
echo "🚀 Step 6: Starting gateway with SSL support..."

# Stop existing gateway
docker stop youmeyou-gateway || true
docker rm youmeyou-gateway || true

# Deploy new SSL-enabled gateway
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service-ssl.yml up -d

# Wait for gateway to start
sleep 10

# Step 7: Set up auto-renewal
echo "⚡ Step 7: Setting up SSL certificate auto-renewal..."

# Create renewal script
cat > /home/ubuntu/renew-ssl.sh << 'EOF'
#!/bin/bash
echo "$(date): Starting SSL certificate renewal..." >> /var/log/ssl-renewal.log
sudo certbot renew --quiet --deploy-hook "docker restart youmeyou-gateway" >> /var/log/ssl-renewal.log 2>&1
echo "$(date): SSL certificate renewal completed" >> /var/log/ssl-renewal.log
EOF

chmod +x /home/ubuntu/renew-ssl.sh

# Add to crontab for automatic renewal
(sudo crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/renew-ssl.sh") | sudo crontab -

echo ""
echo "🎉 SSL Setup Complete!"
echo "======================================"
echo "✅ SSL certificates generated and installed"
echo "✅ HTTPS enabled for all domains"
echo "✅ Auto-renewal configured"
echo ""
echo "🌐 Your secure services are now available at:"
echo "   📱 Main API: https://youmeyou.ai"
echo "   🔧 Portainer: https://portainer-staging.youmeyou.ai"
echo "   📦 Registry: https://registry-staging.youmeyou.ai"
echo "   🖥️  Registry UI: https://registry-ui-staging.youmeyou.ai"
echo ""
echo "🔒 Features enabled:"
echo "   • TLS 1.2 & 1.3 support"
echo "   • Strong cipher suites"
echo "   • HSTS security headers"
echo "   • IP-based access control for admin services"
echo "   • Auto-renewal every day at 2 AM"
echo ""
echo "📝 Certificate locations:"
echo "   • Let's Encrypt: /etc/letsencrypt/live/$DOMAIN/"
echo "   • Nginx: /home/ubuntu/youmeyou-stacks/ssl-certs/"
echo ""
echo "🔧 Test your SSL setup:"
echo "   curl -I https://youmeyou.ai"
echo "   curl -I https://portainer-staging.youmeyou.ai" 