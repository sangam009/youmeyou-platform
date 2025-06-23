#!/bin/bash

set -e

echo "🔐 Setting up HTTPS for Registry Endpoint"
echo "========================================"

DOMAIN="youmeyou.ai"
EMAIL="admin@youmeyou.ai"
CERT_DIR="/home/ubuntu/youmeyou-stacks/ssl-certs"

echo "📋 Configuration:"
echo "   Registry Domain: registry-staging.$DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Step 1: Stop gateway to free port 80
echo "🛑 Step 1: Stopping gateway service..."
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service-http.yml down || true
docker rm -f youmeyou-gateway || true
sleep 2

# Step 2: Generate SSL certificate for registry domain only
echo "🎯 Step 2: Generating SSL certificate for registry..."
sudo apt-get update -qq
sudo apt-get install -y certbot

if sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "registry-staging.$DOMAIN"; then
    echo "✅ Registry SSL certificate generated successfully"
    CERT_SUCCESS=true
else
    echo "❌ Registry SSL certificate failed, creating self-signed..."
    CERT_SUCCESS=false
    
    # Create self-signed certificate as fallback
    sudo mkdir -p "$CERT_DIR"
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=registry-staging.$DOMAIN"
    
    sudo chmod 644 "$CERT_DIR/fullchain.pem"
    sudo chmod 600 "$CERT_DIR/privkey.pem"
    sudo chown ubuntu:ubuntu "$CERT_DIR"/*
fi

# Step 3: Set up certificate directory
if [ "$CERT_SUCCESS" = true ]; then
    echo "📁 Step 3: Setting up certificate directory..."
    sudo mkdir -p "$CERT_DIR"
    sudo chmod 755 "$CERT_DIR"
    
    # Copy Let's Encrypt certificates
    CERT_PATH="/etc/letsencrypt/live/registry-staging.$DOMAIN"
    sudo cp "$CERT_PATH/fullchain.pem" "$CERT_DIR/"
    sudo cp "$CERT_PATH/privkey.pem" "$CERT_DIR/"
    sudo chmod 644 "$CERT_DIR/fullchain.pem"
    sudo chmod 600 "$CERT_DIR/privkey.pem"
    sudo chown ubuntu:ubuntu "$CERT_DIR"/*
fi

# Step 4: Create registry-focused nginx configuration
echo "⚙️  Step 4: Creating registry HTTPS configuration..."
cat > /home/ubuntu/youmeyou-stacks/nginx-config/registry-https.conf << 'EOF'
# HTTP to HTTPS redirect for registry
server {
    listen 80;
    server_name registry-staging.youmeyou.ai;
    
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

# Registry HTTPS - IP restricted
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
        
        # Handle large uploads
        client_max_body_size 0;
        chunked_transfer_encoding on;
    }
}

# Basic HTTP server for other domains (temporary)
server {
    listen 80 default_server;
    server_name youmeyou.ai;
    
    # Basic health check
    location /health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
    
    # Portainer proxy (temporary HTTP)
    location /portainer/ {
        # IP Access Control
        allow 106.222.0.0/16;
        deny all;
        
        proxy_pass http://portainer:9000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Default response
    location / {
        return 200 "YouMeYou Platform - Registry HTTPS Configured";
        add_header Content-Type text/plain;
    }
}
EOF

# Step 5: Create registry-focused gateway service
echo "🐳 Step 5: Creating registry HTTPS gateway..."
cat > /home/ubuntu/youmeyou-stacks/4-gateway-registry-https.yml << 'EOF'
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
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  youmeyou-public:
    external: true
  youmeyou-internal:
    external: true
EOF

# Step 6: Clean up old nginx configs
echo "🧹 Step 6: Cleaning up old configurations..."
rm -f /home/ubuntu/youmeyou-stacks/nginx-config/youmeyou-http.conf
rm -f /home/ubuntu/youmeyou-stacks/nginx-config/youmeyou-ssl.conf

# Step 7: Start the registry HTTPS gateway
echo "🚀 Step 7: Starting registry HTTPS gateway..."
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-registry-https.yml up -d

# Wait for gateway to start
echo "⏳ Waiting for gateway to start..."
sleep 10

# Test the setup
echo "🧪 Step 8: Testing registry HTTPS setup..."
echo "Testing HTTP health check..."
curl -I http://youmeyou.ai/health 2>/dev/null | head -1 || echo "HTTP health test failed"

echo "Testing registry HTTPS (self-signed)..."
curl -k -I https://registry-staging.youmeyou.ai 2>/dev/null | head -1 || echo "Registry HTTPS test failed"

echo ""
echo "✅ Registry HTTPS setup completed!"
echo ""
echo "🌐 Registry is now available at:"
echo "   • Registry HTTPS: https://registry-staging.youmeyou.ai (IP-restricted)"
echo "   • Portainer HTTP: http://youmeyou.ai/portainer/ (IP-restricted, temporary)"
echo ""
if [ "$CERT_SUCCESS" = true ]; then
    echo "🔒 Using Let's Encrypt certificate"
else
    echo "⚠️  Using self-signed certificate (browser will show warning)"
fi
echo ""
echo "📋 Next steps:"
echo "   1. Test registry access from Portainer"
echo "   2. Deploy services via Portainer using the HTTPS registry"
echo "   3. Add HTTPS for other endpoints"
echo "" 