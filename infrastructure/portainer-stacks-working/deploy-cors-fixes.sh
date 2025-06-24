#!/bin/bash

# Deploy CORS Fixes and Configuration Updates
# This script builds and deploys all services with the updated CORS and configuration fixes

set -e

echo "🚀 Starting CORS fixes and configuration deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_TOKEN="${1:-}"
REGISTRY="localhost:5000"
PROJECT_ROOT="/home/seemantishukla/youmeyou-platform"

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ Error: GitHub token is required${NC}"
    echo "Usage: $0 <github_token>"
    exit 1
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Registry: $REGISTRY"
echo "  Project Root: $PROJECT_ROOT"
echo "  GitHub Token: [PROVIDED]"
echo ""

# Function to check if we're on the VM
check_vm_environment() {
    if [ ! -d "$PROJECT_ROOT" ]; then
        echo -e "${RED}❌ Error: Project directory not found at $PROJECT_ROOT${NC}"
        echo "This script should be run on the deployment VM"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Error: Docker not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ VM environment verified${NC}"
}

# Function to update code from GitHub
update_code() {
    echo -e "${YELLOW}📥 Updating code from GitHub...${NC}"
    cd "$PROJECT_ROOT"
    
    # Configure git with token
    git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
    
    # Pull latest changes
    git pull origin main
    
    echo -e "${GREEN}✅ Code updated successfully${NC}"
}

# Function to build and push a service
build_and_push_service() {
    local service_name=$1
    local service_path=$2
    local dockerfile_path=$3
    
    echo -e "${YELLOW}🔨 Building $service_name...${NC}"
    
    cd "$PROJECT_ROOT/$service_path"
    
    # Build the Docker image
    docker build -t "$REGISTRY/youmeyou/$service_name:latest" -f "$dockerfile_path" .
    
    # Push to registry
    docker push "$REGISTRY/youmeyou/$service_name:latest"
    
    echo -e "${GREEN}✅ $service_name built and pushed successfully${NC}"
}

# Function to deploy a stack
deploy_stack() {
    local stack_name=$1
    local stack_file=$2
    
    echo -e "${YELLOW}🚀 Deploying $stack_name...${NC}"
    
    cd "$PROJECT_ROOT/infrastructure/portainer-stacks-working"
    
    # Check if stack exists and remove it
    if docker stack ls | grep -q "$stack_name"; then
        echo "  Removing existing stack..."
        docker stack rm "$stack_name"
        
        # Wait for stack to be completely removed
        echo "  Waiting for stack removal..."
        while docker stack ls | grep -q "$stack_name"; do
            sleep 2
        done
        sleep 5  # Additional wait for cleanup
    fi
    
    # Deploy new stack
    docker stack deploy -c "$stack_file" "$stack_name"
    
    echo -e "${GREEN}✅ $stack_name deployed successfully${NC}"
}

# Function to wait for service health
wait_for_service_health() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $service_name to be healthy...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if docker service ls --filter "name=$service_name" --format "table {{.Name}}\t{{.Replicas}}" | grep -q "1/1"; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi
        
        echo "  Attempt $attempt/$max_attempts - waiting..."
        sleep 10
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to become healthy${NC}"
    return 1
}

# Main deployment process
main() {
    echo -e "${BLUE}🔍 Checking VM environment...${NC}"
    check_vm_environment
    
    echo -e "${BLUE}📥 Updating code...${NC}"
    update_code
    
    echo -e "${BLUE}🔨 Building all services...${NC}"
    
    # Build Auth Service
    build_and_push_service "auth-service" "services/auth-microservice" "backend/Dockerfile"
    
    # Build Design Service  
    build_and_push_service "design-service" "services/design-microservice" "Dockerfile"
    
    # Build Payment Service
    build_and_push_service "payment-service" "services/payment-microservice" "backend/Dockerfile"
    
    # Build Web Application
    build_and_push_service "codaloo-web" "web" "Dockerfile"
    
    echo -e "${BLUE}🚀 Deploying all stacks...${NC}"
    
    # Deploy in order (dependencies first)
    deploy_stack "auth-stack" "1-auth-microservice.yml"
    wait_for_service_health "auth-stack_auth-service"
    
    deploy_stack "design-stack" "2-design-microservice.yml"
    wait_for_service_health "design-stack_design-service"
    
    deploy_stack "payment-stack" "3-payment-microservice.yml"
    wait_for_service_health "payment-stack_payment-service"
    
    deploy_stack "web-stack" "5-codaloo-web.yml"
    wait_for_service_health "web-stack_codaloo-web"
    
    echo -e "${GREEN}🎉 All services deployed successfully!${NC}"
    
    echo -e "${BLUE}📊 Deployment Summary:${NC}"
    echo "  ✅ Auth Service: Updated CORS configuration"
    echo "  ✅ Design Service: Updated CORS configuration"  
    echo "  ✅ Payment Service: Updated CORS configuration and health check"
    echo "  ✅ Web Application: Updated frontend configuration"
    echo ""
    echo -e "${BLUE}🔧 Configuration Changes:${NC}"
    echo "  • Standardized CORS origins across all services"
    echo "  • Fixed frontend API URL configuration"
    echo "  • Updated auth service URL references"
    echo "  • Improved health check reliability"
    echo ""
    echo -e "${BLUE}🌐 Access URLs:${NC}"
    echo "  • Main Site: https://staging.youmeyou.ai"
    echo "  • Production: https://youmeyou.ai"
    echo "  • Registry: http://localhost:5000/v2/_catalog"
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
}

# Run main function
main 