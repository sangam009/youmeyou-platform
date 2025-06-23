#!/bin/bash

# 🚀 Deploy Auth Service Stack
# This script deploys the auth service with proper DNS-based architecture

set -e

echo "🌐 Deploying YouMeYou Auth Service Stack..."

# Configuration
PORTAINER_URL="http://34.93.209.77:9000"
STACK_NAME_PREFIX="youmeyou"

echo "📋 Deployment Order for Auth Service:"
echo "1. Networks (if not exists)"
echo "2. Auth MySQL Database"
echo "3. Auth Redis Cache"
echo "4. Auth Service"
echo "5. Gateway (if not exists)"

# Function to check if stack exists
check_stack_exists() {
    local stack_name=$1
    echo "Checking if stack '$stack_name' exists..."
    # You would implement Portainer API call here
    # For now, we'll assume manual deployment
}

# Phase 1: Deploy Networks (if needed)
echo ""
echo "📡 Phase 1: Checking Networks..."
echo "Please ensure 'youmeyou-network' stack is deployed in Portainer"
echo "File: network.yml"

# Phase 2: Deploy Auth MySQL
echo ""
echo "🗄️  Phase 2: Deploying Auth MySQL..."
echo "Stack Name: ${STACK_NAME_PREFIX}-auth-mysql"
echo "File: auth-mysql.yml"
echo ""
echo "Configuration:"
echo "- Database: admin_backend"
echo "- User: kafeneo"
echo "- Password: kafeneo#009"
echo "- Internal DNS: auth-mysql:3306"
echo "- Network: youmeyou-data"
echo "- Public Access: DISABLED"

# Phase 3: Deploy Auth Redis
echo ""
echo "🔄 Phase 3: Deploying Auth Redis..."
echo "Stack Name: ${STACK_NAME_PREFIX}-auth-redis"
echo "File: auth-redis.yml"
echo ""
echo "Configuration:"
echo "- Password: auth_redis_password"
echo "- Internal DNS: auth-redis:6379"
echo "- Network: youmeyou-data"
echo "- Public Access: DISABLED"

# Phase 4: Deploy Auth Service
echo ""
echo "🔐 Phase 4: Deploying Auth Service..."
echo "Stack Name: ${STACK_NAME_PREFIX}-auth-service"
echo "File: auth-service.yml"
echo ""
echo "Configuration:"
echo "- Internal DNS: auth-service:3001"
echo "- Database Connection: auth-mysql:3306"
echo "- Redis Connection: auth-redis:6379"
echo "- Networks: youmeyou-data, youmeyou-internal"
echo "- Public Access: DISABLED (only via gateway)"

# Phase 5: Deploy Gateway (if needed)
echo ""
echo "🌐 Phase 5: Checking Gateway..."
echo "Stack Name: ${STACK_NAME_PREFIX}-gateway"
echo "File: gateway.yml"
echo ""
echo "Gateway Routes:"
echo "- /api/auth/* → auth-service:3001"
echo "- Public Access: ENABLED (ports 80, 443)"

echo ""
echo "🎯 Manual Deployment Steps:"
echo ""
echo "1. Open Portainer: $PORTAINER_URL"
echo "2. Go to Stacks section"
echo "3. Deploy in this order:"
echo "   a) youmeyou-network (network.yml)"
echo "   b) youmeyou-auth-mysql (auth-mysql.yml)"
echo "   c) youmeyou-auth-redis (auth-redis.yml)"
echo "   d) youmeyou-auth-service (auth-service.yml)"
echo "   e) youmeyou-gateway (gateway.yml)"
echo ""
echo "4. Wait for each stack to be 'running' before deploying the next"
echo ""

echo "🔍 Testing Commands:"
echo ""
echo "# Test internal DNS resolution"
echo "docker exec -it auth-service-prod nslookup auth-mysql"
echo "docker exec -it auth-service-prod nslookup auth-redis"
echo ""
echo "# Test auth service health"
echo "curl -I http://34.93.209.77/api/auth/health"
echo ""
echo "# Test database connection"
echo "docker exec -it auth-mysql-prod mysql -u kafeneo -p'kafeneo#009' -e 'SELECT 1;'"
echo ""
echo "# Test Redis connection"
echo "docker exec -it auth-redis-prod redis-cli -a auth_redis_password ping"

echo ""
echo "✅ Auth Service Stack Ready for Deployment!"
echo ""
echo "🔐 Security Features:"
echo "- Databases not publicly accessible"
echo "- Services isolated by network"
echo "- Only gateway has public ports"
echo "- Rate limiting at gateway level"
echo "- Internal DNS for service discovery" 