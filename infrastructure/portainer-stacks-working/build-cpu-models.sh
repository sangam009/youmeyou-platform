#!/bin/bash

# CPU Models Build and Push Script
# Builds all CPU model services and pushes to registry

set -e

# Configuration
REGISTRY_URL="registry-staging.youmeyou.ai"
VERSION="v1.0.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to build and push a service
build_and_push() {
    local service_name=$1
    local service_path=$2
    
    print_status "Building $service_name..."
    
    # Navigate to service directory
    cd "$service_path"
    
    # Build the image
    docker build -t "${REGISTRY_URL}/youmeyou/cpu-models-${service_name}:${VERSION}" \
                 -t "${REGISTRY_URL}/youmeyou/cpu-models-${service_name}:latest" .
    
    if [ $? -eq 0 ]; then
        print_success "Built $service_name successfully"
        
        # Push the image
        print_status "Pushing $service_name to registry..."
        docker push "${REGISTRY_URL}/youmeyou/cpu-models-${service_name}:${VERSION}"
        docker push "${REGISTRY_URL}/youmeyou/cpu-models-${service_name}:latest"
        
        if [ $? -eq 0 ]; then
            print_success "Pushed $service_name successfully"
        else
            print_error "Failed to push $service_name"
            return 1
        fi
    else
        print_error "Failed to build $service_name"
        return 1
    fi
    
    # Return to original directory
    cd - > /dev/null
}

# Function to build gateway with different naming
build_and_push_gateway() {
    local service_path="cpu-models/gateway"
    
    print_status "Building gateway..."
    
    # Navigate to service directory
    cd "$service_path"
    
    # Build the image (gateway uses different naming)
    docker build -t "${REGISTRY_URL}/youmeyou/cpu-models-gateway:${VERSION}" \
                 -t "${REGISTRY_URL}/youmeyou/cpu-models-gateway:latest" .
    
    if [ $? -eq 0 ]; then
        print_success "Built gateway successfully"
        
        # Push the image
        print_status "Pushing gateway to registry..."
        docker push "${REGISTRY_URL}/youmeyou/cpu-models-gateway:${VERSION}"
        docker push "${REGISTRY_URL}/youmeyou/cpu-models-gateway:latest"
        
        if [ $? -eq 0 ]; then
            print_success "Pushed gateway successfully"
        else
            print_error "Failed to push gateway"
            return 1
        fi
    else
        print_error "Failed to build gateway"
        return 1
    fi
    
    # Return to original directory
    cd - > /dev/null
}

# Main execution
main() {
    print_status "Starting CPU Models build process..."
    print_status "Registry: $REGISTRY_URL"
    print_status "Version: $VERSION"
    echo ""
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check registry connectivity
    print_status "Testing registry connectivity..."
    if ! curl -s "https://${REGISTRY_URL}/v2/" > /dev/null; then
        print_warning "Cannot reach registry at $REGISTRY_URL"
        print_warning "Make sure the registry is running and accessible"
    else
        print_success "Registry is accessible"
    fi
    
    echo ""
    
    # Build services
    local base_path="cpu-models"
    local services=("flan-t5" "distilbert" "codebert")
    
    for service in "${services[@]}"; do
        service_path="${base_path}/${service}"
        
        if [ -d "$service_path" ]; then
            build_and_push "$service" "$service_path"
            echo ""
        else
            print_error "Service directory not found: $service_path"
            exit 1
        fi
    done
    
    # Build gateway separately
    build_and_push_gateway
    echo ""
    
    print_success "All CPU model services built and pushed successfully!"
    print_status "Images available:"
    
    for service in "${services[@]}"; do
        echo "  - ${REGISTRY_URL}/youmeyou/cpu-models-${service}:${VERSION}"
        echo "  - ${REGISTRY_URL}/youmeyou/cpu-models-${service}:latest"
    done
    echo "  - ${REGISTRY_URL}/youmeyou/cpu-models-gateway:${VERSION}"
    echo "  - ${REGISTRY_URL}/youmeyou/cpu-models-gateway:latest"
    
    echo ""
    print_status "You can now deploy the Portainer stack with these images."
}

# Run main function
main "$@" 