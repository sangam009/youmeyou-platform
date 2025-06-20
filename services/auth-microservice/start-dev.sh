#!/bin/bash

# Change to the authmicroservice directory if not already there
cd "$(dirname "$0")"

# Create required directories if they don't exist
mkdir -p mysql/init
mkdir -p nginx/conf
mkdir -p nginx/logs
mkdir -p nginx/certs

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if the MySQL schema file exists
if [ ! -f "./mysql/init/01-schema.sql" ]; then
    echo "MySQL schema file not found. Creating it..."
    cp -f ./mysql/init/01-schema.sql ./mysql/init/
fi

# Check if docker-compose.local.yml exists, if not create it
if [ ! -f "./docker-compose.local.yml" ]; then
    echo "Creating docker-compose.local.yml file..."
    cat > docker-compose.local.yml << EOL
version: '3.8'

services:
  # Auth Microservice
  auth-service:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: auth-service:latest
    container_name: auth-service-ms
    restart: unless-stopped
    env_file:
      - ./backend/.env.development
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - app-network
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/usr/src/app
      - /usr/src/app/node_modules
    command: npm run dev

  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: auth-mysql-ms
    restart: unless-stopped
    env_file:
      - ./mysql.env
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 15s
    volumes:
      - mysql-data:/var/lib/mysql
      - ./mysql/init:/docker-entrypoint-initdb.d
    networks:
      - app-network
    ports:
      - "3306:3306"

  # Redis for Session Storage
  redis:
    image: redis:alpine
    container_name: auth-redis-ms
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - app-network
    ports:
      - "6379:6379"

networks:
  app-network:
    driver: bridge

volumes:
  mysql-data:
  redis-data:
EOL
fi

echo "Starting auth microservice local development environment..."
docker-compose -f docker-compose.local.yml up -d

echo "Waiting for services to start..."
sleep 10

# Check if the auth service is running
if docker ps | grep -q auth-service-ms; then
    echo "Auth Service is running!"
    echo "Test URL: http://localhost:3000"
    echo "Health check: http://localhost:3000/health"
else
    echo "Error: Auth Service is not running."
fi

echo "To view logs: docker-compose -f docker-compose.local.yml logs -f"
echo "To stop the environment: docker-compose -f docker-compose.local.yml down" 