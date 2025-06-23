#!/bin/bash

# 🌐 Create YouMeYou Networks
# This script creates the Docker networks needed for the YouMeYou platform

echo "🌐 Creating YouMeYou Docker Networks..."

# Create public network for external-facing services
echo "Creating youmeyou-public network..."
docker network create youmeyou-public \
  --driver bridge \
  --label "com.youmeyou.network=public" \
  --label "com.youmeyou.environment=staging" \
  --label "com.youmeyou.tier=frontend" || echo "Network youmeyou-public already exists"

# Create internal network for service-to-service communication
echo "Creating youmeyou-internal network..."
docker network create youmeyou-internal \
  --driver bridge \
  --label "com.youmeyou.network=internal" \
  --label "com.youmeyou.environment=staging" \
  --label "com.youmeyou.tier=backend" || echo "Network youmeyou-internal already exists"

# Create database network for data layer
echo "Creating youmeyou-data network..."
docker network create youmeyou-data \
  --driver bridge \
  --label "com.youmeyou.network=data" \
  --label "com.youmeyou.environment=staging" \
  --label "com.youmeyou.tier=database" || echo "Network youmeyou-data already exists"

echo "✅ Networks created successfully!"
echo ""
echo "📋 Network List:"
docker network ls | grep youmeyou

echo ""
echo "🚀 You can now deploy the gateway and other services!" 