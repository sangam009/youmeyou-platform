#!/bin/bash

# YouMeYou Domain Setup Script
# Sets up staging.youmeyou.ai with SSL certificates and proper routing

set -e

DOMAIN="staging.youmeyou.ai"
EMAIL="youmeyou.kafeneo@gmail.com"  # Change this to your email
VM_IP="34.93.209.77"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 YouMeYou Domain Setup for $DOMAIN"
echo "============================================"

# Check if domain resolves to our IP
print_status "Checking DNS resolution for $DOMAIN..."
RESOLVED_IP=$(dig +short $DOMAIN 2>/dev/null || echo "")

if [ "$RESOLVED_IP" = "$VM_IP" ]; then
    print_success "Domain $DOMAIN correctly resolves to $VM_IP"
else
    print_warning "Domain $DOMAIN does not resolve to $VM_IP"
    echo "Current resolution: $RESOLVED_IP"
    echo ""
    echo "📋 DNS Setup Required:"
    echo "   Record Type: A"
    echo "   Name: $DOMAIN"
    echo "   Value: $VM_IP"
    echo "   TTL: 300"
    echo ""
    read -p "Have you set up the DNS record? (y/N): " dns_setup
    if [[ ! "$dns_setup" =~ ^[Yy]$ ]]; then
        print_error "Please set up DNS first, then run this script again."
        exit 1
    fi
fi

# Create nginx configuration script for the VM
print_status "Creating nginx configuration for the VM..."

cat > setup-nginx-ssl.sh << 'EOF'
#!/bin/bash
set -e

DOMAIN="staging.youmeyou.ai"
EMAIL="youmeyou.kafeneo@gmail.com"

echo "🔧 Setting up nginx and SSL certificates..."

# Update system
sudo apt-get update -y

# Install nginx and certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create nginx configuration
sudo tee /etc/nginx/sites-available/youmeyou << 'NGINX_EOF'
server {
    listen 80;
    server_name staging.youmeyou.ai;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.youmeyou.ai;
    
    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/staging.youmeyou.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.youmeyou.ai/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Portainer (Container Management)
    location /portainer/ {
        proxy_pass http://localhost:9000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Web Frontend (default)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/youmeyou /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Get SSL certificate
sudo certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# Test SSL renewal
sudo certbot renew --dry-run

echo "✅ SSL setup complete!"
echo "🌐 Your domain is now accessible at:"
echo "   Main site: https://$DOMAIN"
echo "   Portainer: https://$DOMAIN/portainer/"
echo "   API: https://$DOMAIN/api/"

EOF

chmod +x setup-nginx-ssl.sh

print_status "Uploading and running nginx setup on the VM..."

# Upload and run the script on the VM
scp -i ~/.ssh/id_rsa setup-nginx-ssl.sh ubuntu@$VM_IP:/tmp/
ssh -i ~/.ssh/id_rsa ubuntu@$VM_IP "chmod +x /tmp/setup-nginx-ssl.sh && sudo /tmp/setup-nginx-ssl.sh"

print_success "Domain setup complete!"
echo ""
echo "🌐 Your YouMeYou staging environment is now accessible at:"
echo "   Main site: https://$DOMAIN"
echo "   Portainer: https://$DOMAIN/portainer/"
echo "   API: https://$DOMAIN/api/"
echo ""
echo "🔐 SSL certificates are automatically renewed by Let's Encrypt"

# Clean up
rm -f setup-nginx-ssl.sh

print_warning "Remember to:"
echo "1. Change the default Portainer password!"
echo "2. Upload your YouMeYou application code"
echo "3. Deploy using: /opt/youmeyou/deploy-youmeyou.sh" 