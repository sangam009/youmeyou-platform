#!/bin/bash

set -e

echo "🔒 DNS-Based SSL Setup for YouMeYou Platform"
echo "============================================="

# Configuration
DOMAIN="youmeyou.ai"
SUBDOMAINS="portainer-staging registry-staging registry-ui-staging"
EMAIL="admin@youmeyou.ai"
CERT_DIR="/home/ubuntu/youmeyou-stacks/ssl-certs"

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Subdomains: $SUBDOMAINS"
echo "   Email: $EMAIL"
echo ""

# Step 1: Stop gateway to free port 80
echo "🛑 Step 1: Stopping gateway service..."
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service.yml down || true
sleep 2

# Step 2: Install certbot if not present
echo "📦 Step 2: Installing certbot..."
sudo apt-get update -qq
sudo apt-get install -y certbot

# Step 3: Create self-signed certificates as fallback
echo "🔐 Step 3: Creating self-signed certificates as fallback..."
sudo mkdir -p "$CERT_DIR"

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:portainer-staging.$DOMAIN,DNS:registry-staging.$DOMAIN,DNS:registry-ui-staging.$DOMAIN"

sudo chmod 644 "$CERT_DIR/fullchain.pem"
sudo chmod 600 "$CERT_DIR/privkey.pem"
sudo chown ubuntu:ubuntu "$CERT_DIR"/*

echo "✅ Self-signed certificates created"

# Step 4: Create SSL nginx configuration
echo "⚙️  Step 4: Creating SSL nginx configuration..."
cat > /home/ubuntu/youmeyou-stacks/nginx-config/youmeyou-ssl.conf << 'EOF'
# HTTP to HTTPS redirect for all domains
server {
    listen 80;
    server_name youmeyou.ai portainer-staging.youmeyou.ai registry-staging.youmeyou.ai registry-ui-staging.youmeyou.ai;
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main domain - youmeyou.ai
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
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API routes for microservices
    location /api/auth/ {
        proxy_pass http://youmeyou-auth-service:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/design/ {
        proxy_pass http://youmeyou-design-service:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/payment/ {
        proxy_pass http://youmeyou-payment-service:6000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoints
    location /health/auth {
        proxy_pass http://youmeyou-auth-service:3000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /health/design {
        proxy_pass http://youmeyou-design-service:4000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /health/payment {
        proxy_pass http://youmeyou-payment-service:6000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Default route to web app
    location / {
        proxy_pass http://youmeyou-codaloo-web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Portainer - IP restricted
server {
    listen 443 ssl http2;
    server_name portainer-staging.youmeyou.ai;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # IP Access Control
    allow 106.222.0.0/16;
    deny all;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://portainer:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for Portainer
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Registry - IP restricted
server {
    listen 443 ssl http2;
    server_name registry-staging.youmeyou.ai;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # IP Access Control
    allow 106.222.0.0/16;
    deny all;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://youmeyou-registry:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Docker registry specific headers
        proxy_set_header Docker-Distribution-Api-Version registry/2.0;
        proxy_read_timeout 900;
    }
}

# Registry UI - IP restricted  
server {
    listen 443 ssl http2;
    server_name registry-ui-staging.youmeyou.ai;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # IP Access Control
    allow 106.222.0.0/16;
    deny all;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://youmeyou-registry-ui:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Step 5: Create SSL-enabled gateway service
echo "🐳 Step 5: Creating SSL-enabled gateway service..."
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
      - ./nginx-config:/etc/nginx/conf.d:ro
      - ./ssl-certs:/etc/ssl/certs:ro
      - ./ssl-certs:/etc/ssl/private:ro
      - /var/www/html:/var/www/html:ro
    networks:
      - youmeyou-public
      - youmeyou-internal
    restart: unless-stopped
    depends_on:
      - youmeyou-design-service
      - youmeyou-payment-service
      - youmeyou-codaloo-web
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/health/design"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  youmeyou-public:
    external: true
  youmeyou-internal:
    external: true
EOF

# Step 6: Start the SSL-enabled gateway
echo "🚀 Step 6: Starting SSL-enabled gateway..."
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service-ssl.yml up -d

# Wait for gateway to start
echo "⏳ Waiting for gateway to start..."
sleep 10

# Test SSL setup
echo "🧪 Step 7: Testing SSL setup..."
echo "Testing HTTPS connection (self-signed)..."
curl -k -I https://youmeyou.ai 2>/dev/null | head -1 || echo "HTTPS test failed"

echo ""
echo "✅ SSL setup completed with self-signed certificates!"
echo ""
echo "🌐 Your services should now be available at:"
echo "   • Main API: https://youmeyou.ai (⚠️  Self-signed certificate)"
echo "   • Portainer: https://portainer-staging.youmeyou.ai (⚠️  Self-signed certificate)"
echo "   • Registry: https://registry-staging.youmeyou.ai (⚠️  Self-signed certificate)"
echo "   • Registry UI: https://registry-ui-staging.youmeyou.ai (⚠️  Self-signed certificate)"
echo ""
echo "📋 To get proper Let's Encrypt certificates:"
echo "   1. Ensure port 80 is accessible from the internet"
echo "   2. Check Google Cloud firewall rules"
echo "   3. Run: sudo certbot certonly --webroot -w /var/www/html -d youmeyou.ai -d portainer-staging.youmeyou.ai -d registry-staging.youmeyou.ai -d registry-ui-staging.youmeyou.ai"
echo ""
echo "📋 Next steps:"
echo "   1. Test all endpoints (ignore certificate warnings for now)"
echo "   2. Deploy missing auth service"
echo "   3. Fix payment service Firebase configuration"
echo "" 