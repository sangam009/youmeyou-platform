#!/bin/bash

# Check if required parameters are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Error: GitHub token and service name are required!"
    echo "Usage: $0 <github_token> <service_name>"
    echo "Available services: auth, design, payment"
    echo "Example: $0 ghp_xxxxxxxxxxxxxxxxxxxx auth"
    exit 1
fi

GITHUB_TOKEN="$1"
SERVICE_NAME="$2"

echo "🔨 Building Single YouMeYou Service from Private Git Repository"
echo "==============================================================="

# Configuration
REGISTRY_HOST="registry-staging.youmeyou.ai"
REGISTRY_USER="youmeyou"
REGISTRY_PASS="staging2024!"
GIT_REPO="https://${GITHUB_TOKEN}@github.com/sangam009/youmeyou-platform.git"
GIT_BRANCH="main"
BUILD_DIR="/tmp/youmeyou-build-single"
VERSION="staging-$(date +%Y%m%d-%H%M%S)"

# Service mappings
declare -A SERVICES=(
    ["auth"]="services/auth-microservice/backend"
    ["design"]="services/design-microservice"  
    ["payment"]="services/payment-microservice"
)

# Validate service name
if [[ ! -v SERVICES[$SERVICE_NAME] ]]; then
    echo "❌ Invalid service name: $SERVICE_NAME"
    echo "Available services: ${!SERVICES[@]}"
    exit 1
fi

SERVICE_PATH="${SERVICES[$SERVICE_NAME]}"
IMAGE_NAME="youmeyou/${SERVICE_NAME}-service"

echo "📋 Build Configuration:"
echo "   Repository: https://github.com/sangam009/youmeyou-platform.git"
echo "   Branch: ${GIT_BRANCH}"
echo "   Service: ${SERVICE_NAME}"
echo "   Source Path: ${SERVICE_PATH}"
echo "   Registry: ${REGISTRY_HOST}"
echo "   Image: ${REGISTRY_HOST}/${IMAGE_NAME}:${VERSION}"
echo ""

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

# Check if service directory exists
if [ ! -d "${SERVICE_PATH}" ]; then
    echo "❌ Service directory ${SERVICE_PATH} not found!"
    exit 1
fi

# Check for Dockerfile
if [ ! -f "${SERVICE_PATH}/Dockerfile" ]; then
    echo "❌ No Dockerfile found in ${SERVICE_PATH}!"
    exit 1
fi

# Login to registry
echo "🔐 Logging into registry..."
echo ${REGISTRY_PASS} | docker login ${REGISTRY_HOST} -u ${REGISTRY_USER} --password-stdin

# Build service
echo ""
echo "🔨 Building ${SERVICE_NAME} service..."
cd ${BUILD_DIR}/${SERVICE_PATH}

if docker build -t ${REGISTRY_HOST}/${IMAGE_NAME}:${VERSION} -t ${REGISTRY_HOST}/${IMAGE_NAME}:latest .; then
    echo "✅ Built ${SERVICE_NAME} service successfully"
    
    # Push to registry
    echo "📤 Pushing ${SERVICE_NAME} to registry..."
    docker push ${REGISTRY_HOST}/${IMAGE_NAME}:${VERSION}
    docker push ${REGISTRY_HOST}/${IMAGE_NAME}:latest
    echo "✅ Pushed ${SERVICE_NAME} service to registry"
else
    echo "❌ Failed to build ${SERVICE_NAME} service"
    exit 1
fi

# Clean up
echo ""
echo "🧹 Cleaning up build directory..."
rm -rf ${BUILD_DIR}

echo ""
echo "🎉 ${SERVICE_NAME} Service Build Complete!"
echo "=========================================="
echo "Image: ${REGISTRY_HOST}/${IMAGE_NAME}:${VERSION}"
echo "Registry UI: http://34.93.209.77:5001"
echo ""
echo "Ready to deploy ${SERVICE_NAME} service via Portainer!" 