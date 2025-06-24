#!/bin/bash

# YouMeYou Platform - Firewall Access Management Script
# This script manages GCP firewall rules for the staging environment
# Features:
# - Auto-detect and update current IP
# - Add custom IP addresses
# - Enable/disable public access
# - List current access rules

set -e

# Configuration
PROJECT_ID="youmeyou"
NETWORK="youmeyou-staging-vpc"
TARGET_TAGS="youmeyou-staging"
RULE_NAME="youmeyou-staging-web-access-wifi"
PORTS="tcp:80,tcp:443"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to get current public IP
get_current_ip() {
    local ip
    ip=$(curl -s -4 ifconfig.me 2>/dev/null || curl -s -4 icanhazip.com 2>/dev/null || curl -s -4 ipinfo.io/ip 2>/dev/null)
    if [[ -z "$ip" ]]; then
        print_error "Failed to detect current public IP"
        exit 1
    fi
    echo "$ip"
}

# Function to get current firewall rule source ranges
get_current_ranges() {
    gcloud compute firewall-rules describe "$RULE_NAME" --format="value(sourceRanges[])" 2>/dev/null || echo ""
}

# Function to check if rule exists
rule_exists() {
    gcloud compute firewall-rules describe "$RULE_NAME" >/dev/null 2>&1
}

# Function to create or update firewall rule
update_firewall_rule() {
    local source_ranges="$1"
    local action="$2"  # "create" or "update"
    
    if [[ "$action" == "create" ]]; then
        print_status "Creating firewall rule: $RULE_NAME"
        gcloud compute firewall-rules create "$RULE_NAME" \
            --direction=INGRESS \
            --priority=1000 \
            --network="$NETWORK" \
            --action=ALLOW \
            --rules="$PORTS" \
            --source-ranges="$source_ranges" \
            --target-tags="$TARGET_TAGS"
    else
        print_status "Updating firewall rule: $RULE_NAME"
        gcloud compute firewall-rules update "$RULE_NAME" \
            --source-ranges="$source_ranges"
    fi
}

# Function to delete firewall rule
delete_firewall_rule() {
    if rule_exists; then
        print_status "Deleting firewall rule: $RULE_NAME"
        gcloud compute firewall-rules delete "$RULE_NAME" --quiet
    else
        print_warning "Firewall rule $RULE_NAME does not exist"
    fi
}

# Function to update current IP access
update_current_ip() {
    local current_ip
    current_ip=$(get_current_ip)
    local ip_range="${current_ip}/32"
    
    print_info "Detected current IP: $current_ip"
    
    if rule_exists; then
        local current_ranges
        current_ranges=$(get_current_ranges)
        
        # Check if current IP is already in the ranges
        if echo "$current_ranges" | grep -q "$ip_range"; then
            print_status "Current IP $current_ip is already allowed"
            return 0
        fi
        
        # Add current IP to existing ranges (remove duplicates and public access)
        local new_ranges
        new_ranges=$(echo "$current_ranges,$ip_range" | tr ',' '\n' | grep -v "0.0.0.0/0" | sort -u | tr '\n' ',' | sed 's/,$//')
        
        update_firewall_rule "$new_ranges" "update"
    else
        update_firewall_rule "$ip_range" "create"
    fi
    
    print_status "Firewall updated to allow access from your current IP: $current_ip"
}

# Function to add custom IP
add_custom_ip() {
    local custom_ip="$1"
    
    # Validate IP format
    if [[ ! "$custom_ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(/[0-9]{1,2})?$ ]]; then
        print_error "Invalid IP format: $custom_ip"
        print_info "Use format: 192.168.1.1 or 192.168.1.0/24"
        exit 1
    fi
    
    # Add /32 if no CIDR specified
    if [[ ! "$custom_ip" =~ / ]]; then
        custom_ip="${custom_ip}/32"
    fi
    
    print_info "Adding custom IP: $custom_ip"
    
    if rule_exists; then
        local current_ranges
        current_ranges=$(get_current_ranges)
        
        # Check if IP is already in the ranges
        if echo "$current_ranges" | grep -q "$custom_ip"; then
            print_status "IP $custom_ip is already allowed"
            return 0
        fi
        
        # Add custom IP to existing ranges
        local new_ranges
        new_ranges=$(echo "$current_ranges,$custom_ip" | tr ',' '\n' | grep -v "0.0.0.0/0" | sort -u | tr '\n' ',' | sed 's/,$//')
        
        update_firewall_rule "$new_ranges" "update"
    else
        update_firewall_rule "$custom_ip" "create"
    fi
    
    print_status "Firewall updated to allow access from: $custom_ip"
}

# Function to enable public access
enable_public_access() {
    print_warning "Enabling public access - your platform will be accessible from anywhere!"
    read -p "Are you sure you want to enable public access? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        print_info "Public access not enabled"
        return 0
    fi
    
    if rule_exists; then
        update_firewall_rule "0.0.0.0/0" "update"
    else
        update_firewall_rule "0.0.0.0/0" "create"
    fi
    
    print_status "Public access enabled - platform accessible from anywhere"
    print_warning "Remember to disable public access when not needed for security!"
}

# Function to disable public access and restore IP-based access
disable_public_access() {
    if ! rule_exists; then
        print_warning "No firewall rule exists"
        return 0
    fi
    
    local current_ranges
    current_ranges=$(get_current_ranges)
    
    if [[ "$current_ranges" != "0.0.0.0/0" ]]; then
        print_info "Public access is not currently enabled"
        return 0
    fi
    
    print_status "Disabling public access and restoring IP-based access"
    
    # Get current IP and set as allowed range
    local current_ip
    current_ip=$(get_current_ip)
    local ip_range="${current_ip}/32"
    
    update_firewall_rule "$ip_range" "update"
    
    print_status "Public access disabled - only your current IP ($current_ip) is allowed"
}

# Function to list current access
list_access() {
    if ! rule_exists; then
        print_warning "No firewall rule exists - no access configured"
        return 0
    fi
    
    print_info "Current firewall rule: $RULE_NAME"
    echo "----------------------------------------"
    gcloud compute firewall-rules describe "$RULE_NAME" --format="table(
        sourceRanges.list():label='ALLOWED_IPS',
        allowed[].map().firewall_rule().list():label='PORTS',
        direction:label='DIRECTION',
        priority:label='PRIORITY'
    )"
    echo "----------------------------------------"
    
    local current_ranges
    current_ranges=$(get_current_ranges)
    
    if [[ "$current_ranges" == "0.0.0.0/0" ]]; then
        print_warning "⚠️  PUBLIC ACCESS ENABLED - Platform accessible from anywhere!"
    else
        print_status "✅ Restricted access - Only specific IPs allowed"
    fi
}

# Function to remove specific IP
remove_ip() {
    local ip_to_remove="$1"
    
    if [[ ! "$ip_to_remove" =~ / ]]; then
        ip_to_remove="${ip_to_remove}/32"
    fi
    
    if ! rule_exists; then
        print_warning "No firewall rule exists"
        return 0
    fi
    
    local current_ranges
    current_ranges=$(get_current_ranges)
    
    if ! echo "$current_ranges" | grep -q "$ip_to_remove"; then
        print_warning "IP $ip_to_remove is not in the allowed list"
        return 0
    fi
    
    # Remove the IP from ranges
    local new_ranges
    new_ranges=$(echo "$current_ranges" | tr ',' '\n' | grep -v "$ip_to_remove" | sort -u | tr '\n' ',' | sed 's/,$//')
    
    if [[ -z "$new_ranges" ]]; then
        print_warning "Removing the last IP would block all access. Adding current IP instead."
        local current_ip
        current_ip=$(get_current_ip)
        new_ranges="${current_ip}/32"
    fi
    
    update_firewall_rule "$new_ranges" "update"
    print_status "Removed IP $ip_to_remove from allowed list"
}

# Function to show help
show_help() {
    cat << EOF
YouMeYou Platform - Firewall Access Management

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    update-ip           Update firewall to allow your current IP
    add-ip <IP>         Add a custom IP address (e.g., 192.168.1.1 or 192.168.1.0/24)
    remove-ip <IP>      Remove a specific IP from allowed list
    enable-public       Enable public access (WARNING: Accessible from anywhere)
    disable-public      Disable public access and restore IP-based access
    list               List current access rules
    delete             Delete the firewall rule completely
    help               Show this help message

EXAMPLES:
    $0 update-ip                    # Allow access from your current IP
    $0 add-ip 203.0.113.1          # Allow access from specific IP
    $0 add-ip 203.0.113.0/24       # Allow access from IP range
    $0 remove-ip 203.0.113.1       # Remove specific IP
    $0 enable-public               # Enable public access (with confirmation)
    $0 disable-public              # Disable public access
    $0 list                        # Show current access rules

NOTES:
    - This script manages the firewall rule: $RULE_NAME
    - Only ports 80 and 443 (HTTP/HTTPS) are managed
    - The reverse proxy (nginx) handles routing to internal services
    - Always disable public access when not needed for security

EOF
}

# Main script logic
case "${1:-help}" in
    "update-ip")
        update_current_ip
        ;;
    "add-ip")
        if [[ -z "$2" ]]; then
            print_error "Please provide an IP address"
            print_info "Usage: $0 add-ip <IP_ADDRESS>"
            exit 1
        fi
        add_custom_ip "$2"
        ;;
    "remove-ip")
        if [[ -z "$2" ]]; then
            print_error "Please provide an IP address to remove"
            print_info "Usage: $0 remove-ip <IP_ADDRESS>"
            exit 1
        fi
        remove_ip "$2"
        ;;
    "enable-public")
        enable_public_access
        ;;
    "disable-public")
        disable_public_access
        ;;
    "list")
        list_access
        ;;
    "delete")
        print_warning "This will delete the firewall rule and block all access!"
        read -p "Are you sure? (yes/no): " confirm
        if [[ "$confirm" == "yes" ]]; then
            delete_firewall_rule
        fi
        ;;
    "help"|*)
        show_help
        ;;
esac 