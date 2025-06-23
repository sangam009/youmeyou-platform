#!/bin/bash

echo "🧹 Cleaning Up Existing Portainer Stacks"
echo "========================================"

# List of stack names that might exist
STACKS_TO_REMOVE=(
    "auth-service"
    "auth-service-simple"
    "auth-service-final"
    "auth-service-ultra-simple"
    "auth-service-scalable"
    "auth-service-proper"
    "auth-service-registry"
    "auth-service-from-registry"
    "design-service"
    "payment-service"
    "web-app"
    "mysql"
    "redis"
    "mongodb"
    "gateway"
    "nginx"
    "monitoring"
)

echo "🔍 Checking for existing Docker containers and networks..."

# Stop and remove all containers
echo "🛑 Stopping all running containers..."
docker stop $(docker ps -q) 2>/dev/null || echo "No running containers to stop"

echo "🗑️ Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null || echo "No containers to remove"

# Remove all custom networks (keep default ones)
echo "🌐 Removing custom networks..."
docker network ls --format "{{.Name}}" | grep -v -E "^(bridge|host|none)$" | xargs -r docker network rm 2>/dev/null || echo "No custom networks to remove"

# Remove all volumes (be careful with this)
echo "💾 Removing all volumes..."
docker volume ls -q | xargs -r docker volume rm 2>/dev/null || echo "No volumes to remove"

# Remove all images except base images
echo "🖼️ Removing custom images..."
docker images --format "{{.Repository}}:{{.Tag}}" | grep -v -E "^(node|mysql|redis|mongo|nginx|registry|httpd|joxit)" | xargs -r docker rmi -f 2>/dev/null || echo "No custom images to remove"

# Clean up build directories
echo "🗂️ Cleaning up build directories..."
rm -rf /tmp/youmeyou-build* 2>/dev/null || echo "No build directories to clean"

# Prune Docker system
echo "🧽 Pruning Docker system..."
docker system prune -af --volumes

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "📋 Current Docker Status:"
echo "========================"
echo "🐳 Containers:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🌐 Networks:"
docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
echo ""
echo "💾 Volumes:"
docker volume ls --format "table {{.Name}}\t{{.Driver}}"
echo ""
echo "🖼️ Images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
echo ""
echo "🚀 Ready for fresh deployment!" 