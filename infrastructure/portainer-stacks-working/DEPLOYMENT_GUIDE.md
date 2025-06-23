# YouMeYou Private Registry Deployment Guide

## 🎯 Overview
This guide covers setting up a private Docker registry on your VM and building all services from Git for deployment.

## 📋 Prerequisites
- VM running with Docker installed
- Git installed on VM
- Portainer running and accessible
- Networks created: `youmeyou-data`, `youmeyou-internal`, `youmeyou-public`

## 🚀 Step-by-Step Deployment

### Phase 1: Set Up Private Registry

1. **SSH into your VM:**
   ```bash
   ssh ubuntu@34.93.209.77
   ```

2. **Copy and run registry setup script:**
   ```bash
   # Copy the setup script to VM
   curl -o setup-registry-direct.sh https://raw.githubusercontent.com/your-repo/setup-registry-direct.sh
   chmod +x setup-registry-direct.sh
   ./setup-registry-direct.sh
   ```

3. **Verify registry is running:**
   ```bash
   curl http://localhost:5000/v2/
   # Should return: {}
   ```

4. **Access Registry UI:**
   - Open browser: `http://34.93.209.77:5001`
   - Should show empty registry interface

### Phase 2: Build All Services

1. **Copy build scripts to VM:**
   ```bash
   # Copy all build scripts
   curl -o build-all-services.sh https://raw.githubusercontent.com/your-repo/build-all-services.sh
   curl -o build-single-service.sh https://raw.githubusercontent.com/your-repo/build-single-service.sh
   chmod +x build-all-services.sh build-single-service.sh
   ```

2. **Build all services at once:**
   ```bash
   ./build-all-services.sh
   ```

   **OR build individual services:**
   ```bash
   ./build-single-service.sh auth
   ./build-single-service.sh design
   ./build-single-service.sh payment
   ./build-single-service.sh web
   ```

3. **Verify images in registry:**
   - Check Registry UI: `http://34.93.209.77:5001`
   - Should see all built images

### Phase 3: Deploy Database Services

Deploy these stacks in Portainer (in order):

1. **auth-mysql** - MySQL database for auth service
2. **auth-redis** - Redis cache for auth service
3. **design-mysql** - MySQL database for design service
4. **design-redis** - Redis cache for design service
5. **mongodb** - MongoDB for design service
6. **payment-mysql** - MySQL database for payment service
7. **payment-redis** - Redis cache for payment service

### Phase 4: Deploy Application Services

Deploy these stacks in Portainer:

1. **auth-service** - Use `auth-service-from-registry.yml`
2. **design-service** - Use registry image
3. **payment-service** - Use registry image
4. **web-app** - Use registry image

### Phase 5: Deploy Gateway

1. **gateway** - NGINX reverse proxy for external access

## 🔧 Registry Configuration

- **Registry URL:** `http://34.93.209.77:5000`
- **Registry UI:** `http://34.93.209.77:5001`
- **Username:** `youmeyou`
- **Password:** `staging2024!`

## 📦 Built Images

After running build scripts, you'll have:

- `localhost:5000/youmeyou/auth-service:latest`
- `localhost:5000/youmeyou/design-service:latest`
- `localhost:5000/youmeyou/payment-service:latest`
- `localhost:5000/youmeyou/web-app:latest`

## 🔄 Update Workflow

When you make code changes:

1. **Update specific service:**
   ```bash
   ./build-single-service.sh auth
   ```

2. **Redeploy in Portainer:**
   - Go to the stack in Portainer
   - Click "Update the stack"
   - Docker will pull the new `:latest` image

## 🧪 Testing

After deployment, test the services:

```bash
# Test auth service health
curl http://34.93.209.77/api/auth/health

# Test design service health
curl http://34.93.209.77/api/design/health

# Test web application
curl http://34.93.209.77/
```

## 🚨 Troubleshooting

### Registry Issues
```bash
# Check registry container
docker ps | grep registry

# Check registry logs
docker logs youmeyou-registry

# Restart registry
docker restart youmeyou-registry
```

### Build Issues
```bash
# Check Docker space
docker system df

# Clean up old images
docker system prune -a

# Manual build test
cd /tmp && git clone https://github.com/seemantshukla/arch_tool.git
cd arch_tool/authmicroservice/backend
docker build -t test-auth .
```

### Deployment Issues
```bash
# Check networks exist
docker network ls | grep youmeyou

# Check if image exists in registry
curl http://localhost:5000/v2/youmeyou/auth-service/tags/list
```

## 📈 Benefits of This Approach

1. **Self-Contained:** No external dependencies
2. **Fast Deployments:** Local registry = fast pulls
3. **Version Control:** Tagged images with timestamps
4. **Cost Effective:** No registry fees
5. **Secure:** Private registry on your infrastructure
6. **Scalable:** Easy to add more services and VMs

## 🎉 Success Criteria

✅ Registry running and accessible  
✅ All services built and pushed to registry  
✅ Database services deployed and running  
✅ Application services deployed and healthy  
✅ Gateway routing traffic correctly  
✅ Web application accessible via domain 