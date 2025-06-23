#!/bin/bash

# YouMeYou Staging VM Control Script
# Provides manual control over the staging VM for emergency access

set -e

PROJECT_ID="youmeyou"
ZONE="asia-south1-a"
VM_NAME="youmeyou-staging-vm"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to get VM status
get_vm_status() {
    gcloud compute instances describe $VM_NAME \
        --zone=$ZONE \
        --project=$PROJECT_ID \
        --format="value(status)" 2>/dev/null || echo "NOT_FOUND"
}

# Function to get VM public IP
get_vm_ip() {
    gcloud compute instances describe $VM_NAME \
        --zone=$ZONE \
        --project=$PROJECT_ID \
        --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null || echo "N/A"
}

# Function to show VM info
show_vm_info() {
    local status=$(get_vm_status)
    local ip=$(get_vm_ip)
    
    echo ""
    echo "=== YouMeYou Staging VM Status ==="
    echo "VM Name: $VM_NAME"
    echo "Project: $PROJECT_ID"
    echo "Zone: $ZONE"
    echo "Status: $status"
    echo "Public IP: $ip"
    echo ""
    
    if [ "$status" = "RUNNING" ]; then
        echo "🔗 Access URLs:"
        echo "  SSH: ssh -i ~/.ssh/id_rsa ubuntu@$ip"
        echo "  Portainer: http://$ip:9000"
        echo "  Web Frontend: http://$ip:3000"
        echo "  API: http://$ip:4000"
    fi
    echo ""
}

# Function to start VM
start_vm() {
    local status=$(get_vm_status)
    
    if [ "$status" = "RUNNING" ]; then
        print_warning "VM is already running!"
        return 0
    fi
    
    print_status "Starting VM..."
    gcloud compute instances start $VM_NAME \
        --zone=$ZONE \
        --project=$PROJECT_ID
    
    print_success "VM start command sent!"
    print_status "Waiting for VM to be ready..."
    
    # Wait for VM to be running
    local count=0
    while [ $count -lt 30 ]; do
        local current_status=$(get_vm_status)
        if [ "$current_status" = "RUNNING" ]; then
            print_success "VM is now running!"
            break
        fi
        sleep 10
        count=$((count + 1))
        print_status "Still waiting... ($count/30)"
    done
}

# Function to stop VM
stop_vm() {
    local status=$(get_vm_status)
    
    if [ "$status" = "TERMINATED" ]; then
        print_warning "VM is already stopped!"
        return 0
    fi
    
    print_status "Stopping VM..."
    gcloud compute instances stop $VM_NAME \
        --zone=$ZONE \
        --project=$PROJECT_ID
    
    print_success "VM stop command sent!"
}

# Function to restart VM
restart_vm() {
    print_status "Restarting VM..."
    stop_vm
    sleep 10
    start_vm
}

# Function to show schedule
show_schedule() {
    echo ""
    echo "=== Current VM Schedule ==="
    echo "🕘 Start: 9:00 AM IST (Monday-Friday)"
    echo "🕖 Stop:  7:00 PM IST (Monday-Friday)"
    echo "🛑 Weekend: Completely off (Saturday-Sunday)"
    echo ""
    echo "💰 Estimated monthly cost with schedule: ~₹3,500 ($42)"
    echo "💰 Savings compared to 24/7: ~70%"
    echo ""
}

# Function to show usage
show_usage() {
    echo ""
    echo "YouMeYou Staging VM Control Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status    - Show current VM status and access URLs"
    echo "  start     - Start the VM (for emergency access)"
    echo "  stop      - Stop the VM immediately"
    echo "  restart   - Restart the VM"
    echo "  schedule  - Show the automatic schedule"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status           # Check current status"
    echo "  $0 start            # Start VM for emergency work"
    echo "  $0 stop             # Stop VM to save costs"
    echo ""
}

# Main script logic
case "${1:-help}" in
    "status")
        show_vm_info
        ;;
    "start")
        start_vm
        show_vm_info
        ;;
    "stop")
        stop_vm
        print_success "VM stopped successfully!"
        ;;
    "restart")
        restart_vm
        show_vm_info
        ;;
    "schedule")
        show_schedule
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac 