# YouMeYou Infrastructure

Infrastructure as Code for YouMeYou platform deployment.

## 🏗️ Components

### Terraform
- **Staging**: Mumbai, India (asia-south1)
- **Production**: US + India multi-region (planned)
- **Features**: Auto-scheduling, cost optimization, SSL

### Docker
- Multi-service orchestration
- Health checks
- Auto-restart policies
- Volume management

### Portainer
- Container management UI
- Stack deployment
- Resource monitoring
- Log aggregation

## 🚀 Deployment

### Staging Environment
```bash
cd terraform/staging
terraform apply
./deploy-to-staging.sh
```

### Production Environment
```bash
cd terraform/production
terraform apply
```

## 💰 Cost Optimization

- **VM Scheduling**: Auto-shutdown during off-hours
- **Resource Sizing**: Right-sized for workload
- **Storage**: Optimized disk allocation
- **Network**: Regional deployment

**Monthly Cost**: ~₹3,500 ($42) with scheduling
