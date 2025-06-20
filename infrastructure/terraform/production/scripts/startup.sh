#!/bin/bash

# Codaloo Production Environment Setup Script
# This script runs on VM startup to install and configure the production environment

set -e

# Variables
ENVIRONMENT="${environment}"
VM_INDEX="${vm_index}"
LOG_FILE="/var/log/codaloo-setup.log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

log "Starting Codaloo $ENVIRONMENT environment setup for VM $VM_INDEX..."

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
    fail2ban \
    ufw

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

# Install Portainer Agent (for production cluster management)
log "Installing Portainer Agent..."
docker run -d \
    --name portainer_agent \
    --restart always \
    -p 9001:9001 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /var/lib/docker/volumes:/var/lib/docker/volumes \
    portainer/agent:latest

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
mkdir -p $MOUNT_POINT/{docker-data,logs,backups,codaloo-app,ssl}
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

# Install monitoring tools
log "Installing monitoring tools..."
apt-get install -y prometheus-node-exporter

# Create environment file for Codaloo
log "Creating environment configuration..."
cat > $MOUNT_POINT/.env.production << EOF
# Codaloo Production Environment Configuration
NODE_ENV=production
ENVIRONMENT=production
VM_INDEX=$VM_INDEX

# Database Configuration
MYSQL_ROOT_PASSWORD=codaloo_prod_root_secure_2024
MYSQL_DATABASE=codaloo_production
MYSQL_USER=codaloo_user
MYSQL_PASSWORD=codaloo_prod_secure_pass_2024
MYSQL_HOST=mysql-prod
MYSQL_PORT=3306

# MongoDB Configuration
MONGODB_URI=mongodb://mongodb-prod:27017/codaloo_production
MONGODB_DATABASE=codaloo_production

# Redis Configuration
REDIS_URL=redis://redis-prod:6379
REDIS_HOST=redis-prod
REDIS_PORT=6379

# Application Configuration
WEB_PORT=3000
API_PORT=4000
PORTAINER_AGENT_PORT=9001

# Security
JWT_SECRET=your_jwt_secret_key_production_2024_secure
SESSION_SECRET=your_session_secret_production_2024_secure

# Google Cloud / Firebase (to be configured)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
FIREBASE_PROJECT_ID=your-firebase-project-id

# Gemini AI Configuration (to be configured)
GEMINI_API_KEY=your_gemini_api_key

# Domain Configuration
DOMAIN=youmeyou.ai
PROTOCOL=https

# Load Balancer Configuration
LOAD_BALANCER_IP=load_balancer_ip_here

# Monitoring
ENABLE_MONITORING=true
METRICS_PORT=9100
EOF

chown ubuntu:ubuntu $MOUNT_POINT/.env.production

# Setup Docker Swarm (only on first VM)
if [ "$VM_INDEX" = "1" ]; then
    log "Initializing Docker Swarm..."
    SWARM_TOKEN_FILE="$MOUNT_POINT/.swarm-token"
    
    # Initialize swarm
    docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')
    
    # Save join tokens
    docker swarm join-token worker -q > $SWARM_TOKEN_FILE
    docker swarm join-token manager -q > "$MOUNT_POINT/.swarm-manager-token"
    
    chown ubuntu:ubuntu $SWARM_TOKEN_FILE
    chown ubuntu:ubuntu "$MOUNT_POINT/.swarm-manager-token"
    
    log "Docker Swarm initialized. Join tokens saved."
else
    log "Docker Swarm worker node - waiting for join token..."
    # Note: In production, you'd typically use a service discovery mechanism
    # For now, this would need manual intervention or automation
fi

# Create systemd service for Codaloo
log "Creating Codaloo systemd service..."
cat > /etc/systemd/system/codaloo-production.service << EOF
[Unit]
Description=Codaloo Production Environment
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=true
User=ubuntu
Group=ubuntu
WorkingDirectory=$MOUNT_POINT/codaloo-app
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# Setup enhanced security
log "Configuring security..."

# Configure fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Configure firewall (ufw)
ufw --force reset
ufw --force enable
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # Web app
ufw allow 4000/tcp  # API
ufw allow 9001/tcp  # Portainer Agent
ufw allow 9100/tcp  # Node exporter

# Allow internal communication
ufw allow from 10.1.1.0/24

# Docker Swarm ports
ufw allow 2376/tcp
ufw allow 2377/tcp
ufw allow 7946/tcp
ufw allow 7946/udp
ufw allow 4789/udp

# Setup log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/codaloo << EOF
$LOG_FILE {
    daily
    rotate 30
    compress
    missingok
    notifempty
    create 644 root root
}

$MOUNT_POINT/logs/*.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
    create 644 ubuntu ubuntu
}
EOF

# Setup backup script
log "Creating backup script..."
cat > $MOUNT_POINT/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/codaloo-data/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup databases
docker exec mysql-prod mysqldump -u root -p$MYSQL_ROOT_PASSWORD --all-databases > $BACKUP_DIR/mysql_backup_$DATE.sql
docker exec mongodb-prod mongodump --out $BACKUP_DIR/mongodb_backup_$DATE

# Backup application data
tar -czf $BACKUP_DIR/app_data_$DATE.tar.gz /opt/codaloo-data/codaloo-app

# Remove old backups (keep 7 days)
find $BACKUP_DIR -name "*_backup_*" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x $MOUNT_POINT/backup.sh
chown ubuntu:ubuntu $MOUNT_POINT/backup.sh

# Setup cron for backups
echo "0 2 * * * ubuntu /opt/codaloo-data/backup.sh >> /var/log/backup.log 2>&1" >> /etc/crontab

# Create welcome message
log "Creating welcome message..."
cat > /etc/motd << EOF

🚀 Codaloo Production Environment - VM $VM_INDEX
===============================================

Environment: $ENVIRONMENT
VM Index: $VM_INDEX
Data Directory: $MOUNT_POINT
Docker Status: $(systemctl is-active docker)
Portainer Agent: Running on port 9001

Quick Commands:
- View logs: tail -f $LOG_FILE
- Check containers: docker ps
- Check swarm status: docker node ls
- Run backup: $MOUNT_POINT/backup.sh
- Check firewall: ufw status

Security:
- Fail2ban: $(systemctl is-active fail2ban)
- UFW Firewall: $(ufw status --verbose | head -1)
- Node Exporter: Running on port 9100

For support: Check /var/log/codaloo-setup.log

EOF

# Final setup
log "Final setup steps..."

# Enable services
systemctl enable docker
systemctl enable fail2ban
systemctl enable prometheus-node-exporter

# Start node exporter
systemctl start prometheus-node-exporter

# Clean up
apt-get autoremove -y
apt-get autoclean

log "Codaloo $ENVIRONMENT environment setup completed successfully for VM $VM_INDEX!"
log "System is production-ready with enhanced security and monitoring."

# Create completion flag
touch $MOUNT_POINT/.setup-complete-vm-$VM_INDEX
echo "$(date)" > $MOUNT_POINT/.setup-complete-vm-$VM_INDEX

log "Setup script finished. VM $VM_INDEX ready for production deployment!" 