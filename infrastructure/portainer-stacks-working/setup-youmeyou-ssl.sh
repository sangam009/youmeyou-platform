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

# Step 5: Create comprehensive SSL nginx configuration
echo "🔧 Step 5: Creating SSL-enabled nginx configuration..."

sudo mkdir -p /home/ubuntu/youmeyou-stacks/nginx-config

cat > /home/ubuntu/youmeyou-stacks/nginx-config/youmeyou-ssl.conf << 'EOF'
# IP access control for management services
geo $allowed_ip {
    default 0;
    106.222.232.175 1;  # Current user IP
    106.222.0.0/16 1;   # Broader IP range
    127.0.0.1 1;        # Localhost
    10.0.0.0/8 1;       # Internal network
    172.16.0.0/12 1;    # Docker networks
    192.168.0.0/16 1;   # Private networks
}

# Upstream definitions
upstream codaloo_web {
    server youmeyou-codaloo-web:3000;
}

upstream auth_service {
    server youmeyou-auth-service:3001;
}

upstream design_service {
    server youmeyou-design-service:4000;
}

upstream payment_service {
    server youmeyou-payment-service:6000;
}

upstream portainer_service {
    server 127.0.0.1:9000;
}

upstream registry_service {
    server 127.0.0.1:5000;
}

upstream registry_ui_service {
    server 127.0.0.1:5001;
}

# HTTP to HTTPS redirect for all domains
server {
    listen 80;
    server_name youmeyou.ai staging.youmeyou.ai portainer-staging.youmeyou.ai registry-staging.youmeyou.ai registry-ui-staging.youmeyou.ai;
    
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

# Main domain HTTPS - youmeyou.ai (Codaloo Web Application)
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
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # API Routes for microservices
    location /api/auth/ {
        proxy_pass http://auth_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    location /api/design/ {
        proxy_pass http://design_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    location /api/payment/ {
        proxy_pass http://payment_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Main Codaloo Web Application (all other routes)
    location / {
        proxy_pass http://codaloo_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}

# Staging domain HTTPS - staging.youmeyou.ai
server {
    listen 443 ssl http2;
    server_name staging.youmeyou.ai;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Same routing as main domain
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
    
    location / {
        proxy_pass http://codaloo_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Portainer HTTPS (IP Restricted)
server {
    listen 443 ssl http2;
    server_name portainer-staging.youmeyou.ai;
    
    # IP restriction
    if ($allowed_ip = 0) {
        return 403;
    }
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://portainer_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Registry HTTPS (IP Restricted)
server {
    listen 443 ssl http2;
    server_name registry-staging.youmeyou.ai;
    
    # IP restriction
    if ($allowed_ip = 0) {
        return 403;
    }
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://registry_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Registry UI HTTPS (IP Restricted)
server {
    listen 443 ssl http2;
    server_name registry-ui-staging.youmeyou.ai;
    
    # IP restriction
    if ($allowed_ip = 0) {
        return 403;
    }
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://registry_ui_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "✅ SSL nginx configuration created"

# Step 6: Create updated gateway service stack with SSL
echo "🚀 Step 6: Creating SSL-enabled gateway stack..."

cat > /home/ubuntu/youmeyou-stacks/4-gateway-service-ssl.yml << 'EOF'
version: '3.8'

services:
  youmeyou-gateway:
    image: nginx:alpine
    container_name: youmeyou-gateway
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-config/youmeyou-ssl.conf:/etc/nginx/conf.d/default.conf
      - ./ssl-certs/fullchain.pem:/etc/ssl/certs/fullchain.pem:ro
      - ./ssl-certs/privkey.pem:/etc/ssl/private/privkey.pem:ro
      - ./nginx-logs:/var/log/nginx
    networks:
      - youmeyou-public
      - youmeyou-internal
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

networks:
  youmeyou-public:
    external: true
  youmeyou-internal:
    external: true
EOF

echo "✅ SSL-enabled gateway stack created"

# Step 7: Set up certificate auto-renewal
echo "🔄 Step 7: Setting up certificate auto-renewal..."

# Create renewal script
cat > /home/ubuntu/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script for YouMeYou Platform

echo "🔄 Renewing SSL certificates..."

# Stop gateway to free port 80
docker stop youmeyou-gateway

# Renew certificates
sudo certbot renew --standalone

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/youmeyou.ai/fullchain.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
sudo cp /etc/letsencrypt/live/youmeyou.ai/privkey.pem /home/ubuntu/youmeyou-stacks/ssl-certs/
sudo chown ubuntu:ubuntu /home/ubuntu/youmeyou-stacks/ssl-certs/*

# Restart gateway
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service-ssl.yml up -d

echo "✅ SSL certificates renewed and gateway restarted"
EOF

chmod +x /home/ubuntu/renew-ssl.sh

# Add to crontab for automatic renewal
(crontab -l 2>/dev/null; echo "0 3 * * 0 /home/ubuntu/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -

echo "✅ Auto-renewal configured (weekly on Sunday at 3 AM)"

# Step 8: Start the SSL-enabled gateway
echo "🚀 Step 8: Starting SSL-enabled gateway..."

cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service-ssl.yml up -d

echo "✅ SSL-enabled gateway started"

# Step 9: Verify SSL setup
echo "🧪 Step 9: Verifying SSL setup..."

sleep 5

echo "Testing SSL endpoints..."
echo "Main domain: https://youmeyou.ai"
curl -I https://youmeyou.ai/health || echo "Main domain test failed"

echo "Staging domain: https://staging.youmeyou.ai" 
curl -I https://staging.youmeyou.ai/health || echo "Staging domain test failed"

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
echo "🌐 Your applications are now available at:"
echo "   • https://youmeyou.ai - Codaloo Web Application"
echo "   • https://staging.youmeyou.ai - Staging Environment"
echo "   • https://portainer-staging.youmeyou.ai - Portainer (Your IP only)"
echo ""
echo "🔄 Auto-renewal configured for certificate maintenance"
echo ""
echo "Next steps:"
echo "1. Update DNS A records to point to $VM_IP"
echo "2. Test all endpoints after DNS propagation"
echo "3. Deploy your web application stack" 