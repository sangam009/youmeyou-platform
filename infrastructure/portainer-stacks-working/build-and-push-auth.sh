#!/bin/bash

echo "🏗️ Building and Pushing Auth Service to Private Registry"
echo "========================================================"

# Registry configuration
REGISTRY_HOST="34.93.209.77:5000"
REGISTRY_USER="youmeyou"
REGISTRY_PASS="staging2024!"
IMAGE_NAME="youmeyou/auth-service"
VERSION="staging-$(date +%Y%m%d-%H%M%S)"

# Step 1: Login to private registry
echo "🔐 Logging into private registry..."
echo $REGISTRY_PASS | docker login $REGISTRY_HOST -u $REGISTRY_USER --password-stdin

# Step 2: Clone/update repository
if [ ! -d "/tmp/arch_tool" ]; then
    echo "📥 Cloning repository..."
    git clone https://github.com/seemantshukla/arch_tool.git /tmp/arch_tool
else
    echo "📥 Updating repository..."
    cd /tmp/arch_tool && git pull origin main
fi

# Step 3: Build the image
echo "🔨 Building auth service image..."
cd /tmp/arch_tool/authmicroservice/backend

# Build with version tag
docker build -t $REGISTRY_HOST/$IMAGE_NAME:$VERSION .
docker build -t $REGISTRY_HOST/$IMAGE_NAME:latest .

# Step 4: Push to registry
echo "📤 Pushing to private registry..."
docker push $REGISTRY_HOST/$IMAGE_NAME:$VERSION
docker push $REGISTRY_HOST/$IMAGE_NAME:latest

echo "✅ Auth service successfully pushed to private registry!"
echo "📋 Available images:"
echo "   - $REGISTRY_HOST/$IMAGE_NAME:$VERSION"
echo "   - $REGISTRY_HOST/$IMAGE_NAME:latest"
echo ""
echo "🚀 Now deploy using auth-service-registry.yml in Portainer" 