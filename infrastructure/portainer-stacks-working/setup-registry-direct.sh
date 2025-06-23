#!/bin/bash

echo "🐳 Setting up YouMeYou Private Docker Registry (Direct Install)"
echo "=============================================================="

# Registry configuration
REGISTRY_USER="youmeyou"
REGISTRY_PASS="staging2024!"
REGISTRY_PORT="5000"

echo "🔧 Creating registry directories..."
sudo mkdir -p /opt/docker-registry/data
sudo mkdir -p /opt/docker-registry/auth
sudo mkdir -p /opt/docker-registry/certs

echo "🔐 Setting up registry authentication..."
# Create htpasswd file for authentication
docker run --rm --entrypoint htpasswd httpd:2 -Bbn $REGISTRY_USER $REGISTRY_PASS | sudo tee /opt/docker-registry/auth/htpasswd

echo "🚀 Starting Docker Registry..."
# Run registry as a daemon
docker run -d \
  --name youmeyou-registry \
  --restart=unless-stopped \
  -p $REGISTRY_PORT:5000 \
  -v /opt/docker-registry/data:/var/lib/registry \
  -v /opt/docker-registry/auth:/auth \
  -e "REGISTRY_AUTH=htpasswd" \
  -e "REGISTRY_AUTH_HTPASSWD_REALM=Registry Realm" \
  -e "REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd" \
  registry:2

echo "🌐 Starting Registry UI..."
# Run registry UI
docker run -d \
  --name youmeyou-registry-ui \
  --restart=unless-stopped \
  -p 5001:80 \
  -e "REGISTRY_TITLE=YouMeYou Docker Registry" \
  -e "REGISTRY_URL=http://$(hostname -I | awk '{print $1}'):5000" \
  -e "DELETE_IMAGES=true" \
  -e "SHOW_CONTENT_DIGEST=true" \
  joxit/docker-registry-ui:latest

echo "✅ Docker Registry Setup Complete!"
echo ""
echo "📋 Registry Information:"
echo "   Registry URL: http://$(hostname -I | awk '{print $1}'):5000"
echo "   Registry UI: http://$(hostname -I | awk '{print $1}'):5001"
echo "   Username: $REGISTRY_USER"
echo "   Password: $REGISTRY_PASS"
echo ""
echo "🔍 Checking registry status..."
sleep 5
curl -s http://localhost:5000/v2/ && echo "✅ Registry is running!" || echo "❌ Registry failed to start"

echo ""
echo "🚀 Next step: Run build scripts to create and push images!" 