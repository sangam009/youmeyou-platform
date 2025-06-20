#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display help
show_help() {
    echo -e "${BLUE}Payment Microservice Startup Script${NC}"
    echo "Usage: ./start.sh [mode]"
    echo ""
    echo "Modes:"
    echo "  local     - Start in local development mode"
    echo "  dev       - Start in development mode with auth service"
    echo "  test      - Start in test mode with mock auth"
    echo "  prod      - Start in production mode"
    echo ""
    echo "Examples:"
    echo "  ./start.sh local    # Start in local mode"
    echo "  ./start.sh dev      # Start in development mode"
    echo "  ./start.sh test     # Start in test mode"
    echo "  ./start.sh prod     # Start in production mode"
}

# Check if mode is provided
if [ -z "$1" ]; then
    show_help
    exit 1
fi

MODE=$1

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Function to check if required ports are available
check_ports() {
    local ports=("4000" "3307")
    for port in "${ports[@]}"; do
        if lsof -i :$port > /dev/null 2>&1; then
            echo -e "${YELLOW}Warning: Port $port is already in use.${NC}"
            echo -e "${YELLOW}Please free up port $port or modify the configuration to use a different port.${NC}"
            exit 1
        fi
    done
}

# Function to check if required environment variables are set
check_env_vars() {
    local env_file=$1
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}Error: Environment file $env_file not found.${NC}"
        exit 1
    fi
}

# Main script execution
check_docker
check_ports

case $MODE in
    "local"|"dev"|"test")
        echo -e "${BLUE}Starting in ${MODE} mode...${NC}"
        check_env_vars "env.development.txt"
        docker-compose -f docker-compose.local.yml --env-file env.development.txt up -d --build
        ;;
    "prod")
        echo -e "${BLUE}Starting in production mode...${NC}"
        check_env_vars "env.production.txt"
        docker-compose -f docker-compose.production.yml --env-file env.production.txt up --build -d
        ;;
    *)
        echo -e "${RED}Invalid mode: $MODE${NC}"
        show_help
        exit 1
        ;;
esac

echo -e "${GREEN}Payment Microservice started successfully in $MODE mode!${NC}"
echo -e "${BLUE}You can access the service at:${NC}"
echo -e "  - API: http://localhost:4000"
echo -e "  - Test UI: http://localhost:4000/test/razorpay-checkout" 