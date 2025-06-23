# YouMeYou GCP Infrastructure - Terraform Deployment

This directory contains Terraform configurations for deploying YouMeYou on Google Cloud Platform (GCP) with both staging and production environments optimized for India and US markets.

## 🏗️ Architecture Overview

### Staging Environment (India-based)
- **Region**: Asia-South1 (Mumbai) - for fast testing from India
- **Single VM**: e2-standard-4 (4 vCPU, 16GB RAM)
- **Private Access**: Via Identity-Aware Proxy (IAP)
- **Purpose**: Testing and development
- **Cost**: ~₹11,928/month (~$142/month)

### Production Environment (Multi-region ready)
- **Primary Region**: US-Central1 (US market)
- **Secondary Region**: Asia-South1 (India market) - configurable
- **High Availability**: 2 VMs with load balancer
- **Public Access**: HTTPS with SSL certificates
- **Auto-scaling**: Ready for future scaling
- **Cost**: ~₹25,704/month (~$306/month) per region

## 🌍 Regional Strategy

### Staging: India-focused
- **Region**: `asia-south1` (Mumbai)
- **Purpose**: Fast development and testing from India
- **Access**: Private via IAP tunnel

### Production: Global reach
- **Phase 1**: Single region deployment (US or India)
- **Phase 2**: Multi-region deployment for global performance
- **Markets**: Optimized for US and India user bases

## 📋 Prerequisites

### 1. Install Required Tools
```bash
# Install Terraform
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform

# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### 2. Setup GCP Project
```bash
# Create new GCP project
gcloud projects create your-codaloo-project-id

# Set billing account (required for compute resources)
gcloud billing projects link your-codaloo-project-id --billing-account=YOUR-BILLING-ACCOUNT-ID

# Set default project
gcloud config set project your-codaloo-project-id

# Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable dns.googleapis.com
gcloud services enable iap.googleapis.com
```

### 3. Setup Authentication
```bash
# Create service account for Terraform
gcloud iam service-accounts create terraform-sa --display-name="Terraform Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding your-codaloo-project-id \
    --member="serviceAccount:terraform-sa@your-codaloo-project-id.iam.gserviceaccount.com" \
    --role="roles/editor"

# Create and download key
gcloud iam service-accounts keys create ~/terraform-key.json \
    --iam-account=terraform-sa@your-codaloo-project-id.iam.gserviceaccount.com

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS=~/terraform-key.json
```

## 🚀 Deployment Guide

### Phase 1: Deploy Staging Environment

1. **Navigate to staging directory**
```bash
cd terraform/staging
```

2. **Configure variables**
```bash
# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vim terraform.tfvars
```

Required values:
```hcl
project_id    = "your-codaloo-project-id"
support_email = "your-email@youmeyou.ai"
iap_users = [
  "user:your-email@youmeyou.ai"
]
```

3. **Deploy staging infrastructure**
```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply changes
terraform apply
```

4. **Access staging environment**
```bash
# Get SSH command from output
terraform output ssh_command

# Create IAP tunnel for web access
terraform output iap_tunnel_command

# Create IAP tunnel for Portainer
terraform output portainer_tunnel_command
```

### Phase 2: Deploy Production Environment

1. **Navigate to production directory**
```bash
cd terraform/production
```

2. **Configure variables**
```bash
# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vim terraform.tfvars
```

Required values:
```hcl
project_id   = "your-codaloo-project-id"
domain_name  = "youmeyou.ai"
vm_count     = 2
create_dns_zone = true
```

3. **Deploy production infrastructure**
```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply changes
terraform apply
```

4. **Configure DNS (if using external DNS)**
```bash
# Get load balancer IP
terraform output load_balancer_ip

# Get name servers (if using GCP DNS)
terraform output dns_zone_name_servers
```

## 🔧 Post-Deployment Setup

### Staging Environment Setup

1. **Connect to staging VM**
```bash
# Use IAP tunnel
gcloud compute ssh codaloo-staging-vm --zone=us-central1-a --tunnel-through-iap
```

2. **Deploy Codaloo application**
```bash
# Clone your repository
cd /opt/codaloo-data
git clone https://github.com/your-username/codaloo-app.git

# Setup environment
cp .env.staging codaloo-app/.env

# Start services
cd codaloo-app
docker-compose up -d
```

3. **Access applications**
```bash
# Create tunnels (run from local machine)
gcloud compute start-iap-tunnel codaloo-staging-vm 3000 --local-host-port=localhost:3000 --zone=us-central1-a
gcloud compute start-iap-tunnel codaloo-staging-vm 9000 --local-host-port=localhost:9000 --zone=us-central1-a
```

### Production Environment Setup

1. **Connect to production VMs**
```bash
# Connect to first VM
gcloud compute ssh codaloo-prod-vm-1 --zone=us-central1-a

# Connect to second VM
gcloud compute ssh codaloo-prod-vm-2 --zone=us-central1-a
```

2. **Setup Docker Swarm cluster**
```bash
# On VM-1 (manager node)
sudo cat /opt/codaloo-data/.swarm-manager-token

# On VM-2 (worker node) - use the token from VM-1
docker swarm join --token SWMTKN-1-... <VM-1-IP>:2377
```

3. **Deploy Codaloo application**
```bash
# On manager node (VM-1)
cd /opt/codaloo-data
git clone https://github.com/your-username/codaloo-app.git

# Setup environment
cp .env.production codaloo-app/.env

# Deploy as Docker Stack
cd codaloo-app
docker stack deploy -c docker-compose.production.yml codaloo
```

## 📊 Cost Breakdown (INR)

### Staging Environment (Monthly)
```
VM (e2-standard-4):           ₹10,080
Persistent Disk (100GB SSD): ₹1,428
Network/DNS:                  ₹420
Total:                        ₹11,928
```

### Production Environment (Monthly)
```
VMs (2 × e2-standard-4):      ₹20,160
Load Balancer:                ₹1,512
Persistent Disks (2 × 100GB): ₹2,856
Network/DNS:                  ₹840
SSL Certificate:              Free
Total:                        ₹25,368
```

### Annual Costs
- **Staging**: ₹1,43,136 (~$1,704)
- **Production**: ₹3,04,416 (~$3,624)
- **Combined**: ₹4,47,552 (~$5,328)

## 🔒 Security Features

### Staging
- Private network (no external IP)
- Identity-Aware Proxy (IAP) access
- Firewall rules for internal communication
- Service account with minimal permissions

### Production
- Enhanced firewall configuration
- Fail2ban for intrusion prevention
- SSL/TLS encryption
- Regular security updates
- Monitoring and alerting

## 📈 Monitoring & Maintenance

### Built-in Monitoring
- Google Cloud Monitoring
- Node Exporter (Prometheus metrics)
- Application health checks
- Load balancer monitoring

### Backup Strategy
- Automated daily backups
- 30-day retention policy
- Database and application data backup
- Easy restore procedures

### Maintenance Commands
```bash
# Check system status
docker ps
docker node ls  # Production only

# View logs
tail -f /var/log/codaloo-setup.log

# Run backup
/opt/codaloo-data/backup.sh

# Update applications
cd /opt/codaloo-data/codaloo-app
git pull
docker-compose up -d --build  # Staging
docker stack deploy -c docker-compose.production.yml codaloo  # Production
```

## 🆘 Troubleshooting

### Common Issues

1. **IAP Access Denied**
```bash
# Check IAP users configuration
gcloud compute instances describe codaloo-staging-vm --zone=us-central1-a
```

2. **SSL Certificate Issues**
```bash
# Check certificate status
gcloud compute ssl-certificates describe codaloo-ssl-cert
```

3. **Load Balancer Health Checks Failing**
```bash
# Check health check configuration
gcloud compute health-checks describe codaloo-web-health-check
```

### Support Resources
- [GCP Documentation](https://cloud.google.com/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Docker Swarm Documentation](https://docs.docker.com/engine/swarm/)

## 🔄 Scaling & Upgrades

### Horizontal Scaling
```bash
# Increase VM count in production
# Edit terraform.tfvars
vm_count = 3

# Apply changes
terraform apply
```

### Vertical Scaling
```bash
# Upgrade machine type
# Edit terraform.tfvars
vm_machine_type = "e2-standard-8"

# Apply changes
terraform apply
```

### Zero-Downtime Deployments
Production environment supports rolling updates through Docker Swarm, ensuring zero downtime during application updates.

---

**Ready to deploy Codaloo on GCP! 🚀**

For questions or support, please refer to the troubleshooting section or create an issue in the repository. 