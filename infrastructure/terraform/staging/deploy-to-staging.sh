#!/bin/bash

# Deploy YouMeYou to Staging Environment
# This script uploads your local code and deploys it via Portainer

set -e

VM_IP="34.93.209.77"
SSH_KEY="~/.ssh/id_rsa"
LOCAL_PROJECT_PATH="/Users/seemantishukla/personal/arch_tool"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 Deploying YouMeYou to Staging Environment"
echo "=============================================="

# Check if VM is running
print_status "Checking VM status..."
if ! ssh -i $SSH_KEY -o ConnectTimeout=10 ubuntu@$VM_IP "echo 'VM is accessible'" > /dev/null 2>&1; then
    print_error "Cannot connect to VM. Please check if it's running:"
    echo "Run: ./vm-control.sh status"
    exit 1
fi

print_success "VM is accessible"

# Create deployment directory structure on VM
print_status "Setting up deployment directories on VM..."
ssh -i $SSH_KEY ubuntu@$VM_IP "
    mkdir -p /opt/youmeyou/youmeyou/{backend,frontend,config}
    sudo chown -R ubuntu:ubuntu /opt/youmeyou/
"

# Upload backend code (Design Microservice)
print_status "Uploading Design Microservice..."
rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    $LOCAL_PROJECT_PATH/codaloo/backend/designmicroservice/ \
    ubuntu@$VM_IP:/opt/youmeyou/youmeyou/backend/designmicroservice/

# Upload frontend code (Web App)
print_status "Uploading Web Frontend..."
rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    $LOCAL_PROJECT_PATH/codaloo/web/ \
    ubuntu@$VM_IP:/opt/youmeyou/youmeyou/frontend/web/

# Create production Docker Compose file
print_status "Creating production Docker Compose configuration..."
cat > /tmp/docker-compose.staging.yml << 'EOF'
version: '3.8'

services:
  # Design Microservice
  design-service:
    build: 
      context: ./backend/designmicroservice
      dockerfile: Dockerfile
    container_name: youmeyou-design-service
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=staging
      - PORT=4000
      - MONGODB_URI=mongodb://design-mongodb:27017/youmeyou_design
      - REDIS_URL=redis://design-redis:6379
    depends_on:
      - design-mongodb
      - design-redis
    networks:
      - youmeyou-network

  # Web Frontend  
  web-frontend:
    build:
      context: ./frontend/web
      dockerfile: Dockerfile
    container_name: youmeyou-web-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=staging
      - NEXT_PUBLIC_API_URL=http://design-service:4000
    depends_on:
      - design-service
    networks:
      - youmeyou-network

  # MongoDB for Design Service
  design-mongodb:
    image: mongo:7
    container_name: youmeyou-design-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=youmeyou_design
    networks:
      - youmeyou-network

  # Redis for Design Service
  design-redis:
    image: redis:7-alpine
    container_name: youmeyou-design-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - youmeyou-network

volumes:
  mongodb_data:
  redis_data:

networks:
  youmeyou-network:
    driver: bridge
EOF

# Upload Docker Compose file
scp -i $SSH_KEY /tmp/docker-compose.staging.yml ubuntu@$VM_IP:/opt/youmeyou/youmeyou/
rm /tmp/docker-compose.staging.yml

# Create Dockerfiles if they don't exist
print_status "Creating Dockerfiles..."

# Design Microservice Dockerfile
ssh -i $SSH_KEY ubuntu@$VM_IP "
cat > /opt/youmeyou/youmeyou/backend/designmicroservice/Dockerfile << 'DOCKERFILE_EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start the application
CMD [\"npm\", \"start\"]
DOCKERFILE_EOF
"

# Web Frontend Dockerfile
ssh -i $SSH_KEY ubuntu@$VM_IP "
cat > /opt/youmeyou/youmeyou/frontend/web/Dockerfile << 'DOCKERFILE_EOF'
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./

# Install production dependencies
RUN npm ci --only=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD [\"npm\", \"start\"]
DOCKERFILE_EOF
"

# Deploy the application
print_status "Deploying application containers..."
ssh -i $SSH_KEY ubuntu@$VM_IP "
    cd /opt/youmeyou/youmeyou
    
    # Stop existing containers
    docker-compose -f docker-compose.staging.yml down 2>/dev/null || true
    
    # Build and start new containers
    docker-compose -f docker-compose.staging.yml up -d --build
    
    # Wait for services to be ready
    echo 'Waiting for services to start...'
    sleep 30
    
    # Check service status
    docker-compose -f docker-compose.staging.yml ps
"

# Verify deployment
print_status "Verifying deployment..."
sleep 10

# Test API endpoint
if curl -f -s http://$VM_IP:4000/health > /dev/null; then
    print_success "✅ Design Service is running"
else
    print_warning "⚠️  Design Service health check failed"
fi

# Test Web Frontend
if curl -f -s http://$VM_IP:3000 > /dev/null; then
    print_success "✅ Web Frontend is running"
else
    print_warning "⚠️  Web Frontend health check failed"
fi

print_success "🎉 Deployment completed!"
echo ""
echo "🔗 Access your staging environment:"
echo "   Web Frontend: http://$VM_IP:3000"
echo "   API: http://$VM_IP:4000"
echo "   Portainer: http://$VM_IP:9000"
echo ""
echo "📊 Check deployment status:"
echo "   ssh -i $SSH_KEY ubuntu@$VM_IP"
echo "   cd /opt/youmeyou/youmeyou && docker-compose -f docker-compose.staging.yml ps"
echo ""
echo "🌐 After DNS setup, access via:"
echo "   https://staging.youmeyou.ai"
echo "   https://api-staging.youmeyou.ai"
echo "   https://portainer-staging.youmeyou.ai" 