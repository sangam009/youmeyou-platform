#!/bin/bash

echo "🚀 Starting Codaloo Design Microservice - Local Development"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create logs directory
mkdir -p logs

# Copy environment file
if [ ! -f env.development.txt ]; then
    echo "⚠️  env.development.txt not found. Please create it from the template."
    exit 1
fi

# Start services
echo "📦 Starting local development stack..."
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up --build

echo "✅ Design microservice is running at http://localhost:4000"
echo "📊 MongoDB available at mongodb://localhost:27018"
echo "🗄️  MySQL available at localhost:3308"
echo "🔄 Redis available at localhost:6380" 