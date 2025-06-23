#!/bin/bash

set -e

echo "🌐 HTTP Gateway Setup for YouMeYou Platform"
echo "==========================================="

echo "⚠️  Setting up HTTP-only gateway (temporary solution)"
echo "   This is for testing purposes only. HTTPS should be configured for production."
echo ""

# Step 1: Stop any existing gateway
echo "🛑 Step 1: Stopping existing gateway..."
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service-ssl.yml down || true
docker rm -f youmeyou-gateway || true
sleep 2

# Step 2: Create HTTP-only nginx configuration
echo "⚙️  Step 2: Creating HTTP-only nginx configuration..."
cat > /home/ubuntu/youmeyou-stacks/nginx-config/youmeyou-http.conf << 'EOF'
# Main domain - youmeyou.ai (HTTP only)
server {
    listen 80;
    server_name youmeyou.ai;
    
    # Security headers (basic)
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

# Admin services on different ports (IP restricted)
server {
    listen 8080;
    server_name youmeyou.ai;
    
    # IP Access Control
    allow 106.222.0.0/16;
    deny all;
    
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

server {
    listen 8081;
    server_name youmeyou.ai;
    
    # IP Access Control
    allow 106.222.0.0/16;
    deny all;
    
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

server {
    listen 8082;
    server_name youmeyou.ai;
    
    # IP Access Control
    allow 106.222.0.0/16;
    deny all;
    
    location / {
        proxy_pass http://youmeyou-registry-ui:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Step 3: Create HTTP-only gateway service
echo "🐳 Step 3: Creating HTTP-only gateway service..."
cat > /home/ubuntu/youmeyou-stacks/4-gateway-service-http.yml << 'EOF'
version: '3.8'

services:
  youmeyou-gateway:
    image: nginx:alpine
    container_name: youmeyou-gateway
    ports:
      - "80:80"
      - "8080:8080"
      - "8081:8081"
      - "8082:8082"
    volumes:
      - ./nginx-config:/etc/nginx/conf.d:ro
    networks:
      - youmeyou-public
      - youmeyou-internal
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  youmeyou-public:
    external: true
  youmeyou-internal:
    external: true
EOF

# Step 4: Start the HTTP gateway
echo "🚀 Step 4: Starting HTTP-only gateway..."
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service-http.yml up -d

# Wait for gateway to start
echo "⏳ Waiting for gateway to start..."
sleep 10

# Test HTTP setup
echo "🧪 Step 5: Testing HTTP setup..."
echo "Testing main domain..."
curl -I http://youmeyou.ai 2>/dev/null | head -1 || echo "Main domain test failed"

echo "Testing design service health..."
curl -I http://youmeyou.ai/health/design 2>/dev/null | head -1 || echo "Design service test failed"

echo ""
echo "✅ HTTP gateway setup completed!"
echo ""
echo "🌐 Your services are now available at:"
echo "   • Main API: http://youmeyou.ai"
echo "   • Design Service Health: http://youmeyou.ai/health/design"
echo "   • Payment Service Health: http://youmeyou.ai/health/payment"
echo "   • Portainer: http://youmeyou.ai:8080 (IP-restricted)"
echo "   • Registry: http://youmeyou.ai:8081 (IP-restricted)"
echo "   • Registry UI: http://youmeyou.ai:8082 (IP-restricted)"
echo ""
echo "⚠️  IMPORTANT: This is HTTP-only for testing!"
echo ""
echo "📋 To enable HTTPS, fix Google Cloud firewall rules:"
echo "   1. Go to Google Cloud Console"
echo "   2. Navigate to VPC network > Firewall"
echo "   3. Create rules to allow ports 80 and 443 from 0.0.0.0/0"
echo "   4. Then run the SSL setup script"
echo ""
echo "📋 Next steps:"
echo "   1. Test all endpoints"
echo "   2. Deploy missing auth service"
echo "   3. Fix payment service Firebase configuration"
echo "   4. Set up proper HTTPS certificates"
echo "" 