#!/bin/bash

# YouMeYou Platform - Prepare Staging for Portainer Deployment
# This script uploads all necessary files to staging VM for Portainer management

set -e

echo "🚀 Preparing YouMeYou Platform for Staging Deployment"
echo "🌐 Target: 34.93.209.77"
echo "📦 Preparing files for Portainer management"
echo

# Configuration
STAGING_IP="34.93.209.77"
STAGING_USER="ubuntu"
REMOTE_DIR="/home/ubuntu/youmeyou-deployment"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Function to upload files to staging VM
upload_files() {
    print_step "Creating deployment directory on staging VM..."
    ssh -o StrictHostKeyChecking=no ${STAGING_USER}@${STAGING_IP} "mkdir -p ${REMOTE_DIR}"
    
    print_step "Uploading Portainer stack files..."
    scp -r portainer-stacks/ ${STAGING_USER}@${STAGING_IP}:${REMOTE_DIR}/
    
    print_step "Creating environment file..."
    cat > /tmp/staging.env << 'EOF'
# YouMeYou Platform - Staging Environment Variables
MYSQL_ROOT_PASSWORD=youmeyou_root_2024
MYSQL_DATABASE=youmeyou_db
MYSQL_USER=youmeyou_user
MYSQL_PASSWORD=youmeyou_pass_2024
MONGODB_ROOT_USER=admin
MONGODB_ROOT_PASSWORD=youmeyou_mongo_2024
MONGODB_DATABASE=youmeyou_design
REDIS_PASSWORD=youmeyou_redis_2024
JWT_SECRET=youmeyou_jwt_secret_2024_very_secure
FIREBASE_PROJECT_ID=youmeyou-platform
NODE_ENV=production
DOMAIN=staging.youmeyou.ai
STACK_NAME=staging
ENVIRONMENT=staging
REDIS_PORT=6379
AUTH_PORT=8080
DESIGN_PORT=4000
PAYMENT_PORT=5000
WEB_PORT=3000
EOF
    
    scp /tmp/staging.env ${STAGING_USER}@${STAGING_IP}:${REMOTE_DIR}/
    rm /tmp/staging.env
    
    print_status "Files uploaded successfully!"
}

# Function to setup Docker network
setup_network() {
    print_step "Setting up Docker network..."
    ssh -o StrictHostKeyChecking=no ${STAGING_USER}@${STAGING_IP} \
        "docker network create codaloo-network --driver bridge || echo 'Network already exists'"
    print_status "Docker network ready!"
}

# Function to display deployment instructions
show_instructions() {
    echo
    echo "🎉 Staging VM is ready for Portainer deployment!"
    echo
    echo "📋 Manual Deployment Steps:"
    echo "   1. Open Portainer: http://${STAGING_IP}:9000"
    echo "   2. Login with your admin credentials"
    echo "   3. Go to 'Stacks' → 'Add Stack'"
    echo "   4. Deploy stacks in this order:"
    echo
    echo "   📊 Database Layer (Deploy First):"
    echo "      • youmeyou-redis (redis.yml)"
    echo "      • youmeyou-mongodb (mongodb.yml)"  
    echo "      • youmeyou-auth-mysql (auth-mysql.yml)"
    echo "      • youmeyou-design-mysql (design-mysql.yml)"
    echo "      • youmeyou-payment-mysql (payment-mysql.yml)"
    echo
    echo "   🔧 Service Layer:"
    echo "      • youmeyou-auth-service (auth-service.yml)"
    echo "      • youmeyou-design-service (design-service.yml)"
    echo "      • youmeyou-payment-service (payment-service.yml)"
    echo
    echo "   🌐 Frontend Layer:"
    echo "      • youmeyou-web-app (web-app.yml)"
    echo
    echo "   📁 Stack files location on VM: ${REMOTE_DIR}/portainer-stacks/"
    echo "   🔧 Environment file: ${REMOTE_DIR}/staging.env"
    echo
    echo "   💡 For each stack:"
    echo "      - Name: youmeyou-[service-name]"
    echo "      - Method: Upload"
    echo "      - File: Choose from ${REMOTE_DIR}/portainer-stacks/"
    echo "      - Environment: Load from ${REMOTE_DIR}/staging.env"
    echo
    echo "   🔍 After deployment, all services will be:"
    echo "      • Fully managed by Portainer"
    echo "      • Visible in Containers section"  
    echo "      • Scalable through Portainer UI"
    echo "      • Monitorable with logs and stats"
    echo
    echo "   🌐 Service URLs after deployment:"
    echo "      • Web App: http://${STAGING_IP}:3000"
    echo "      • Auth API: http://${STAGING_IP}:8080"
    echo "      • Design API: http://${STAGING_IP}:4000"
    echo "      • Payment API: http://${STAGING_IP}:5000"
    echo
}

# Main execution
main() {
    print_step "Starting staging preparation..."
    
    # Check SSH connectivity
    if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${STAGING_USER}@${STAGING_IP} "echo 'SSH connection successful'"; then
        echo "❌ Cannot connect to staging VM. Please check:"
        echo "   - VM is running"
        echo "   - SSH key is configured"
        echo "   - IP address is correct"
        exit 1
    fi
    
    upload_files
    setup_network
    show_instructions
    
    print_status "Preparation complete! 🚀"
}

# Run main function
main "$@" 