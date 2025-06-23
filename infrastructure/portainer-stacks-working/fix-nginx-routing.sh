#!/bin/bash

# Fix Nginx Routing Script
# This script fixes the nginx configuration to use internal IP addresses instead of service names
# and removes IP restrictions that are causing timeouts

echo "🔧 Fixing nginx routing configuration..."

# Create the fixed nginx configuration
cat > /home/ubuntu/youmeyou-stacks/nginx-config/default.conf << 'EOF'
# Fixed nginx configuration using internal IP addresses

# Main server block for youmeyou.ai (HTTP)
server {
    listen 80;
    server_name youmeyou.ai;
    
    # Root location - proxy to web service
    location / {
        proxy_pass http://10.0.1.2:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Portainer proxy path
    location /portainer/ {
        proxy_pass http://10.0.1.2:9000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for Portainer
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Increase timeouts for Portainer
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Design Service API
    location /api/design {
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        
        rewrite ^/api/design(/.*)$ $1 break;
        proxy_pass http://10.0.1.2:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Payment Service API
    location /api/payment {
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        
        rewrite ^/api/payment(/.*)$ $1 break;
        proxy_pass http://10.0.1.2:6000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Health check endpoints
    location /health/design {
        proxy_pass http://10.0.1.2:4000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health/payment {
        proxy_pass http://10.0.1.2:6000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Portainer subdomain (HTTP)
server {
    listen 80;
    server_name portainer-staging.youmeyou.ai;
    
    # Proxy to Portainer
    location / {
        proxy_pass http://10.0.1.2:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for Portainer
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Increase timeouts for Portainer
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Registry subdomain - HTTP to HTTPS redirect
server {
    listen 80;
    server_name registry-staging.youmeyou.ai;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

# Registry subdomain - HTTPS (SSL enabled)
server {
    listen 443 ssl http2;
    server_name registry-staging.youmeyou.ai;
    
    # SSL Configuration (only for registry)
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
    
    # Docker registry specific headers
    client_max_body_size 0;
    chunked_transfer_encoding on;
    
    location / {
        proxy_pass http://10.0.1.2:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Docker registry specific headers
        proxy_set_header Docker-Distribution-Api-Version registry/2.0;
        proxy_pass_header Authorization;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Registry UI subdomain (HTTP)
server {
    listen 80;
    server_name registry-ui-staging.youmeyou.ai;
    
    location / {
        proxy_pass http://10.0.1.2:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

echo "✅ Nginx configuration updated with internal IP addresses"

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
docker exec youmeyou-gateway nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Reload nginx
    echo "🔄 Reloading nginx..."
    docker exec youmeyou-gateway nginx -s reload
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx reloaded successfully"
        echo ""
        echo "🎉 Nginx routing fixed! Test the endpoints:"
        echo "   - Main site: http://youmeyou.ai"
        echo "   - Portainer: http://portainer-staging.youmeyou.ai"
        echo "   - Registry UI: http://registry-ui-staging.youmeyou.ai"
        echo "   - Design API: http://youmeyou.ai/health/design"
        echo "   - Payment API: http://youmeyou.ai/health/payment"
    else
        echo "❌ Failed to reload nginx"
    fi
else
    echo "❌ Nginx configuration has errors"
    docker exec youmeyou-gateway nginx -t
fi 