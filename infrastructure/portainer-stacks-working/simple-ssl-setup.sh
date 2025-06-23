#!/bin/bash

set -e

echo "🔒 Simple SSL Setup for YouMeYou Platform"
echo "=========================================="

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

# Step 3: Generate certificates using standalone method
echo "🎯 Step 3: Generating SSL certificates..."

# Try multi-domain certificate first
echo "Attempting multi-domain certificate..."
if sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "$DOMAIN,portainer-staging.$DOMAIN,registry-staging.$DOMAIN,registry-ui-staging.$DOMAIN"; then
    echo "✅ Multi-domain certificate generated successfully"
    CERT_SUCCESS=true
else
    echo "❌ Multi-domain certificate failed, trying individual certificates..."
    CERT_SUCCESS=false
    
    # Try individual certificates
    for subdomain in "" $SUBDOMAINS; do
        if [ -z "$subdomain" ]; then
            current_domain="$DOMAIN"
        else
            current_domain="$subdomain.$DOMAIN"
        fi
        
        echo "Generating certificate for $current_domain..."
        if sudo certbot certonly \
            --standalone \
            --non-interactive \
            --agree-tos \
            --email "$EMAIL" \
            --domains "$current_domain"; then
            echo "✅ Certificate for $current_domain generated"
            CERT_SUCCESS=true
        else
            echo "❌ Certificate for $current_domain failed"
        fi
    done
fi

if [ "$CERT_SUCCESS" = false ]; then
    echo "❌ All certificate generation attempts failed"
    echo "Please check:"
    echo "1. DNS records are pointing to this server"
    echo "2. Port 80 is accessible from the internet"
    echo "3. No firewall is blocking connections"
    exit 1
fi

# Step 4: Set up certificate directory
echo "📁 Step 4: Setting up certificate directory..."
sudo mkdir -p "$CERT_DIR"
sudo chmod 755 "$CERT_DIR"

# Copy certificates (use the first successful certificate)
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    PRIMARY_CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
elif [ -d "/etc/letsencrypt/live/portainer-staging.$DOMAIN" ]; then
    PRIMARY_CERT_DIR="/etc/letsencrypt/live/portainer-staging.$DOMAIN"
else
    PRIMARY_CERT_DIR=$(sudo find /etc/letsencrypt/live -name "*.pem" -type f | head -1 | xargs dirname)
fi

echo "Using certificates from: $PRIMARY_CERT_DIR"
sudo cp "$PRIMARY_CERT_DIR/fullchain.pem" "$CERT_DIR/"
sudo cp "$PRIMARY_CERT_DIR/privkey.pem" "$CERT_DIR/"
sudo chmod 644 "$CERT_DIR/fullchain.pem"
sudo chmod 600 "$CERT_DIR/privkey.pem"
sudo chown ubuntu:ubuntu "$CERT_DIR"/*

# Step 5: Create SSL nginx configuration
echo "⚙️  Step 5: Creating SSL nginx configuration..."
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

# Step 6: Update gateway docker-compose with SSL
echo "🐳 Step 6: Creating SSL-enabled gateway service..."
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

# Step 7: Set up auto-renewal
echo "🔄 Step 7: Setting up SSL auto-renewal..."
cat > /home/ubuntu/renew-ssl.sh << 'EOF'
#!/bin/bash
echo "$(date): Starting SSL renewal check..."

# Stop gateway
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service-ssl.yml down

# Renew certificates
sudo certbot renew --quiet

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/*/fullchain.pem /home/ubuntu/youmeyou-stacks/ssl-certs/ 2>/dev/null || true
sudo cp /etc/letsencrypt/live/*/privkey.pem /home/ubuntu/youmeyou-stacks/ssl-certs/ 2>/dev/null || true
sudo chmod 644 /home/ubuntu/youmeyou-stacks/ssl-certs/fullchain.pem
sudo chmod 600 /home/ubuntu/youmeyou-stacks/ssl-certs/privkey.pem
sudo chown ubuntu:ubuntu /home/ubuntu/youmeyou-stacks/ssl-certs/*

# Restart gateway
docker-compose -f 4-gateway-service-ssl.yml up -d

echo "$(date): SSL renewal check completed"
EOF

chmod +x /home/ubuntu/renew-ssl.sh

# Add cron job for renewal
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -

# Step 8: Start the SSL-enabled gateway
echo "🚀 Step 8: Starting SSL-enabled gateway..."
cd /home/ubuntu/youmeyou-stacks
docker-compose -f 4-gateway-service-ssl.yml up -d

# Wait for gateway to start
echo "⏳ Waiting for gateway to start..."
sleep 10

# Test SSL setup
echo "🧪 Step 9: Testing SSL setup..."
echo "Testing HTTPS redirect..."
curl -I http://youmeyou.ai 2>/dev/null | head -1 || echo "HTTP test failed"

echo "Testing HTTPS connection..."
curl -I https://youmeyou.ai 2>/dev/null | head -1 || echo "HTTPS test failed"

echo ""
echo "✅ SSL setup completed!"
echo ""
echo "🌐 Your services should now be available at:"
echo "   • Main API: https://youmeyou.ai"
echo "   • Portainer: https://portainer-staging.youmeyou.ai"
echo "   • Registry: https://registry-staging.youmeyou.ai"
echo "   • Registry UI: https://registry-ui-staging.youmeyou.ai"
echo ""
echo "📋 Next steps:"
echo "   1. Test all endpoints"
echo "   2. Deploy missing auth service"
echo "   3. Fix payment service Firebase configuration"
echo "" 