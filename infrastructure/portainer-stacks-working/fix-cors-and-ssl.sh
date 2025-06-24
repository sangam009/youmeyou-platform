#!/bin/bash

# YouMeYou Platform - Fix CORS and SSL Issues
# This script fixes specific issues without unnecessary changes:
# 1. WiFi IP range restriction in nginx
# 2. CORS configuration in auth service 
# 3. SSL certificate verification for youmeyou.ai

set -e

echo "🔧 YouMeYou Platform - CORS & SSL Fix"
echo "===================================="

# Check if GitHub token is provided
if [ -z "$1" ]; then
    echo "❌ Error: GitHub token is required"
    echo "Usage: $0 <github_token>"
    echo "Example: $0 github_pat_xxxxx"
    exit 1
fi

GITHUB_TOKEN="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📁 Working directory: $SCRIPT_DIR"
echo "🎯 Target fixes:"
echo "   • WiFi IP range (106.222.232.0/24) in nginx"
echo "   • CORS origins in auth service"
echo "   • SSL certificate verification"

# Step 1: Update codebase
echo ""
echo "📥 Step 1: Updating codebase..."
cd /home/seemantishukla/youmeyou-platform
git pull origin main
echo "✅ Codebase updated"

# Step 2: Build and push auth service (CORS fix)
echo ""
echo "🔨 Step 2: Building auth service with CORS fix..."
cd /home/seemantishukla/youmeyou-platform

# Build auth service
echo "Building auth-service..."
cd services/auth-microservice
docker build -t localhost:5000/youmeyou/auth-service:latest -f backend/Dockerfile backend/
docker push localhost:5000/youmeyou/auth-service:latest
cd ../..

echo "✅ Auth service built and pushed with CORS fix"

# Step 3: Copy updated nginx config to VM
echo ""
echo "📋 Step 3: Updating nginx configuration..."
sudo mkdir -p /opt/youmeyou/nginx-config
sudo cp "$SCRIPT_DIR/nginx-config/youmeyou-ssl.conf" /opt/youmeyou/nginx-config/
echo "✅ Nginx configuration updated with WiFi IP range"

# Step 4: Check SSL certificates
echo ""
echo "🔐 Step 4: Checking SSL certificates..."
SSL_DIR="/opt/youmeyou/ssl-certs"

if [ ! -f "$SSL_DIR/youmeyou.ai-fullchain.pem" ]; then
    echo "⚠️  SSL certificate missing for youmeyou.ai"
    echo "   Certificate path: $SSL_DIR/youmeyou.ai-fullchain.pem"
    echo "   This is causing the 'Not Secure' warning"
    echo ""
    echo "🔧 To fix SSL certificate:"
    echo "   1. Generate SSL certificate for youmeyou.ai domain"
    echo "   2. Place certificates in $SSL_DIR/"
    echo "   3. Restart nginx gateway"
else
    echo "✅ SSL certificate exists for youmeyou.ai"
    # Check certificate validity
    openssl x509 -in "$SSL_DIR/youmeyou.ai-fullchain.pem" -text -noout | grep -E "(Subject:|Not After)"
fi

if [ ! -f "$SSL_DIR/staging.youmeyou.ai-fullchain.pem" ]; then
    echo "⚠️  SSL certificate missing for staging.youmeyou.ai"
else
    echo "✅ SSL certificate exists for staging.youmeyou.ai"
fi

# Step 5: Deployment instructions
echo ""
echo "🚀 Step 5: Deployment Steps in Portainer:"
echo "========================================"
echo ""
echo "1. 🔐 Update Auth Microservice Stack:"
echo "   - File: 1-auth-microservice.yml"
echo "   - This will pull the new image with CORS fix"
echo "   - Wait for healthy status"
echo ""
echo "2. 🌐 Restart Gateway Service Stack:"
echo "   - File: 4-gateway-service-ssl.yml"
echo "   - This will apply the WiFi IP range restriction"
echo "   - Wait for healthy status"
echo ""

# Step 6: Testing commands
echo "🧪 Step 6: Testing Commands:"
echo "==========================="
echo ""
echo "# Test CORS fix (should not see localhost:3001 errors):"
echo "curl -H 'Origin: https://staging.youmeyou.ai' https://staging.youmeyou.ai/api/auth/health"
echo ""
echo "# Test SSL certificate:"
echo "curl -I https://youmeyou.ai"
echo "openssl s_client -connect youmeyou.ai:443 -servername youmeyou.ai < /dev/null"
echo ""
echo "# Test IP restriction (should work from your WiFi):"
echo "curl https://portainer-staging.youmeyou.ai"
echo ""

# Step 7: Expected results
echo "📊 Expected Results After Deployment:"
echo "====================================="
echo ""
echo "✅ CORS Errors Fixed:"
echo "   • No more 'localhost:3001' requests from browser"
echo "   • API calls go through nginx proxy (/api/auth, /api/design)"
echo "   • Proper CORS headers from auth service"
echo ""
echo "✅ SSL Certificate:"
echo "   • youmeyou.ai shows as 'Secure' in browser"
echo "   • No 'NET::ERR_CERT_COMMON_NAME_INVALID' errors"
echo ""
echo "✅ IP Restrictions:"
echo "   • Full WiFi network range (106.222.232.0/24) has access"
echo "   • Production ready for your office/home network"
echo ""

# Step 8: Troubleshooting
echo "🔍 Troubleshooting:"
echo "=================="
echo ""
echo "If CORS errors persist:"
echo "• Check browser console for exact error messages"
echo "• Verify auth service container has restarted"
echo "• Check auth service logs: docker logs youmeyou-auth-service"
echo ""
echo "If SSL errors persist:"
echo "• Verify certificate files exist in /opt/youmeyou/ssl-certs/"
echo "• Check nginx logs: docker logs youmeyou-gateway"
echo "• Restart nginx container"
echo ""
echo "If IP restriction issues:"
echo "• Check your current IP: curl ifconfig.me"
echo "• Verify it's in 106.222.232.0/24 range"
echo "• Update nginx geo block if needed"

echo ""
echo "🎉 Ready for targeted deployment!"
echo "   Only auth service and gateway need to be redeployed." 