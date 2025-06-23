#!/bin/bash

# 🚀 Codaloo Platform - Complete Service Startup Script
# This script starts all microservices in the correct order

set -e

echo "🚀 Starting Codaloo Platform - All Services"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

print_info "Stopping any existing services..."
docker-compose down --remove-orphans 2>/dev/null || true

print_info "Cleaning up old containers and images..."
docker container prune -f > /dev/null 2>&1 || true

print_info "Building and starting all services..."
echo ""

# Start services with build
if docker-compose up --build -d; then
    print_status "All services started successfully!"
else
    print_error "Failed to start services. Check the logs above."
    exit 1
fi

echo ""
print_info "Waiting for services to become healthy..."
sleep 10

# Check service health
echo ""
echo "🔍 Service Health Check:"
echo "========================"

# Function to check service health
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-"/health"}
    
    if curl -s -f "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        print_status "$service_name (Port $port) - Healthy"
        return 0
    else
        print_warning "$service_name (Port $port) - Not Ready (may still be starting)"
        return 1
    fi
}

# Check all services
check_service "Frontend Web App" 3000 "/"
check_service "Design Microservice" 4000 "/health"
check_service "Auth Microservice" 3001 "/health"
check_service "Payment Microservice" 3002 "/health"

echo ""
echo "🗄️  Database Status:"
echo "==================="

# Check databases
docker-compose ps | grep -E "(mysql|mongodb|redis)" | while read line; do
    if echo "$line" | grep -q "Up"; then
        service=$(echo "$line" | awk '{print $1}')
        print_status "$service - Running"
    fi
done

echo ""
echo "🌐 Service URLs:"
echo "==============="
echo "Frontend Application:     http://localhost:3000"
echo "Design Microservice:      http://localhost:4000"
echo "Auth Microservice:        http://localhost:3001"
echo "Payment Microservice:     http://localhost:3002"
echo "Nginx Reverse Proxy:      http://localhost:80"
echo ""
echo "🗄️  Database Connections:"
echo "========================"
echo "Design MySQL:             localhost:3308"
echo "Auth MySQL:               localhost:3309"
echo "Payment MySQL:            localhost:3310"
echo "Design MongoDB:           localhost:27018"
echo "Design Redis:             localhost:6380"

echo ""
echo "📊 Monitoring Commands:"
echo "======================"
echo "View all logs:            docker-compose logs -f"
echo "View service status:      docker-compose ps"
echo "Stop all services:        docker-compose down"
echo "Restart services:         docker-compose restart"

echo ""
echo "🧪 Test Commands:"
echo "================"
echo "Test Design API:          curl http://localhost:4000/health"
echo "Test Auth API:            curl http://localhost:3001/health"
echo "Test Payment API:         curl http://localhost:3002/health"
echo "Test AI Generation:       curl -X POST http://localhost:4000/agents/task -H 'Content-Type: application/json' -d '{\"type\":\"generate-code\",\"content\":\"Create a simple API\"}'"

echo ""
print_status "🎉 Codaloo Platform is now running!"
print_info "Open http://localhost:3000 to access the application"
print_info "Use 'docker-compose logs -f' to monitor all services"

echo ""
echo "📋 Next Steps:"
echo "============="
echo "1. Open http://localhost:3000 in your browser"
echo "2. Create an account or login"
echo "3. Navigate to the Design Canvas"
echo "4. Start building your architecture!"

echo ""
print_info "For management commands, see: CODALOO_MANAGEMENT_COMMANDS.md" 