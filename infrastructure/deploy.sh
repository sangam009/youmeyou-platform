#!/bin/bash

# Codaloo Production Deployment Script for Portainer
# Domain: youmeyou.ai

set -e

echo "🚀 Starting Codaloo Production Deployment"
echo "🌐 Domain: youmeyou.ai"
echo "📦 Using Portainer for container management"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create external network
print_status "Creating external network: codaloo-network"
docker network create codaloo-network --driver bridge || print_warning "Network already exists"

# Create Portainer admin password secret
print_status "Setting up Portainer admin password"
if [ ! -f "/tmp/portainer_admin_password" ]; then
    read -s -p "Enter Portainer admin password: " PORTAINER_PASSWORD
    echo
    echo "$PORTAINER_PASSWORD" | docker secret create portainer_admin_password - || print_warning "Secret already exists"
else
    docker secret create portainer_admin_password /tmp/portainer_admin_password || print_warning "Secret already exists"
fi

# Deploy Portainer first
print_status "Deploying Portainer CE..."
docker-compose -f portainer.yml up -d

# Wait for Portainer to be ready
print_status "Waiting for Portainer to be ready..."
sleep 30

# Function to deploy a stack
deploy_stack() {
    local stack_name=$1
    local stack_file=$2
    
    print_status "Deploying $stack_name..."
    docker-compose -f "$stack_file" --env-file production.env up -d
    
    if [ $? -eq 0 ]; then
        print_status "$stack_name deployed successfully"
    else
        print_error "Failed to deploy $stack_name"
        exit 1
    fi
}

# Deploy database stacks first
print_status "📊 Deploying Database Layer..."
deploy_stack "Auth MySQL" "auth-mysql.yml"
deploy_stack "Design MySQL" "design-mysql.yml"
deploy_stack "Payment MySQL" "payment-mysql.yml"
deploy_stack "MongoDB" "mongodb.yml"
deploy_stack "Redis" "redis.yml"

# Wait for databases to be ready
print_status "⏳ Waiting for databases to initialize..."
sleep 60

# Deploy service stacks
print_status "🔧 Deploying Service Layer..."
deploy_stack "Auth Service" "auth-service.yml"
deploy_stack "Design Service" "design-service.yml"
deploy_stack "Payment Service" "payment-service.yml"

# Wait for services to be ready
print_status "⏳ Waiting for services to initialize..."
sleep 30

# Deploy web application
print_status "🌐 Deploying Web Application..."
deploy_stack "Web App" "web-app.yml"

# Deploy monitoring (optional)
read -p "Do you want to deploy monitoring stack? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "📈 Deploying Monitoring Stack..."
    deploy_stack "Monitoring" "monitoring.yml"
fi

print_status "✅ Deployment completed successfully!"
echo
echo "🎉 Codaloo is now running on youmeyou.ai"
echo
echo "📋 Access URLs:"
echo "   🌐 Main App: https://youmeyou.ai"
echo "   🔐 Auth API: https://auth.youmeyou.ai"
echo "   🎨 Design API: https://design.youmeyou.ai"
echo "   💳 Payment API: https://payment.youmeyou.ai"
echo "   📦 Portainer: http://your-server-ip:9000"
echo "   📊 Grafana: http://your-server-ip:3001 (if deployed)"
echo
echo "⚠️  Next Steps:"
echo "   1. Configure your domain DNS to point to this server"
echo "   2. Set up SSL certificates (Let's Encrypt recommended)"
echo "   3. Configure firewall rules"
echo "   4. Update production.env with real values"
echo "   5. Access Portainer to manage your stacks"
echo
print_status "Happy coding! 🚀" 