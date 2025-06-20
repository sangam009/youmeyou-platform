#!/bin/bash

# Codaloo Staging Environment Setup Script
# This script runs on VM startup to install and configure the environment

set -e

# Variables
ENVIRONMENT="${environment}"
LOG_FILE="/var/log/codaloo-setup.log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

log "Starting Codaloo $ENVIRONMENT environment setup..."

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
    lsb-release

# Install Docker
log "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install Docker Compose (standalone)
log "Installing Docker Compose..."
DOCKER_COMPOSE_VERSION="2.24.0"
curl -L "https://github.com/docker/compose/releases/download/v$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install Portainer
log "Installing Portainer..."
docker volume create portainer_data
docker run -d \
    --name portainer \
    --restart always \
    -p 9000:9000 \
    -p 9443:9443 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v portainer_data:/data \
    portainer/portainer-ce:latest

# Mount and format data disk
log "Setting up data disk..."
DATA_DISK="/dev/disk/by-id/google-data-disk"
MOUNT_POINT="/opt/codaloo-data"

if [ -b "$DATA_DISK" ]; then
    # Check if disk is already formatted
    if ! blkid $DATA_DISK; then
        log "Formatting data disk..."
        mkfs.ext4 -F $DATA_DISK
    fi
    
    # Create mount point and mount
    mkdir -p $MOUNT_POINT
    mount $DATA_DISK $MOUNT_POINT
    
    # Add to fstab for persistent mounting
    echo "$DATA_DISK $MOUNT_POINT ext4 defaults 0 2" >> /etc/fstab
    
    # Set permissions
    chown -R ubuntu:ubuntu $MOUNT_POINT
    chmod 755 $MOUNT_POINT
    
    log "Data disk mounted at $MOUNT_POINT"
else
    log "Data disk not found, creating directory..."
    mkdir -p $MOUNT_POINT
    chown -R ubuntu:ubuntu $MOUNT_POINT
fi

# Create directory structure
log "Creating directory structure..."
mkdir -p $MOUNT_POINT/{docker-data,logs,backups,codaloo-app}
mkdir -p $MOUNT_POINT/docker-data/{mysql,mongodb,redis}
chown -R ubuntu:ubuntu $MOUNT_POINT

# Install Node.js (for development)
log "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Google Cloud SDK
log "Installing Google Cloud SDK..."
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
apt-get update -y
apt-get install -y google-cloud-cli

# Create environment file for Codaloo
log "Creating environment configuration..."
cat > $MOUNT_POINT/.env.staging << EOF
# Codaloo Staging Environment Configuration
NODE_ENV=staging
ENVIRONMENT=staging

# Database Configuration
MYSQL_ROOT_PASSWORD=codaloo_staging_root_2024
MYSQL_DATABASE=codaloo_staging
MYSQL_USER=codaloo_user
MYSQL_PASSWORD=codaloo_staging_pass_2024
MYSQL_HOST=mysql-staging
MYSQL_PORT=3306

# MongoDB Configuration
MONGODB_URI=mongodb://mongodb-staging:27017/codaloo_staging
MONGODB_DATABASE=codaloo_staging

# Redis Configuration
REDIS_URL=redis://redis-staging:6379
REDIS_HOST=redis-staging
REDIS_PORT=6379

# Application Configuration
WEB_PORT=3000
API_PORT=4000
PORTAINER_PORT=9000

# Security
JWT_SECRET=your_jwt_secret_key_staging_2024
SESSION_SECRET=your_session_secret_staging_2024

# Google Cloud / Firebase (to be configured)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
FIREBASE_PROJECT_ID=your-firebase-project-id

# Gemini AI Configuration (to be configured)
GEMINI_API_KEY=your_gemini_api_key

# Domain Configuration
DOMAIN=staging.youmeyou.ai
PROTOCOL=http
EOF

chown ubuntu:ubuntu $MOUNT_POINT/.env.staging

# Create systemd service for Codaloo
log "Creating Codaloo systemd service..."
cat > /etc/systemd/system/codaloo-staging.service << EOF
[Unit]
Description=Codaloo Staging Environment
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=true
User=ubuntu
Group=ubuntu
WorkingDirectory=$MOUNT_POINT/codaloo-app
ExecStart=/usr/local/bin/docker-compose -f docker-compose.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# Setup firewall rules (ufw)
log "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow 4000/tcp
ufw allow 9000/tcp

# Create welcome message
log "Creating welcome message..."
cat > /etc/motd << EOF

🚀 Codaloo Staging Environment
=============================

Environment: $ENVIRONMENT
Data Directory: $MOUNT_POINT
Docker Status: $(systemctl is-active docker)
Portainer URL: http://localhost:9000

Quick Commands:
- View logs: tail -f $LOG_FILE
- Check containers: docker ps
- Access Portainer: http://localhost:9000
- SSH tunnel for web: gcloud compute start-iap-tunnel [VM_NAME] 3000 --local-host-port=localhost:3000 --zone=[ZONE]

For support: Check /var/log/codaloo-setup.log

EOF

# Set up log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/codaloo << EOF
$LOG_FILE {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 644 root root
}
EOF

# Final setup
log "Final setup steps..."
# Enable services
systemctl enable docker
systemctl enable portainer || true

# Clean up
apt-get autoremove -y
apt-get autoclean

log "Codaloo $ENVIRONMENT environment setup completed successfully!"
log "System will be ready in a few minutes. Check 'docker ps' to see running containers."

# Create a flag file to indicate setup completion
touch $MOUNT_POINT/.setup-complete
echo "$(date)" > $MOUNT_POINT/.setup-complete

log "Setup script finished. System ready for Codaloo deployment!" 