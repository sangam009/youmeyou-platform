#!/bin/bash

echo "🚀 Deploying Codaloo Design Microservice - Production (Docker Swarm)"

# Check if Docker Swarm is initialized
if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q "active"; then
    echo "❌ Docker Swarm is not initialized. Please run 'docker swarm init' first."
    exit 1
fi

# Check if environment file exists
if [ ! -f env.production.txt ]; then
    echo "⚠️  env.production.txt not found. Please create it with your production values."
    exit 1
fi

# Create necessary directories
mkdir -p logs
mkdir -p mongo-init

# Build the image
echo "🔨 Building design service image..."
docker build -t design-service:latest .

# Deploy the stack
echo "📦 Deploying to Docker Swarm..."
docker stack deploy -c docker-compose.production.yml design-stack

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker service ls --filter label=com.docker.stack.namespace=design-stack

echo "✅ Design microservice stack deployed successfully!"
echo "🌐 Service available through the Swarm load balancer"
echo "📋 Check logs with: docker service logs design-stack_design-service"
echo "🔍 Monitor with: docker stack ps design-stack" 