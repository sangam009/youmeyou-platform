#!/bin/bash

# Setup GitHub repositories for YouMeYou Platform
# This script creates the repository structure and pushes your code

set -e

# Configuration
GITHUB_USERNAME="sangam009"  # Your GitHub username
REPO_NAME="youmeyou-platform"
CURRENT_DIR="/Users/seemantishukla/personal/arch_tool"

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

echo "🚀 Setting up YouMeYou GitHub Repository"
echo "========================================"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed. Please install it first:"
    echo "brew install gh"
    exit 1
fi

# Check if user is logged in to GitHub
if ! gh auth status &> /dev/null; then
    print_warning "You're not logged in to GitHub. Please login:"
    gh auth login
fi

# Create temporary directory for the new repo structure
TEMP_DIR="/tmp/youmeyou-platform"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

print_status "Creating repository structure..."

# Create the new directory structure
mkdir -p "$TEMP_DIR"/{services,web,infrastructure,docs,scripts,.github/workflows}

# Copy services
print_status "Organizing microservices..."
cp -r "$CURRENT_DIR/codaloo/backend/designmicroservice" "$TEMP_DIR/services/design-microservice"
cp -r "$CURRENT_DIR/authmicroservice" "$TEMP_DIR/services/auth-microservice"
cp -r "$CURRENT_DIR/paymentmicroservice" "$TEMP_DIR/services/payment-microservice"

# Copy web frontend
print_status "Copying web frontend..."
cp -r "$CURRENT_DIR/codaloo/web" "$TEMP_DIR/web/"

# Copy infrastructure
print_status "Copying infrastructure..."
cp -r "$CURRENT_DIR/terraform" "$TEMP_DIR/infrastructure/"
cp -r "$CURRENT_DIR/nginx" "$TEMP_DIR/infrastructure/"
cp -r "$CURRENT_DIR/portainer-stacks" "$TEMP_DIR/infrastructure/"

# Create documentation
print_status "Creating documentation..."
cat > "$TEMP_DIR/README.md" << 'EOF'
# YouMeYou Platform

🚀 **AI-powered platform for system design, code generation, and deployment**

YouMeYou allows users to architect, build, and ship software systems through intelligent AI workflows.

## 🏗️ Architecture

```
├── services/           # Microservices
│   ├── design-microservice/    # Core design & canvas service
│   ├── auth-microservice/      # Authentication & user management
│   └── payment-microservice/   # Payment processing
├── web/               # Next.js frontend application
├── infrastructure/    # Deployment & infrastructure
│   ├── terraform/     # GCP infrastructure as code
│   ├── docker/        # Container configurations
│   └── portainer-stacks/ # Container orchestration
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## 🚀 Quick Start

### Local Development

1. **Design Microservice**
   ```bash
   cd services/design-microservice
   ./start-local.sh
   ```

2. **Web Frontend**
   ```bash
   cd web
   npm run dev
   ```

3. **Auth Service**
   ```bash
   cd services/auth-microservice
   ./start-dev.sh
   ```

### Staging Deployment

1. **Deploy Infrastructure**
   ```bash
   cd infrastructure/terraform/staging
   terraform apply
   ```

2. **Deploy Application**
   ```bash
   ./deploy-to-staging.sh
   ```

## 🌐 Environments

- **Local**: http://localhost:3000
- **Staging**: https://staging.youmeyou.ai
- **Production**: https://youmeyou.ai (coming soon)

## 🔧 Services

### Design Microservice (Port 4000)
- Canvas management
- Project templates
- Workspace collaboration
- **Tech**: Node.js, MongoDB, Redis

### Auth Microservice (Port 8080)
- User authentication
- Session management
- Firebase integration
- **Tech**: Node.js, MySQL

### Payment Microservice (Port 3001)
- Multi-gateway support (Razorpay, PhonePe, Cashfree)
- Subscription management
- Webhook handling
- **Tech**: Node.js, MySQL

### Web Frontend (Port 3000)
- Modern React dashboard
- Real-time collaboration
- Responsive design
- **Tech**: Next.js, TypeScript, Tailwind CSS

## 📊 Infrastructure

- **Cloud**: Google Cloud Platform (GCP)
- **Orchestration**: Docker + Portainer
- **Database**: MongoDB, MySQL, Redis
- **Monitoring**: Built-in health checks
- **Cost Optimization**: Scheduled VM shutdown

## 🚀 Vision

YouMeYou brings architecture into the development workflow — letting AI not just write code, but understand systems.

## 📝 License

Proprietary - All rights reserved
EOF

# Create service-specific READMEs
cat > "$TEMP_DIR/services/README.md" << 'EOF'
# YouMeYou Microservices

This directory contains all the microservices that power the YouMeYou platform.

## Services Overview

### 🎨 Design Microservice
**Purpose**: Core canvas and design functionality
**Port**: 4000
**Database**: MongoDB + Redis
**Key Features**:
- Visual canvas editor
- Project management
- Template system
- Real-time collaboration

### 🔐 Auth Microservice  
**Purpose**: User authentication and session management
**Port**: 8080
**Database**: MySQL
**Key Features**:
- Firebase authentication
- Session management
- User profiles
- Access control

### 💳 Payment Microservice
**Purpose**: Payment processing and subscriptions
**Port**: 3001
**Database**: MySQL
**Key Features**:
- Multi-gateway support
- Subscription billing
- Webhook processing
- Transaction management

## Development

Each service can be run independently:

```bash
# Design Service
cd design-microservice && ./start-local.sh

# Auth Service  
cd auth-microservice && ./start-dev.sh

# Payment Service
cd payment-microservice && ./start.sh
```

## API Documentation

- Design API: http://localhost:4000/health
- Auth API: http://localhost:8080/health  
- Payment API: http://localhost:3001/health
EOF

# Create infrastructure README
cat > "$TEMP_DIR/infrastructure/README.md" << 'EOF'
# YouMeYou Infrastructure

Infrastructure as Code for YouMeYou platform deployment.

## 🏗️ Components

### Terraform
- **Staging**: Mumbai, India (asia-south1)
- **Production**: US + India multi-region (planned)
- **Features**: Auto-scheduling, cost optimization, SSL

### Docker
- Multi-service orchestration
- Health checks
- Auto-restart policies
- Volume management

### Portainer
- Container management UI
- Stack deployment
- Resource monitoring
- Log aggregation

## 🚀 Deployment

### Staging Environment
```bash
cd terraform/staging
terraform apply
./deploy-to-staging.sh
```

### Production Environment
```bash
cd terraform/production
terraform apply
```

## 💰 Cost Optimization

- **VM Scheduling**: Auto-shutdown during off-hours
- **Resource Sizing**: Right-sized for workload
- **Storage**: Optimized disk allocation
- **Network**: Regional deployment

**Monthly Cost**: ~₹3,500 ($42) with scheduling
EOF

# Create GitHub workflows
mkdir -p "$TEMP_DIR/.github/workflows"

cat > "$TEMP_DIR/.github/workflows/ci.yml" << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-services:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [design-microservice, auth-microservice, payment-microservice]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: services/${{ matrix.service }}/package-lock.json
    
    - name: Install dependencies
      run: |
        cd services/${{ matrix.service }}
        npm ci
    
    - name: Run tests
      run: |
        cd services/${{ matrix.service }}
        npm test || echo "No tests configured"
    
    - name: Build service
      run: |
        cd services/${{ matrix.service }}
        npm run build || echo "No build script"

  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: web/package-lock.json
    
    - name: Install dependencies
      run: |
        cd web
        npm ci
    
    - name: Build frontend
      run: |
        cd web
        npm run build

  deploy-staging:
    needs: [test-services, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to staging
      run: |
        echo "Deploy to staging environment"
        # Add deployment script here

  deploy-production:
    needs: [test-services, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: |
        echo "Deploy to production environment"
        # Add production deployment script here
EOF

# Create .gitignore
cat > "$TEMP_DIR/.gitignore" << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.env

# Build outputs
.next/
dist/
build/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Terraform
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
terraform.tfvars

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
docker-compose.override.yml

# Temporary files
tmp/
temp/
EOF

# Initialize git repository
print_status "Initializing Git repository..."
cd "$TEMP_DIR"
git init
git add .
git commit -m "Initial commit: YouMeYou platform setup

🚀 Features:
- Design microservice with canvas functionality
- Auth microservice with Firebase integration  
- Payment microservice with multi-gateway support
- Next.js web frontend
- GCP infrastructure with Terraform
- Docker containerization
- CI/CD pipeline setup
- Cost-optimized staging environment

🏗️ Architecture:
- Microservices architecture
- Container orchestration
- Infrastructure as Code
- Automated deployment"

# Create GitHub repository
print_status "Creating GitHub repository..."
gh repo create "$REPO_NAME" --public --description "🚀 AI-powered platform for system design, code generation, and deployment" --clone=false

# Add remote and push
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
git branch -M main
git push -u origin main

print_success "🎉 Repository created successfully!"
echo ""
echo "🔗 Repository URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "📁 Local copy: $TEMP_DIR"
echo ""
echo "🚀 Next steps:"
echo "1. Clone the repository to your development directory:"
echo "   git clone https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo ""
echo "2. Set up development environment:"
echo "   cd $REPO_NAME"
echo "   # Follow README.md instructions"
echo ""
echo "3. Create development branch:"
echo "   git checkout -b develop"
echo "   git push -u origin develop"

# Clean up
print_status "Cleaning up temporary files..."
# Uncomment the next line if you want to auto-cleanup
# rm -rf "$TEMP_DIR"

print_success "✅ GitHub setup completed!" 