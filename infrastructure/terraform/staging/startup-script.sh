#!/bin/bash

# YouMeYou Staging Environment Setup Script
# This script runs on VM startup to install and configure the environment

set -e

# Variables
ENVIRONMENT="${environment}"
LOG_FILE="/var/log/youmeyou-setup.log"
DATA_DISK="/dev/disk/by-id/google-youmeyou-data"
MOUNT_POINT="/opt/youmeyou"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

log "Starting YouMeYou $ENVIRONMENT environment setup..."

# Update system
log "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install essential packages
log "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    vim \
    jq \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw

# Setup data disk
log "Setting up data disk..."
if [ -b "$DATA_DISK" ]; then
    # Check if disk is already formatted
    if ! blkid "$DATA_DISK"; then
        log "Formatting data disk..."
        mkfs.ext4 -F "$DATA_DISK"
    fi
    
    # Create mount point and mount
    mkdir -p "$MOUNT_POINT"
    if ! mountpoint -q "$MOUNT_POINT"; then
        mount "$DATA_DISK" "$MOUNT_POINT"
        echo "$DATA_DISK $MOUNT_POINT ext4 defaults 0 2" >> /etc/fstab
    fi
    
    # Set permissions
    chown -R ubuntu:ubuntu "$MOUNT_POINT"
    chmod 755 "$MOUNT_POINT"
else
    log "Data disk not found, creating local directory..."
    mkdir -p "$MOUNT_POINT"
    chown -R ubuntu:ubuntu "$MOUNT_POINT"
fi

# Install Docker
log "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
log "Installing Docker Compose..."
DOCKER_COMPOSE_VERSION="2.24.0"
curl -L "https://github.com/docker/compose/releases/download/v$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create symlink for compatibility
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Setup Portainer
log "Setting up Portainer..."
mkdir -p "$MOUNT_POINT/portainer"
chown -R ubuntu:ubuntu "$MOUNT_POINT/portainer"

# Create Portainer Docker Compose file
cat > "$MOUNT_POINT/docker-compose.portainer.yml" << 'EOF'
version: '3.8'

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    environment:
      - PORTAINER_ADMIN_PASSWORD_FILE=/run/secrets/portainer_password
    secrets:
      - portainer_password

volumes:
  portainer_data:

secrets:
  portainer_password:
    file: ./portainer_password.txt
EOF

# Create default Portainer password (change this!)
echo "youmeyou123!" > "$MOUNT_POINT/portainer_password.txt"
chown ubuntu:ubuntu "$MOUNT_POINT/portainer_password.txt"
chmod 600 "$MOUNT_POINT/portainer_password.txt"

# Start Portainer
log "Starting Portainer..."
cd "$MOUNT_POINT"
docker-compose -f docker-compose.portainer.yml up -d

# Setup YouMeYou application directories
log "Setting up YouMeYou application directories..."
mkdir -p "$MOUNT_POINT/youmeyou"/{backend,frontend,data,logs}
chown -R ubuntu:ubuntu "$MOUNT_POINT/youmeyou"

# Create YouMeYou Docker Compose template
cat > "$MOUNT_POINT/youmeyou/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  # Design Microservice
  design-service:
    image: node:18
    container_name: youmeyou-design-service
    restart: unless-stopped
    ports:
      - "4000:4000"
    volumes:
      - ./backend/designmicroservice:/app
      - ./data:/data
    working_dir: /app
    command: sh -c "npm install && npm start"
    environment:
      - NODE_ENV=staging
      - PORT=4000
    depends_on:
      - design-mongodb
      - design-redis

  # MongoDB for Design Service
  design-mongodb:
    image: mongo:7
    container_name: youmeyou-design-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=youmeyou_design

  # Redis for Design Service
  design-redis:
    image: redis:7-alpine
    container_name: youmeyou-design-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Web Frontend
  web-frontend:
    image: node:18
    container_name: youmeyou-web-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/web:/app
    working_dir: /app
    command: sh -c "npm install && npm run build && npm start"
    environment:
      - NODE_ENV=staging
      - NEXT_PUBLIC_API_URL=http://localhost:4000

volumes:
  mongodb_data:
  redis_data:
EOF

chown ubuntu:ubuntu "$MOUNT_POINT/youmeyou/docker-compose.yml"

# Setup firewall
log "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # Web frontend
ufw allow 4000/tcp  # API
ufw allow 9000/tcp  # Portainer

# Create helpful scripts
log "Creating helper scripts..."

# Create deployment script
cat > "$MOUNT_POINT/deploy-youmeyou.sh" << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying YouMeYou application..."

cd /opt/youmeyou/youmeyou

# Pull latest code (you'll need to set up git repo)
# git pull origin main

# Restart services
docker-compose down
docker-compose up -d

echo "✅ YouMeYou deployed successfully!"
echo "🌐 Web Frontend: http://$(curl -s ifconfig.me):3000"
echo "🔧 API: http://$(curl -s ifconfig.me):4000"
echo "📊 Portainer: http://$(curl -s ifconfig.me):9000"
EOF

chmod +x "$MOUNT_POINT/deploy-youmeyou.sh"
chown ubuntu:ubuntu "$MOUNT_POINT/deploy-youmeyou.sh"

# Create status script
cat > "$MOUNT_POINT/status.sh" << 'EOF'
#!/bin/bash
echo "=== YouMeYou Staging Environment Status ==="
echo "📍 Server: $(hostname)"
echo "🌐 Public IP: $(curl -s ifconfig.me)"
echo "💾 Disk Usage:"
df -h /opt/youmeyou
echo ""
echo "🐳 Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🔗 Access URLs:"
echo "  Web Frontend: http://$(curl -s ifconfig.me):3000"
echo "  API: http://$(curl -s ifconfig.me):4000"
echo "  Portainer: http://$(curl -s ifconfig.me):9000"
EOF

chmod +x "$MOUNT_POINT/status.sh"
chown ubuntu:ubuntu "$MOUNT_POINT/status.sh"

# Create welcome message
cat > /etc/motd << 'EOF'
 __   __                __  __       __   __
|  \ /  |              |  \/  |     |  \ /  |
 \  V  /___  _   _     |      | ___ |  V  / _   _
  \   // _ \| | | |    | |\/| |/ _ \|    / | | | |
   | || (_) | |_| |    | |  | |  __/| |\ \ | |_| |
   |_| \___/ \__,_|    |_|  |_|\___||_| \_\ \__,_|

🚀 YouMeYou Staging Environment - Mumbai, India

📊 Status: /opt/youmeyou/status.sh
🚀 Deploy: /opt/youmeyou/deploy-youmeyou.sh
📁 Data: /opt/youmeyou/
🐳 Portainer: http://YOUR_IP:9000

Default Portainer password: youmeyou123!
EOF

log "Creating systemd service for YouMeYou..."
cat > /etc/systemd/system/youmeyou.service << 'EOF'
[Unit]
Description=YouMeYou Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/youmeyou/youmeyou
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable youmeyou.service

log "YouMeYou staging environment setup completed successfully!"
log "🌐 Public IP: $(curl -s ifconfig.me)"
log "🚀 Ready for deployment!"

# Final status
log "Final system status:"
docker --version
docker-compose --version
systemctl status docker --no-pager
df -h "$MOUNT_POINT"

log "Setup completed at $(date)" 