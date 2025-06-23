#!/bin/bash

# 🚀 Codaloo Platform - Quick Start Script
# This script starts the currently working services

set -e

echo "🚀 Starting Codaloo Platform (Working Services)"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

print_info "Starting databases..."
docker-compose up -d design-mysql design-mongodb design-redis auth-mysql payment-mysql

print_info "Waiting for databases to be ready..."
sleep 10

print_info "Starting Design Service (with AI)..."
docker-compose up -d design-service

print_info "Waiting for services to be ready..."
sleep 5

print_status "Checking service health..."

# Test Design Service
if curl -s http://localhost:4000/health > /dev/null; then
    print_status "Design Service is healthy! (Port 4000)"
else
    print_warning "Design Service health check failed"
fi

echo ""
print_status "🎯 Codaloo Platform is ready!"
echo ""
echo "📊 Available Services:"
echo "  • Design Service (AI-Powered): http://localhost:4000"
echo "  • Health Check: http://localhost:4000/health"
echo "  • AI Code Generation: POST http://localhost:4000/agents/task"
echo ""
echo "💾 Database Connections:"
echo "  • Design MySQL: localhost:3308 (root/password)"
echo "  • Design MongoDB: localhost:27018"
echo "  • Design Redis: localhost:6380"
echo ""
echo "🧪 Test AI Code Generation:"
echo 'curl -X POST http://localhost:4000/agents/task -H "Content-Type: application/json" -d '"'"'{"type":"generate-code","content":"Create a simple API","component":{"data":{"label":"Test API","serviceType":"microservice"}}}'"'"''
echo ""
echo "📋 Management Commands:"
echo "  • Check Status: docker-compose ps"
echo "  • View Logs: docker logs design-service"
echo "  • Stop All: docker-compose down"
echo ""
print_status "Ready to build the future! 🚀" 