#!/bin/bash

# YouMeYou Platform - Staging Deployment Script
# Deploys all services to staging VM via Portainer API for proper management
# VM IP: 34.93.209.77

set -e

echo "🚀 YouMeYou Platform - Staging Deployment"
echo "🌐 Target: 34.93.209.77 (staging.youmeyou.ai)"
echo "📦 Deploying via Portainer API for full management control"
echo

# Configuration
STAGING_IP="34.93.209.77"
PORTAINER_URL="http://${STAGING_IP}:9000"
REPO_URL="https://github.com/sangam009/youmeyou-platform.git"
DEPLOY_DIR="/opt/youmeyou-platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Function to check if Portainer is accessible
check_portainer() {
    print_step "Checking Portainer accessibility..."
    if curl -s --connect-timeout 10 "${PORTAINER_URL}/api/status" > /dev/null; then
        print_status "Portainer is accessible at ${PORTAINER_URL}"
        return 0
    else
        print_error "Portainer is not accessible at ${PORTAINER_URL}"
        return 1
    fi
}

# Function to get Portainer auth token
get_portainer_token() {
    print_step "Getting Portainer authentication token..."
    
    # Check if we have stored credentials
    if [ -f ~/.portainer_credentials ]; then
        source ~/.portainer_credentials
        print_status "Using stored Portainer credentials"
    else
        echo -n "Enter Portainer username: "
        read PORTAINER_USER
        echo -n "Enter Portainer password: "
        read -s PORTAINER_PASS
        echo
        
        # Optionally save credentials
        echo -n "Save credentials for future use? (y/n): "
        read -n 1 SAVE_CREDS
        echo
        if [[ $SAVE_CREDS =~ ^[Yy]$ ]]; then
            echo "PORTAINER_USER='$PORTAINER_USER'" > ~/.portainer_credentials
            echo "PORTAINER_PASS='$PORTAINER_PASS'" >> ~/.portainer_credentials
            chmod 600 ~/.portainer_credentials
            print_status "Credentials saved to ~/.portainer_credentials"
        fi
    fi
    
    # Get auth token
    local auth_response=$(curl -s -X POST \
        "${PORTAINER_URL}/api/auth" \
        -H "Content-Type: application/json" \
        -d "{\"Username\":\"${PORTAINER_USER}\",\"Password\":\"${PORTAINER_PASS}\"}")
    
    if [ $? -eq 0 ] && echo "$auth_response" | grep -q "jwt"; then
        PORTAINER_TOKEN=$(echo "$auth_response" | grep -o '"jwt":"[^"]*' | cut -d'"' -f4)
        print_status "Successfully authenticated with Portainer"
        return 0
    else
        print_error "Failed to authenticate with Portainer"
        print_error "Response: $auth_response"
        return 1
    fi
}

# Function to get endpoint ID
get_endpoint_id() {
    print_step "Getting Portainer endpoint ID..."
    
    local endpoints_response=$(curl -s -X GET \
        "${PORTAINER_URL}/api/endpoints" \
        -H "Authorization: Bearer ${PORTAINER_TOKEN}")
    
    ENDPOINT_ID=$(echo "$endpoints_response" | grep -o '"Id":[0-9]*' | head -1 | cut -d':' -f2)
    
    if [ -n "$ENDPOINT_ID" ]; then
        print_status "Using endpoint ID: $ENDPOINT_ID"
        return 0
    else
        print_error "Failed to get endpoint ID"
        return 1
    fi
}

# Function to deploy a stack via Portainer API
deploy_stack() {
    local stack_name="$1"
    local stack_file="$2"
    local env_vars="$3"
    
    print_step "Deploying stack: $stack_name"
    
    # Read the stack file content
    if [ ! -f "portainer-stacks/$stack_file" ]; then
        print_error "Stack file not found: portainer-stacks/$stack_file"
        return 1
    fi
    
    local stack_content=$(cat "portainer-stacks/$stack_file")
    
    # Prepare the JSON payload
    local payload=$(cat <<EOF
{
    "Name": "$stack_name",
    "SwarmID": "",
    "ComposeFile": $(echo "$stack_content" | jq -Rs .),
    "Env": $env_vars
}
EOF
)
    
    # Deploy the stack
    local response=$(curl -s -X POST \
        "${PORTAINER_URL}/api/stacks?type=2&method=string&endpointId=${ENDPOINT_ID}" \
        -H "Authorization: Bearer ${PORTAINER_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$response" | grep -q '"Id"'; then
        local stack_id=$(echo "$response" | grep -o '"Id":[0-9]*' | cut -d':' -f2)
        print_status "Stack '$stack_name' deployed successfully (ID: $stack_id)"
        return 0
    else
        print_error "Failed to deploy stack '$stack_name'"
        print_error "Response: $response"
        return 1
    fi
}

# Function to update code on staging VM
update_code() {
    print_step "Updating code on staging VM..."
    
    ssh -o StrictHostKeyChecking=no ubuntu@${STAGING_IP} << 'EOF'
        # Create deployment directory
        mkdir -p /opt/youmeyou-platform
        cd /opt/youmeyou-platform
        
        # Clone or update repository
        if [ -d ".git" ]; then
            echo "Updating existing repository..."
            git pull origin main
        else
            echo "Cloning repository..."
            git clone https://github.com/sangam009/youmeyou-platform.git .
        fi
        
        # Set permissions
        chmod +x scripts/*.sh 2>/dev/null || true
        
        echo "Code updated successfully"
EOF
    
    if [ $? -eq 0 ]; then
        print_status "Code updated on staging VM"
        return 0
    else
        print_error "Failed to update code on staging VM"
        return 1
    fi
}

# Function to create environment variables JSON
create_env_vars() {
    cat <<EOF
[
    {"name": "MYSQL_ROOT_PASSWORD", "value": "youmeyou_root_2024"},
    {"name": "MYSQL_DATABASE", "value": "youmeyou_db"},
    {"name": "MYSQL_USER", "value": "youmeyou_user"},
    {"name": "MYSQL_PASSWORD", "value": "youmeyou_pass_2024"},
    {"name": "MONGODB_ROOT_USER", "value": "admin"},
    {"name": "MONGODB_ROOT_PASSWORD", "value": "youmeyou_mongo_2024"},
    {"name": "MONGODB_DATABASE", "value": "youmeyou_design"},
    {"name": "REDIS_PASSWORD", "value": "youmeyou_redis_2024"},
    {"name": "JWT_SECRET", "value": "youmeyou_jwt_secret_2024_very_secure"},
    {"name": "FIREBASE_PROJECT_ID", "value": "youmeyou-platform"},
    {"name": "NODE_ENV", "value": "production"},
    {"name": "DOMAIN", "value": "staging.youmeyou.ai"}
]
EOF
}

# Main deployment function
main() {
    print_step "Starting YouMeYou Platform deployment to staging..."
    
    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed. Install with: brew install jq"
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        print_error "ssh is required but not installed"
        exit 1
    fi
    
    # Check Portainer accessibility
    if ! check_portainer; then
        print_error "Cannot proceed without Portainer access"
        exit 1
    fi
    
    # Get authentication token
    if ! get_portainer_token; then
        print_error "Cannot proceed without Portainer authentication"
        exit 1
    fi
    
    # Get endpoint ID
    if ! get_endpoint_id; then
        print_error "Cannot proceed without endpoint ID"
        exit 1
    fi
    
    # Update code on staging VM
    if ! update_code; then
        print_warning "Code update failed, continuing with existing code..."
    fi
    
    # Create environment variables
    local env_vars=$(create_env_vars)
    
    print_step "Deploying infrastructure stacks..."
    
    # Deploy database stacks first
    deploy_stack "youmeyou-redis" "redis.yml" "$env_vars"
    deploy_stack "youmeyou-mongodb" "mongodb.yml" "$env_vars"
    deploy_stack "youmeyou-auth-mysql" "auth-mysql.yml" "$env_vars"
    deploy_stack "youmeyou-design-mysql" "design-mysql.yml" "$env_vars"
    deploy_stack "youmeyou-payment-mysql" "payment-mysql.yml" "$env_vars"
    
    print_status "Waiting for databases to initialize..."
    sleep 30
    
    print_step "Deploying service stacks..."
    
    # Deploy service stacks
    deploy_stack "youmeyou-auth-service" "auth-service.yml" "$env_vars"
    deploy_stack "youmeyou-design-service" "design-service.yml" "$env_vars"
    deploy_stack "youmeyou-payment-service" "payment-service.yml" "$env_vars"
    
    print_status "Waiting for services to initialize..."
    sleep 20
    
    print_step "Deploying web application..."
    
    # Deploy web application
    deploy_stack "youmeyou-web-app" "web-app.yml" "$env_vars"
    
    print_status "Deployment completed!"
    echo
    echo "🎉 YouMeYou Platform is now running on staging!"
    echo
    echo "📋 Access URLs:"
    echo "   🌐 Web App: http://${STAGING_IP}:3000"
    echo "   🔐 Auth API: http://${STAGING_IP}:8080"
    echo "   🎨 Design API: http://${STAGING_IP}:4000"
    echo "   💳 Payment API: http://${STAGING_IP}:5000"
    echo "   📦 Portainer: http://${STAGING_IP}:9000"
    echo
    echo "📊 All services are now managed by Portainer!"
    echo "   - View logs: Portainer → Containers → [service] → Logs"
    echo "   - Scale services: Portainer → Stacks → [stack] → Editor"
    echo "   - Monitor resources: Portainer → Containers → Stats"
    echo
    echo "🔧 Next steps:"
    echo "   1. Configure domain DNS: staging.youmeyou.ai → ${STAGING_IP}"
    echo "   2. Set up SSL certificates"
    echo "   3. Configure Nginx reverse proxy"
    echo "   4. Set up monitoring and alerts"
    echo
    print_status "Happy coding! 🚀"
}

# Run main function
main "$@" 