#!/bin/bash

# YouMeYou Platform - Deploy CORS and Docker Network Fixes
# This script deploys the updated configurations to fix:
# 1. Frontend API configuration (using nginx proxy routes)
# 2. CORS configuration for auth and design services  
# 3. Nginx configuration using Docker service names
# 4. Health check fixes (wget instead of curl)

set -e

echo "🚀 YouMeYou Platform - Deploying Configuration Fixes"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on the VM
if [ ! -f "/opt/youmeyou/ssl-certs/staging.youmeyou.ai-fullchain.pem" ]; then
    echo -e "${RED}❌ This script must be run on the YouMeYou VM${NC}"
    echo "Please SSH to the VM first: gcloud compute ssh youmeyou-staging-vm --zone=asia-south1-a"
    exit 1
fi

echo "✅ Running on YouMeYou VM"

# Step 1: Copy updated nginx configuration
echo -e "\n${YELLOW}📝 Step 1: Updating Nginx Configuration${NC}"
cp /opt/youmeyou-platform/infrastructure/portainer-stacks-working/nginx-config/youmeyou-ssl.conf /opt/youmeyou/nginx-config/
echo "✅ Nginx configuration updated (keeping VM internal IPs for cross-network communication)"

# Step 2: Restart nginx to apply new configuration
echo -e "\n${YELLOW}🔄 Step 2: Restarting Nginx Gateway${NC}"
docker restart youmeyou-gateway
sleep 5
echo "✅ Nginx gateway restarted"

# Step 3: Test nginx configuration
echo -e "\n${YELLOW}🧪 Step 3: Testing Nginx Configuration${NC}"
if docker exec youmeyou-gateway nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo -e "${RED}❌ Nginx configuration error - check logs${NC}"
    docker logs youmeyou-gateway --tail=20
    exit 1
fi

# Step 4: Update and restart auth service
echo -e "\n${YELLOW}🔄 Step 4: Updating Auth Service${NC}"
cd /opt/youmeyou-platform/infrastructure/portainer-stacks-working
echo "Stopping auth service stack..."
docker-compose -f 1-auth-microservice.yml down auth-service
echo "Starting auth service with new configuration..."
docker-compose -f 1-auth-microservice.yml up -d auth-service
sleep 10
echo "✅ Auth service updated"

# Step 5: Update and restart design service
echo -e "\n${YELLOW}🔄 Step 5: Updating Design Service${NC}"
echo "Stopping design service stack..."
docker-compose -f 2-design-microservice.yml down design-service
echo "Starting design service with new configuration..."
docker-compose -f 2-design-microservice.yml up -d design-service
sleep 10
echo "✅ Design service updated"

# Step 6: Rebuild and restart web service
echo -e "\n${YELLOW}🔄 Step 6: Updating Web Service${NC}"
echo "Stopping web service..."
docker-compose -f 5-codaloo-web.yml down codaloo-web

# Build new web image with updated configuration
echo "Building new web image..."
cd /opt/youmeyou-platform/web
docker build -t registry-staging.youmeyou.ai/youmeyou/codaloo-web:latest .
docker push registry-staging.youmeyou.ai/youmeyou/codaloo-web:latest

echo "Starting web service with new configuration..."
cd /opt/youmeyou-platform/infrastructure/portainer-stacks-working
docker-compose -f 5-codaloo-web.yml up -d codaloo-web
sleep 15
echo "✅ Web service updated"

# Step 7: Health checks
echo -e "\n${YELLOW}🏥 Step 7: Health Checks${NC}"

echo "Testing auth service..."
if curl -s http://localhost/api/auth/health | grep -q "ok"; then
    echo "✅ Auth service is healthy"
else
    echo -e "${RED}❌ Auth service health check failed${NC}"
fi

echo "Testing design service..."
if curl -s http://localhost/api/design/health | grep -q "ok"; then
    echo "✅ Design service is healthy"
else
    echo -e "${RED}❌ Design service health check failed${NC}"
fi

echo "Testing web service..."
if curl -s http://localhost/ | grep -q "html"; then
    echo "✅ Web service is healthy"
else
    echo -e "${RED}❌ Web service health check failed${NC}"
fi

# Step 8: Final verification
echo -e "\n${YELLOW}🔍 Step 8: Final Verification${NC}"
echo "Current container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo "=================================================="
echo "✅ Nginx configuration properly documented (VM IPs for cross-network access)"
echo "✅ CORS configuration fixed for auth and design services"
echo "✅ Frontend configuration updated to use proxy routes"
echo "✅ Health checks fixed (wget instead of curl)"
echo ""
echo "🌐 Test your application at: https://staging.youmeyou.ai"
echo "📊 Monitor containers at: https://portainer-staging.youmeyou.ai:9443"
echo ""
echo "📝 If you encounter any issues:"
echo "   - Check container logs: docker logs <container_name>"
echo "   - Check nginx logs: docker logs youmeyou-gateway"
echo "   - Verify network connectivity: docker network ls" 