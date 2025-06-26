#!/bin/bash

# CPU Models Deployment Script for VM
# This script should be run on the GCP VM

set -e

# Configuration
REPO_DIR="/home/seemantishukla/youmeyou-platform"
STACK_NAME="cpu-models"
REGISTRY_URL="registry-staging.youmeyou.ai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Main deployment function
main() {
    print_status "Starting CPU Models deployment on VM..."
    
    # Check if we're in the right directory
    if [ ! -d "$REPO_DIR" ]; then
        print_error "Repository directory not found: $REPO_DIR"
        print_error "Please make sure the code is pulled to the VM first"
        exit 1
    fi
    
    cd "$REPO_DIR"
    
    # Pull latest changes
    print_status "Pulling latest changes from Git..."
    git pull origin main
    
    # Navigate to the CPU models directory
    cd infrastructure/portainer-stacks-working
    
    # Make build script executable
    chmod +x build-cpu-models.sh
    
    # Build and push all CPU model images
    print_status "Building and pushing CPU model images..."
    ./build-cpu-models.sh
    
    if [ $? -eq 0 ]; then
        print_success "All images built and pushed successfully!"
    else
        print_error "Failed to build/push images"
        exit 1
    fi
    
    # Deploy the stack via Portainer API (optional)
    print_status "CPU Models stack ready for deployment!"
    print_status "You can now deploy the stack in Portainer using: 6-cpu-models.yml"
    
    # Show available images
    print_status "Available images in registry:"
    echo "  - ${REGISTRY_URL}/youmeyou/cpu-models-gateway:latest"
    echo "  - ${REGISTRY_URL}/youmeyou/cpu-models-flan-t5:latest"
    echo "  - ${REGISTRY_URL}/youmeyou/cpu-models-distilbert:latest"
    echo "  - ${REGISTRY_URL}/youmeyou/cpu-models-codebert:latest"
    
    print_success "Deployment preparation complete!"
    print_status "Next steps:"
    echo "  1. Go to Portainer UI"
    echo "  2. Create new stack with name: cpu-models"
    echo "  3. Copy content from 6-cpu-models.yml"
    echo "  4. Deploy the stack"
    echo "  5. Test endpoints once containers are healthy"
    
    print_status "Expected API endpoints after deployment:"
    echo "  - Gateway Health: http://VM_IP:8000/health"
    echo "  - Intelligent Routing: http://VM_IP:8000/route"
    echo "  - Direct FLAN-T5: http://VM_IP:8000/cpu-models/flan-t5/generate"
    echo "  - Direct DistilBERT: http://VM_IP:8000/cpu-models/distilbert/classify"
    echo "  - Direct CodeBERT: http://VM_IP:8000/cpu-models/codebert/analyze"
}

# Run main function
main "$@" 