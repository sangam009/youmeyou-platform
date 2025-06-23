#!/bin/bash

# YouMeYou Staging - Update Firewall Access Script
# Use this script to update firewall rules when your IP address changes

set -e

# Configuration
FIREWALL_RULE_NAME="youmeyou-staging-allow-web-restricted"
NETWORK="youmeyou-staging-vpc"
TARGET_TAGS="youmeyou-staging"
PORTS="tcp:80,tcp:443,tcp:3000,tcp:4000,tcp:9000"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Function to get current public IP
get_current_ip() {
    curl -4 -s ifconfig.me 2>/dev/null || curl -4 -s ipinfo.io/ip 2>/dev/null || echo "UNKNOWN"
}

# Function to get current firewall rule source ranges
get_current_firewall_ranges() {
    gcloud compute firewall-rules describe $FIREWALL_RULE_NAME --format="value(sourceRanges)" 2>/dev/null || echo ""
}

# Function to show current access
show_current_access() {
    local current_ip=$(get_current_ip)
    local current_ranges=$(get_current_firewall_ranges)
    
    echo "🔒 YouMeYou Staging Access Control"
    echo "=================================="
    echo "Your current IP: $current_ip"
    echo "Allowed IP ranges: $current_ranges"
    echo "Firewall rule: $FIREWALL_RULE_NAME"
    echo
    
    if [[ $current_ranges == *"$current_ip/32"* ]]; then
        print_status "✅ Your current IP is allowed"
        echo "🔗 You can access:"
        echo "   - Portainer: http://34.93.209.77:9000"
        echo "   - Web App: http://34.93.209.77:3000"
        echo "   - API: http://34.93.209.77:4000"
        echo "   - Staging: https://staging.youmeyou.ai"
    else
        print_warning "⚠️  Your current IP is NOT allowed"
        echo "Run: $0 update-my-ip"
    fi
}

# Function to show help
show_help() {
    echo "YouMeYou Staging Access Control"
    echo "==============================="
    echo
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  show              - Show current access status"
    echo "  help              - Show this help message"
    echo
    echo "Note: This script restricts access to staging.youmeyou.ai"
    echo "Only your IP (106.222.232.175) can access the staging environment."
}

# Main script logic
case "${1:-help}" in
    "show")
        show_current_access
        ;;
    "help"|*)
        show_help
        ;;
esac
