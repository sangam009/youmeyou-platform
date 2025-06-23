#!/bin/bash

echo "🐳 Setting up YouMeYou Private Docker Registry"
echo "=============================================="

# Create auth directory and htpasswd file
echo "🔐 Setting up registry authentication..."

# Create a user for the registry (you can change these credentials)
REGISTRY_USER="youmeyou"
REGISTRY_PASS="staging2024!"

# Create htpasswd file
mkdir -p /tmp/registry-auth
docker run --rm --entrypoint htpasswd httpd:2 -Bbn $REGISTRY_USER $REGISTRY_PASS > /tmp/registry-auth/htpasswd

echo "✅ Registry authentication configured"
echo "📋 Registry Credentials:"
echo "   Username: $REGISTRY_USER"
echo "   Password: $REGISTRY_PASS"
echo ""
echo "🚀 Next steps:"
echo "1. Deploy the docker-registry.yml stack in Portainer"
echo "2. Registry will be available at: http://34.93.209.77:5000"
echo "3. Registry UI will be available at: http://34.93.209.77:5001"
echo "4. Use build-and-push-auth.sh to build and push images" 