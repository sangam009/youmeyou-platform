# Codaloo Production Deployment with Portainer

## 📋 Overview

This directory contains all necessary files to deploy Codaloo on `youmeyou.ai` using **Portainer Community Edition** for container management. Each service is deployed as a separate stack for maximum scalability and management flexibility.

## 🏗️ Architecture

### Individual Stacks:
- **Database Layer**: Separate MySQL instances for each service + MongoDB + Redis
- **Service Layer**: Auth, Design, Payment services
- **Frontend Layer**: Next.js web application
- **Management Layer**: Portainer CE for container management
- **Monitoring Layer**: Grafana + Prometheus (optional)

### Domain Structure:
- `youmeyou.ai` - Main web application
- `auth.youmeyou.ai` - Authentication API
- `design.youmeyou.ai` - Design service API
- `payment.youmeyou.ai` - Payment service API
- `portainer.youmeyou.ai:9000` - Portainer management interface
- `metrics.youmeyou.ai:3001` - Grafana dashboard (optional)

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Domain `youmeyou.ai` pointing to your server
- SSL certificates (Let's Encrypt recommended)
- Server with at least 8GB RAM and 4 CPU cores

### 1. Clone and Setup
```bash
cd portainer-stacks
chmod +x deploy.sh
```

### 2. Configure Environment
Edit `production.env` with your actual values:
```bash
cp production.env production.env.local
nano production.env.local
```

**Important**: Replace all placeholder values with real credentials!

### 3. Deploy
```bash
./deploy.sh
```

The script will:
1. Create Docker network
2. Deploy Portainer CE
3. Deploy all database stacks
4. Deploy all service stacks
5. Deploy web application
6. Optionally deploy monitoring

## 📦 Individual Stack Deployment

You can also deploy stacks individually using Portainer UI:

### Database Stacks (Deploy First):
1. **Auth MySQL**: `auth-mysql.yml`
2. **Design MySQL**: `design-mysql.yml`
3. **Payment MySQL**: `payment-mysql.yml`
4. **MongoDB**: `mongodb.yml`
5. **Redis**: `redis.yml`

### Service Stacks:
1. **Auth Service**: `auth-service.yml`
2. **Design Service**: `design-service.yml`
3. **Payment Service**: `payment-service.yml`

### Frontend Stack:
1. **Web Application**: `web-app.yml`

### Management & Monitoring:
1. **Portainer**: `portainer.yml`
2. **Monitoring**: `monitoring.yml` (optional)

## 🔧 Portainer Management

### Access Portainer:
1. Open `http://your-server-ip:9000`
2. Create admin account
3. Connect to local Docker environment

### Managing Stacks:
1. Go to **Stacks** section
2. Click **Add Stack**
3. Choose **Upload** method
4. Upload the `.yml` file
5. Set environment variables
6. Deploy

### Scaling Services:
1. Go to **Containers** section
2. Select service container
3. Click **Duplicate/Edit**
4. Modify replicas count
5. Redeploy

## 🔒 Security Configuration

### Firewall Rules:
```bash
# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow Portainer
ufw allow 9000/tcp

# Allow service ports (internal network only)
ufw allow from 172.16.0.0/12 to any port 3001  # Auth
ufw allow from 172.16.0.0/12 to any port 4000  # Design
ufw allow from 172.16.0.0/12 to any port 5000  # Payment
```

### SSL Certificates:
```bash
# Using Certbot (Let's Encrypt)
sudo apt install certbot
sudo certbot certonly --standalone -d youmeyou.ai
sudo certbot certonly --standalone -d auth.youmeyou.ai
sudo certbot certonly --standalone -d design.youmeyou.ai
sudo certbot certonly --standalone -d payment.youmeyou.ai
```

## 📊 Monitoring & Health Checks

### Built-in Health Checks:
- All services include Docker health checks
- Automatic restart on failure
- Status monitoring via Portainer

### Optional Monitoring Stack:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboard
- **Node Exporter**: System metrics

### Key Metrics to Monitor:
- Container CPU/Memory usage
- Database connections
- API response times
- Error rates
- Disk usage

## 🔄 Scaling & Load Balancing

### Horizontal Scaling:
Each service can be scaled independently:

```yaml
deploy:
  replicas: 3  # Scale to 3 instances
```

### Database Scaling:
- **MySQL**: Use read replicas for design/auth services
- **MongoDB**: Configure replica set for high availability
- **Redis**: Use Redis Cluster for distributed caching

### Load Balancing:
- Use Nginx or HAProxy for load balancing
- Configure health checks for backend services
- Consider using Docker Swarm mode for advanced orchestration

## 🛠️ Maintenance

### Backup Strategy:
```bash
# Database backups
docker exec auth-mysql-prod mysqldump -u root -p codaloo_auth > auth_backup.sql
docker exec design-mysql-prod mysqldump -u root -p codaloo_design > design_backup.sql
docker exec payment-mysql-prod mysqldump -u root -p codaloo_payments > payment_backup.sql

# MongoDB backup
docker exec design-mongodb-prod mongodump --out /backup

# Volume backups
docker run --rm -v auth_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/auth_mysql_backup.tar.gz -C /data .
```

### Updates:
1. Build new Docker images with version tags
2. Update `VERSION` in `production.env`
3. Use Portainer to update stacks with new images
4. Rolling updates ensure zero downtime

### Log Management:
```bash
# View logs via Portainer UI or Docker commands
docker logs auth-service-prod
docker logs design-service-prod
docker logs payment-service-prod
```

## 🚨 Troubleshooting

### Common Issues:

1. **Port Conflicts**:
   - Check if ports are already in use
   - Modify port mappings in environment file

2. **Database Connection Issues**:
   - Verify database containers are running
   - Check network connectivity
   - Validate credentials

3. **Service Discovery**:
   - Ensure all services are on the same network
   - Use container names for internal communication

4. **Memory Issues**:
   - Monitor resource usage in Portainer
   - Adjust resource limits in compose files

### Debug Commands:
```bash
# Check network connectivity
docker exec auth-service-prod ping design-mysql-prod

# Inspect container
docker inspect auth-service-prod

# Check logs
docker logs --tail 100 auth-service-prod
```

## 📞 Support

For deployment issues:
1. Check container logs in Portainer
2. Verify environment variables
3. Ensure all dependencies are running
4. Check network connectivity between services

## 🎯 Production Checklist

- [ ] All environment variables configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring stack deployed
- [ ] Health checks verified
- [ ] DNS records configured
- [ ] Load balancing configured (if needed)
- [ ] Log rotation configured
- [ ] Security hardening completed

---

**Happy Deploying! 🚀** 