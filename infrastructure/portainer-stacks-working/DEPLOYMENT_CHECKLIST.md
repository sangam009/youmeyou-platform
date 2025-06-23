# 🚀 Portainer Deployment Checklist

## **Access Portainer**
- URL: http://34.93.209.77:9000
- Login with your credentials

## **Deployment Order (CRITICAL - Follow Exactly)**

### **Phase 1: Infrastructure** ⚡
**Deploy these FIRST (in any order):**

#### 1.1 Networks
- **Stack Name**: `youmeyou-network`
- **File**: Copy content from `network.yml`
- **Status**: ⬜ Deployed ⬜ Running

#### 1.2 Gateway  
- **Stack Name**: `youmeyou-gateway`
- **File**: Copy content from `gateway.yml`
- **Status**: ⬜ Deployed ⬜ Running
- **Test**: `curl -I http://staging.youmeyou.ai/health` should return 200

---

### **Phase 2: Auth Service Stack** 🔐
**Deploy these in ORDER (wait for each to be running):**

#### 2.1 Auth MySQL Database
- **Stack Name**: `youmeyou-auth-mysql`
- **File**: Copy content from `auth-mysql.yml`
- **Status**: ⬜ Deployed ⬜ Running
- **Test**: Check container logs for "ready for connections"

#### 2.2 Auth Redis Cache
- **Stack Name**: `youmeyou-auth-redis`
- **File**: Copy content from `auth-redis.yml`
- **Status**: ⬜ Deployed ⬜ Running
- **Test**: Check container logs for "Ready to accept connections"

#### 2.3 Auth Service
- **Stack Name**: `youmeyou-auth-service`
- **File**: Copy content from `auth-service.yml`
- **Status**: ⬜ Deployed ⬜ Running
- **Test**: `curl -I http://staging.youmeyou.ai/api/auth/health` should return 200

---

## **Testing After Each Phase**

### **After Phase 1:**
```bash
# Test gateway health
curl -I http://staging.youmeyou.ai/health
# Should return: HTTP/1.1 200 OK
```

### **After Phase 2:**
```bash
# Test auth service
curl -I http://staging.youmeyou.ai/api/auth/health
# Should return: HTTP/1.1 200 OK

# Test internal DNS
docker exec -it auth-service-prod nslookup auth-mysql
docker exec -it auth-service-prod nslookup auth-redis
```

---

## **How to Deploy Each Stack in Portainer**

1. **Go to Stacks** → **Add Stack**
2. **Enter Stack Name** (exactly as listed above)
3. **Paste YAML Content** from the corresponding `.yml` file
4. **Click Deploy**
5. **Wait for Status = Running** before proceeding to next stack
6. **Check Logs** if any issues

---

## **Troubleshooting**

### **If Stack Fails to Deploy:**
1. Check the **Logs** tab in Portainer
2. Verify **network dependencies** are running
3. Check **container resource limits**
4. Restart the stack if needed

### **If Service Can't Connect:**
```bash
# Check if containers are on same network
docker network ls
docker network inspect youmeyou-data

# Test DNS resolution
docker exec -it <container-name> nslookup <target-service>
```

---

## **Success Criteria**
- ✅ All stacks show "Running" status
- ✅ Gateway health check returns 200
- ✅ Auth service health check returns 200
- ✅ Internal DNS resolution works
- ✅ No error logs in containers 

# YouMeYou Platform - Deployment Checklist

## 🚀 Registry-Based Deployment Steps

### ✅ Step 1: Local Changes (COMPLETED)
- [x] Updated all services to use `registry-staging.youmeyou.ai`
- [x] Fixed CORS issues in auth and design services
- [x] Implemented environment-aware frontend configuration
- [x] Fixed container health checks
- [x] Created deployment documentation and scripts
- [x] Committed and pushed changes to GitHub

### 📋 Step 2: VM Deployment (EXECUTE ON VM)

#### SSH to VM
```bash
ssh user@staging.youmeyou.ai
```

#### Navigate to Project Directory
```bash
cd /path/to/youmeyou-platform
# OR wherever your project is located
cd /opt/youmeyou-platform
```

#### Pull Latest Changes
```bash
git pull origin main
```

#### Run Deployment Script
```bash
./infrastructure/portainer-stacks-working/deploy-with-registry-dns.sh <your_github_token>
```

### 📋 Step 3: Portainer Deployment

#### Access Portainer
- URL: https://staging.youmeyou.ai:9443
- Login with your credentials

#### Update Stacks (in order)
1. **1-auth-microservice**
   - Select stack → "Update the stack" → Deploy
   - Wait for healthy status

2. **2-design-microservice**
   - Select stack → "Update the stack" → Deploy
   - Wait for healthy status

3. **3-payment-microservice** (if available)
   - Select stack → "Update the stack" → Deploy
   - Wait for healthy status

4. **5-codaloo-web**
   - Select stack → "Update the stack" → Deploy
   - Wait for healthy status

### 🔍 Step 4: Verification

#### Health Checks
```bash
# Test auth service
curl https://staging.youmeyou.ai/api/auth/health

# Test design service
curl https://staging.youmeyou.ai/api/design/health

# Test web application
curl https://staging.youmeyou.ai/

# Test payment service (if available)
curl https://staging.youmeyou.ai/api/payment/health
```

#### Frontend Testing
- Visit: https://staging.youmeyou.ai
- Check browser console for CORS errors (should be clean)
- Test login functionality
- Verify SSL certificate shows as secure

#### Registry Verification
```bash
# Check registry contents
curl -u youmeyou:staging2024! https://registry-staging.youmeyou.ai/v2/_catalog

# Check specific service images
curl -u youmeyou:staging2024! https://registry-staging.youmeyou.ai/v2/youmeyou/auth-service/tags/list
```

### 🎯 Expected Results

#### All Services Should Show:
- ✅ Container status: **Healthy**
- ✅ Registry images: **Latest versions**
- ✅ Network connectivity: **Working**
- ✅ Health endpoints: **Responding**

#### Frontend Should Show:
- ✅ HTTPS: **Secure lock icon**
- ✅ Console: **No CORS errors**
- ✅ API calls: **Using /api/* routes**
- ✅ Authentication: **Working**

#### Registry Should Show:
- ✅ Auth service: `registry-staging.youmeyou.ai/youmeyou/auth-service:latest`
- ✅ Design service: `registry-staging.youmeyou.ai/youmeyou/design-service:latest`
- ✅ Payment service: `registry-staging.youmeyou.ai/youmeyou/payment-service:latest`
- ✅ Web application: `registry-staging.youmeyou.ai/youmeyou/codaloo-web:latest`

### 🚨 Troubleshooting

#### If Registry Login Fails:
```bash
# Check DNS resolution
nslookup registry-staging.youmeyou.ai

# Test registry connectivity
curl -I https://registry-staging.youmeyou.ai/v2/

# Check authentication
echo "staging2024!" | docker login registry-staging.youmeyou.ai -u youmeyou --password-stdin
```

#### If Container Build Fails:
```bash
# Check Docker daemon
docker info

# Check disk space
df -h

# Clean Docker cache
docker system prune -a
```

#### If Portainer Deployment Fails:
- Check container logs in Portainer UI
- Verify image availability in registry
- Check network connectivity between services
- Verify environment variables

### 🔄 Rollback Plan

#### If Issues Occur:
1. **Immediate**: Use Portainer to rollback stacks to previous versions
2. **Registry**: Previous image versions available with timestamps
3. **Configuration**: Revert nginx configuration if needed
4. **DNS**: Verify DNS resolution for all domains

---

**Deployment Status**: Ready for execution
**Registry**: registry-staging.youmeyou.ai  
**Platform**: staging.youmeyou.ai
**Documentation**: Complete 