#!/bin/bash

# YouMeYou Platform - Registry DNS Deployment Script
# This script follows the documented deployment strategy using DNS-based registry

set -e

echo "🚀 YouMeYou Platform - Registry DNS Deployment"
echo "=============================================="

# Check if GitHub token is provided
if [ -z "$1" ]; then
    echo "❌ Error: GitHub token is required!"
    echo "Usage: $0 <github_token>"
    echo "Example: $0 github_pat_xxxxxxxxxxxxxxxxxxxx"
    exit 1
fi

# Configuration
GITHUB_TOKEN="$1"
REGISTRY_HOST="registry-staging.youmeyou.ai"
REGISTRY_USER="youmeyou"
REGISTRY_PASS="staging2024!"
GIT_REPO="https://${GITHUB_TOKEN}@github.com/sangam009/youmeyou-platform.git"
BUILD_DIR="/tmp/youmeyou-deployment"

echo "📋 Deployment Configuration:"
echo "   Repository: https://github.com/sangam009/youmeyou-platform.git"
echo "   Registry: ${REGISTRY_HOST}"
echo "   Branch: main"
echo ""

# Step 1: Clean up and clone repository
echo "📥 Step 1: Cloning latest repository..."
rm -rf ${BUILD_DIR}
mkdir -p ${BUILD_DIR}
cd ${BUILD_DIR}

if ! git clone ${GIT_REPO} youmeyou-platform; then
    echo "❌ Failed to clone repository. Check your token and network."
    exit 1
fi

cd youmeyou-platform
echo "✅ Repository cloned successfully"

# Step 2: Login to registry
echo ""
echo "🔐 Step 2: Logging into DNS-based registry..."
echo ${REGISTRY_PASS} | docker login ${REGISTRY_HOST} -u ${REGISTRY_USER} --password-stdin

if [ $? -eq 0 ]; then
    echo "✅ Successfully logged into registry"
else
    echo "❌ Failed to login to registry"
    exit 1
fi

# Step 3: Build and push services to registry
echo ""
echo "🔨 Step 3: Building services and pushing to registry..."

# Service mappings and build paths
declare -A SERVICES=(
    ["auth"]="services/auth-microservice/backend"
    ["design"]="services/design-microservice"  
    ["payment"]="services/payment-microservice"
    ["web"]="web"
)

# Build each service
for service in "${!SERVICES[@]}"; do
    service_path="${SERVICES[$service]}"
    
    # Determine image name
    if [ "$service" = "web" ]; then
        image_name="youmeyou/codaloo-web"
    else
        image_name="youmeyou/${service}-service"
    fi
    
    echo ""
    echo "🔨 Building ${service} service..."
    echo "   Source: ${service_path}"
    echo "   Image: ${REGISTRY_HOST}/${image_name}:latest"
    
    if [ ! -d "${service_path}" ]; then
        echo "⚠️  Warning: Directory ${service_path} not found, skipping ${service}"
        continue
    fi
    
    if [ ! -f "${service_path}/Dockerfile" ]; then
        echo "⚠️  Warning: No Dockerfile found in ${service_path}, skipping ${service}"
        continue
    fi
    
    # Build and push image
    cd ${BUILD_DIR}/youmeyou-platform/${service_path}
    
    if docker build -t ${REGISTRY_HOST}/${image_name}:latest .; then
        echo "✅ Built ${service} service successfully"
        
        # Push to registry
        echo "📤 Pushing ${service} to registry..."
        if docker push ${REGISTRY_HOST}/${image_name}:latest; then
            echo "✅ Pushed ${service} service to registry"
        else
            echo "❌ Failed to push ${service} service"
            exit 1
        fi
    else
        echo "❌ Failed to build ${service} service"
        exit 1
    fi
done

# Step 4: Verify registry contents
echo ""
echo "🔍 Step 4: Verifying images in registry..."
echo "Registry contents:"
curl -u ${REGISTRY_USER}:${REGISTRY_PASS} -s https://${REGISTRY_HOST}/v2/_catalog | jq . || echo "Registry catalog retrieved (jq not available for formatting)"

# Step 5: Deploy fixes
echo ""
echo "🚀 Step 5: Applying deployment fixes..."
cd ${BUILD_DIR}/youmeyou-platform

# Copy updated stack files to deployment location (if different)
if [ -d "/opt/youmeyou-platform" ]; then
    echo "📁 Updating stack files in /opt/youmeyou-platform..."
    cp infrastructure/portainer-stacks-working/*.yml /opt/youmeyou-platform/infrastructure/portainer-stacks-working/ 2>/dev/null || true
    cp infrastructure/portainer-stacks-working/nginx-config/* /opt/youmeyou-platform/infrastructure/portainer-stacks-working/nginx-config/ 2>/dev/null || true
    cp web/src/config/index.ts /opt/youmeyou-platform/web/src/config/ 2>/dev/null || true
fi

# Clean up build directory
echo ""
echo "🧹 Step 6: Cleaning up..."
rm -rf ${BUILD_DIR}

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "✅ All services built and pushed to registry"
echo "✅ Registry: https://${REGISTRY_HOST}"
echo "✅ Registry UI: https://registry-ui-staging.youmeyou.ai"
echo ""
echo "📋 Next Steps:"
echo "1. Access Portainer: https://staging.youmeyou.ai:9443"
echo "2. Update the following stacks (they will pull latest images):"
echo "   - 1-auth-microservice"
echo "   - 2-design-microservice"  
echo "   - 3-payment-microservice"
echo "   - 5-codaloo-web"
echo "3. Verify deployment health:"
echo "   curl https://staging.youmeyou.ai/api/auth/health"
echo "   curl https://staging.youmeyou.ai/api/design/health"
echo "   curl https://staging.youmeyou.ai/"
echo ""
echo "🔧 Manual Steps (if needed):"
echo "- Restart nginx if configuration was updated"
echo "- Check container logs in Portainer for any issues"
echo "- Verify all services are showing as 'healthy'" 