#!/bin/bash

# Copy SSL setup files to VM
# Run this script from your local machine

VM_IP="34.93.209.77"
VM_USER="ubuntu"

echo "📦 Copying SSL setup files to VM..."

# Copy SSL setup script
echo "Copying SSL setup script..."
scp portainer-stacks/setup-dns-ssl-step-by-step.sh ${VM_USER}@${VM_IP}:/home/ubuntu/

# Copy nginx SSL configuration
echo "Copying nginx SSL configuration..."
scp portainer-stacks/nginx-config/youmeyou-ssl.conf ${VM_USER}@${VM_IP}:/home/ubuntu/

# Copy SSL-enabled gateway stack
echo "Copying SSL gateway stack..."
scp portainer-stacks/4-gateway-service-ssl.yml ${VM_USER}@${VM_IP}:/home/ubuntu/

# Copy web application stack
echo "Copying web application stack..."
scp portainer-stacks/5-codaloo-web.yml ${VM_USER}@${VM_IP}:/home/ubuntu/

echo "✅ All files copied to VM"
echo ""
echo "Next steps:"
echo "1. Ensure DNS records are configured (see DNS_SETUP_REQUIRED.md)"
echo "2. SSH to VM: ssh ${VM_USER}@${VM_IP}"
echo "3. Run SSL setup: ./setup-dns-ssl-step-by-step.sh"
echo "4. Deploy web app in Portainer using 5-codaloo-web.yml" 