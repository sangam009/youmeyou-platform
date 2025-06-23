#!/bin/bash

# 🔒 YouMeYou Secure Firewall Configuration
# This script configures firewall rules to only expose gateway ports publicly
# All microservice ports remain accessible only at server level

set -e

echo "🔒 Configuring Secure Firewall for YouMeYou Platform..."

# Remove any existing microservice port rules
echo "📝 Removing any existing microservice firewall rules..."
sudo ufw --force delete allow 3001 2>/dev/null || true  # Auth service
sudo ufw --force delete allow 4000 2>/dev/null || true  # Design service  
sudo ufw --force delete allow 6000 2>/dev/null || true  # Payment service
sudo ufw --force delete allow 5000 2>/dev/null || true  # Registry
sudo ufw --force delete allow 5001 2>/dev/null || true  # Registry UI
sudo ufw --force delete allow 9000 2>/dev/null || true  # Portainer

echo "✅ Removed old microservice firewall rules"

# Configure essential ports only
echo "🌐 Opening only essential public ports..."

# Gateway ports (PUBLIC ACCESS)
sudo ufw allow 80/tcp comment "HTTP Gateway"
sudo ufw allow 443/tcp comment "HTTPS Gateway"

# SSH access (ADMIN ACCESS)
sudo ufw allow 22/tcp comment "SSH Access"

# Portainer management (ADMIN ACCESS - Consider restricting to specific IPs)
sudo ufw allow 9000/tcp comment "Portainer Admin"

# Docker registry (INTERNAL - for build process only)
sudo ufw allow 5000/tcp comment "Docker Registry (Internal)"
sudo ufw allow 5001/tcp comment "Registry UI (Internal)"

echo "🔒 Firewall Security Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PUBLIC ACCESS (Internet → Server):"
echo "   Port 80   - HTTP Gateway (nginx)"
echo "   Port 443  - HTTPS Gateway (nginx)"
echo "   Port 22   - SSH (admin access)"
echo ""
echo "🔧 ADMIN ACCESS (Restricted):"
echo "   Port 9000 - Portainer UI"
echo "   Port 5000 - Docker Registry"
echo "   Port 5001 - Registry UI"
echo ""
echo "🚫 BLOCKED FROM INTERNET:"
echo "   Port 3001 - Auth Service (server-level only)"
echo "   Port 4000 - Design Service (server-level only)"
echo "   Port 6000 - Payment Service (server-level only)"
echo "   All database ports (MySQL, MongoDB, Redis)"
echo ""
echo "🎯 ACCESS FLOW:"
echo "   Internet → Gateway (80/443) → Internal Services"
echo "   Services communicate internally via Docker networks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Enable firewall if not already enabled
echo "🔥 Enabling firewall..."
sudo ufw --force enable

# Show current status
echo "📊 Current Firewall Status:"
sudo ufw status numbered

echo ""
echo "✅ Secure firewall configuration complete!"
echo ""
echo "🔍 To verify microservice access:"
echo "   Server level: curl http://localhost:3001/health"
echo "   Public level: curl http://34.93.209.77/api/auth/health"
echo ""
echo "⚠️  SECURITY NOTE:"
echo "   - Microservices are NOT directly accessible from internet"
echo "   - All public traffic routes through nginx gateway"
echo "   - Database ports are completely internal"
echo "   - Consider restricting Portainer access to specific IPs" 