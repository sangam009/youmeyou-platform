#!/bin/bash

# Check if GitHub token is provided
if [ -z "$1" ]; then
    echo "❌ Error: GitHub token is required!"
    echo "Usage: $0 <github_token>"
    echo "Example: $0 ghp_xxxxxxxxxxxxxxxxxxxx"
    exit 1
fi

GITHUB_TOKEN="$1"

echo "🏗️ Building All YouMeYou Services from Private Git Repository"
echo "============================================================="

# Configuration
REGISTRY_HOST="registry-staging.youmeyou.ai"
REGISTRY_USER="youmeyou"
REGISTRY_PASS="staging2024!"
GIT_REPO="https://${GITHUB_TOKEN}@github.com/sangam009/youmeyou-platform.git"
GIT_BRANCH="main"
BUILD_DIR="/tmp/youmeyou-build"
VERSION="staging-$(date +%Y%m%d-%H%M%S)"

echo "📋 Build Configuration:"
echo "   Repository: https://github.com/sangam009/youmeyou-platform.git"
echo "   Branch: ${GIT_BRANCH}"
echo "   Registry: ${REGISTRY_HOST}"
echo "   Version: ${VERSION}"
echo ""

# Service mappings
declare -A SERVICES=(
    ["auth"]="services/auth-microservice/backend"
    ["design"]="services/design-microservice"  
    ["payment"]="services/payment-microservice"
    ["codaloo-web"]="web"
    ["cpu-models-gateway"]="infrastructure/portainer-stacks-working/cpu-models/gateway"
    ["cpu-models-flan-t5"]="infrastructure/portainer-stacks-working/cpu-models/flan-t5"
    ["cpu-models-distilbert"]="infrastructure/portainer-stacks-working/cpu-models/distilbert"
    ["cpu-models-codebert"]="infrastructure/portainer-stacks-working/cpu-models/codebert"
    ["cpu-models-mistral-7b"]="infrastructure/portainer-stacks-working/cpu-models/mistral-7b"
)

# Clean up previous builds
echo "🧹 Cleaning up previous builds..."
rm -rf ${BUILD_DIR}
mkdir -p ${BUILD_DIR}

# Clone repository
echo "📥 Cloning repository..."
cd ${BUILD_DIR}
if ! git clone ${GIT_REPO} .; then
    echo "❌ Failed to clone repository. Check your token permissions."
    exit 1
fi

echo "✅ Repository cloned successfully"

# Login to registry
echo "🔐 Logging into registry..."
echo ${REGISTRY_PASS} | docker login ${REGISTRY_HOST} -u ${REGISTRY_USER} --password-stdin

# Build each service
for service in "${!SERVICES[@]}"; do
    service_path="${SERVICES[$service]}"
    
    # Special naming for different service types
    if [ "$service" = "codaloo-web" ]; then
        image_name="youmeyou/codaloo-web"
    elif [[ "$service" == cpu-models-* ]]; then
        image_name="youmeyou/${service}"
    else
        image_name="youmeyou/${service}-service"
    fi
    
    echo ""
    echo "🔨 Building ${service} service..."
    echo "   Source: ${service_path}"
    echo "   Image: ${REGISTRY_HOST}/${image_name}:${VERSION}"
    
    if [ ! -d "${service_path}" ]; then
        echo "⚠️  Warning: Directory ${service_path} not found, skipping ${service}"
        continue
    fi
    
    # Check for Dockerfile
    if [ ! -f "${service_path}/Dockerfile" ]; then
        echo "⚠️  Warning: No Dockerfile found in ${service_path}, skipping ${service}"
        continue
    fi
    
    # Build image
    cd ${BUILD_DIR}/${service_path}
    if docker build -t ${REGISTRY_HOST}/${image_name}:${VERSION} -t ${REGISTRY_HOST}/${image_name}:latest .; then
        echo "✅ Built ${service} service successfully"
        
        # Push to registry
        echo "📤 Pushing ${service} to registry..."
        docker push ${REGISTRY_HOST}/${image_name}:${VERSION}
        docker push ${REGISTRY_HOST}/${image_name}:latest
        echo "✅ Pushed ${service} service to registry"
    else
        echo "❌ Failed to build ${service} service"
    fi
    
    cd ${BUILD_DIR}
done

# Clean up
echo ""
echo "🧹 Cleaning up build directory..."
rm -rf ${BUILD_DIR}

echo ""
echo "🎉 Build Complete!"
echo "============================================"
echo "All services built and pushed to registry:"
echo "   Registry: http://34.93.209.77:5000"
echo "   Registry UI: http://34.93.209.77:5001"
echo ""
echo "Next steps:"
echo "1. Deploy database services via Portainer"
echo "2. Deploy application services using registry images"
echo "3. Configure gateway for external access" 