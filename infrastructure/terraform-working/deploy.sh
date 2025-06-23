#!/bin/bash

# Codaloo GCP Deployment Script
# This script automates the deployment of Codaloo infrastructure on GCP

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Terraform
    if ! command_exists terraform; then
        log_error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    # Check Google Cloud SDK
    if ! command_exists gcloud; then
        log_error "Google Cloud SDK is not installed. Please install gcloud first."
        exit 1
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not authenticated with Google Cloud. Please run 'gcloud auth login' first."
        exit 1
    fi
    
    log_success "Prerequisites check passed!"
}

# Setup GCP project
setup_gcp_project() {
    local project_id=$1
    
    log_info "Setting up GCP project: $project_id"
    
    # Set project
    gcloud config set project $project_id
    
    # Enable required APIs
    log_info "Enabling required APIs..."
    gcloud services enable compute.googleapis.com
    gcloud services enable dns.googleapis.com
    gcloud services enable iap.googleapis.com
    gcloud services enable logging.googleapis.com
    gcloud services enable monitoring.googleapis.com
    
    log_success "GCP project setup completed!"
}

# Deploy environment
deploy_environment() {
    local env=$1
    
    log_info "Deploying $env environment..."
    
    cd $env
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        log_warning "terraform.tfvars not found. Creating from example..."
        cp terraform.tfvars.example terraform.tfvars
        log_warning "Please edit terraform.tfvars with your values and run the script again."
        exit 1
    fi
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Validate configuration
    log_info "Validating Terraform configuration..."
    terraform validate
    
    # Plan deployment
    log_info "Planning deployment..."
    terraform plan -out=tfplan
    
    # Ask for confirmation
    echo
    read -p "Do you want to apply these changes? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Deployment cancelled."
        exit 0
    fi
    
    # Apply changes
    log_info "Applying changes..."
    terraform apply tfplan
    
    # Clean up plan file
    rm -f tfplan
    
    log_success "$env environment deployed successfully!"
    
    # Show important outputs
    echo
    log_info "Important information:"
    terraform output
    
    cd ..
}

# Show usage
show_usage() {
    echo "Usage: $0 [staging|production|both] [project-id]"
    echo
    echo "Examples:"
    echo "  $0 staging my-codaloo-project"
    echo "  $0 production my-codaloo-project"
    echo "  $0 both my-codaloo-project"
    echo
}

# Main function
main() {
    local environment=$1
    local project_id=$2
    
    # Check arguments
    if [ -z "$environment" ] || [ -z "$project_id" ]; then
        show_usage
        exit 1
    fi
    
    if [ "$environment" != "staging" ] && [ "$environment" != "production" ] && [ "$environment" != "both" ]; then
        log_error "Invalid environment. Use 'staging', 'production', or 'both'."
        exit 1
    fi
    
    # Banner
    echo "========================================"
    echo "🚀 Codaloo GCP Deployment Script"
    echo "========================================"
    echo "Environment: $environment"
    echo "Project ID: $project_id"
    echo "========================================"
    echo
    
    # Check prerequisites
    check_prerequisites
    
    # Setup GCP project
    setup_gcp_project $project_id
    
    # Deploy environments
    case $environment in
        "staging")
            deploy_environment "staging"
            ;;
        "production")
            deploy_environment "production"
            ;;
        "both")
            deploy_environment "staging"
            echo
            log_info "Staging deployment completed. Starting production deployment..."
            echo
            deploy_environment "production"
            ;;
    esac
    
    # Final message
    echo
    log_success "🎉 Deployment completed successfully!"
    echo
    log_info "Next steps:"
    if [ "$environment" = "staging" ] || [ "$environment" = "both" ]; then
        echo "1. Connect to staging VM using IAP tunnel"
        echo "2. Deploy your Codaloo application"
        echo "3. Test the staging environment"
    fi
    if [ "$environment" = "production" ] || [ "$environment" = "both" ]; then
        echo "1. Update DNS records if using external DNS provider"
        echo "2. Setup Docker Swarm cluster"
        echo "3. Deploy your Codaloo application to production"
    fi
    echo
    log_info "For detailed instructions, see terraform/README.md"
}

# Run main function with all arguments
main "$@" 