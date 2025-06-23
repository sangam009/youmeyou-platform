#!/bin/bash

echo "🔒 YouMeYou IP Access Update Tool"
echo "=================================="

# Get current public IP
echo "🌐 Detecting your current public IP..."
CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || curl -s icanhazip.com 2>/dev/null)

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Could not detect your public IP automatically"
    echo "Please manually find your IP using: curl ifconfig.me"
    exit 1
fi

echo "✅ Your current public IP: $CURRENT_IP"
echo ""

# Determine IP range
IP_RANGE="${CURRENT_IP}/32"  # Single IP by default

echo "📋 IP Configuration Options:"
echo "1. Single IP: ${CURRENT_IP}/32 (recommended for security)"
echo "2. Class C range: ${CURRENT_IP%.*}.0/24 (allows 256 IPs in range)"
echo ""

read -p "Choose option (1 or 2) [default: 1]: " choice
choice=${choice:-1}

if [ "$choice" = "2" ]; then
    IP_RANGE="${CURRENT_IP%.*}.0/24"
    echo "📡 Using IP range: $IP_RANGE"
else
    IP_RANGE="${CURRENT_IP}/32"
    echo "🎯 Using single IP: $IP_RANGE"
fi

echo ""
echo "🔧 Updating nginx configuration..."

# Backup original config
if [ ! -f "nginx-config/youmeyou.conf.backup" ]; then
    cp nginx-config/youmeyou.conf nginx-config/youmeyou.conf.backup
    echo "📁 Created backup: nginx-config/youmeyou.conf.backup"
fi

# Update the nginx config file
sed -i.tmp "s|103\.87\.169\.0/24|$IP_RANGE|g" nginx-config/youmeyou.conf
rm -f nginx-config/youmeyou.conf.tmp

echo "✅ Updated nginx configuration with IP: $IP_RANGE"
echo ""

echo "📋 DNS Entries to Add:"
echo "======================"
echo "Add these A records in your DNS provider:"
echo ""
echo "Type: A, Name: portainer-staging, Value: 34.93.209.77"
echo "Type: A, Name: registry-staging, Value: 34.93.209.77"  
echo "Type: A, Name: registry-ui-staging, Value: 34.93.209.77"
echo ""

echo "🚀 Next Steps:"
echo "=============="
echo "1. Add the DNS entries above in your DNS provider"
echo "2. Wait 5-10 minutes for DNS propagation"
echo "3. Deploy the gateway stack in Portainer"
echo "4. Test access:"
echo "   - Portainer: http://portainer-staging.youmeyou.ai"
echo "   - Registry UI: http://registry-ui-staging.youmeyou.ai"
echo ""

echo "🔐 Registry Authentication:"
echo "=========================="
echo "In Portainer → Registries → Add registry:"
echo "Name: YouMeYou Registry"
echo "URL: http://registry-staging.youmeyou.ai"
echo "Username: youmeyou"
echo "Password: staging2024!"
echo ""

echo "✅ IP access configuration completed!" 