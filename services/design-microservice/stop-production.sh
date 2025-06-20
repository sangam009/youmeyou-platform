#!/bin/bash

echo "🛑 Stopping Codaloo Design Microservice - Production Stack"

# Remove the stack
echo "📦 Removing design-stack from Docker Swarm..."
docker stack rm design-stack

# Wait for cleanup
echo "⏳ Waiting for stack cleanup..."
sleep 15

# Show remaining services (should be empty)
echo "📊 Remaining services:"
docker service ls --filter label=com.docker.stack.namespace=design-stack

# Optional: Remove unused images
read -p "🗑️  Remove unused Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker image prune -f
    echo "✅ Unused images removed"
fi

echo "✅ Design microservice stack stopped successfully!" 