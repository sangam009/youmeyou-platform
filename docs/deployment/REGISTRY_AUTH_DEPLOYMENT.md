# YouMeYou Registry Authentication & Deployment Guide

## 🎯 Problem & Solution

**Issue**: Portainer cannot pull images from private registry due to missing authentication
**Error**: `no basic auth credentials`
**Solution**: Configure registry authentication in Portainer

## 📋 Registry Details

- **Registry URL**: `http://localhost:5000` (internal to VM)
- **Registry UI**: `http://34.93.209.77:5001` (external access)
- **Username**: `youmeyou`
- **Password**: `staging2024!`

## 🚀 Step-by-Step Fix

### Step 1: Verify Registry is Running

SSH to VM and check:
```bash
ssh ubuntu@34.93.209.77
curl http://localhost:5000/v2/
# Should return: {}
```

### Step 2: Check Available Images

Visit Registry UI: `http://34.93.209.77:5001`
- Should show: `youmeyou/auth-service`, `youmeyou/design-service`, `youmeyou/payment-service`

### Step 3: Configure Portainer Registry Authentication

1. **Open Portainer**: `http://34.93.209.77:9000`

2. **Add Private Registry**:
   - Left sidebar → **Registries**
   - Click **"+ Add registry"**
   - Select **"Custom registry"**

3. **Registry Configuration**:
   ```
   Name: YouMeYou Registry
   Registry URL: http://localhost:5000
   Username: youmeyou
   Password: staging2024!
   ```

4. **Test & Save**:
   - Click **"Test connection"** → Should show ✅ Success
   - Click **"Add registry"**

### Step 4: Alternative Docker Login Method

If Portainer registry setup fails, SSH to VM:
```bash
ssh ubuntu@34.93.209.77
echo 'staging2024!' | docker login localhost:5000 -u youmeyou --password-stdin
```

### Step 5: Deploy Stacks in Order

Once registry authentication is working:

1. **youmeyou-auth** → Upload `1-auth-microservice.yml`
2. **youmeyou-design** → Upload `2-design-microservice.yml`  
3. **youmeyou-payment** → Upload `3-payment-microservice.yml`
4. **youmeyou-gateway** → Upload `4-gateway-service.yml`

## 🔧 Troubleshooting

### Issue: Registry Connection Failed
**Solution**: Ensure registry is running
```bash
ssh ubuntu@34.93.209.77
docker ps | grep registry
# If not running: docker start youmeyou-registry
```

### Issue: Images Not Found
**Solution**: Rebuild and push images
```bash
ssh ubuntu@34.93.209.77
./build-all-services.sh YOUR_GITHUB_TOKEN
```

### Issue: Auth Service Redis Connection Failed
**Fixed**: Redis healthcheck now uses password authentication
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "-a", "auth_redis_2024!", "ping"]
```

## 🎉 Expected Results

After successful deployment:
- **Auth Service**: `http://34.93.209.77:3001/health` (server-level only)
- **Design Service**: `http://34.93.209.77:4000/health` (server-level only)
- **Payment Service**: `http://34.93.209.77:6000/health` (server-level only)
- **Gateway**: `http://34.93.209.77/api/auth/health` (public access)

## 🔒 Security Notes

- **Microservice ports** (3001, 4000, 6000) are exposed at server level for debugging
- **Firewall rules** block these ports from public internet access
- **Only gateway ports** (80, 443) are publicly accessible
- **Registry** is secured with username/password authentication

## 📞 Quick Fix Commands

```bash
# Check registry status
curl -s http://34.93.209.77:5001/v2/_catalog

# Test registry auth
curl -u youmeyou:staging2024! http://localhost:5000/v2/_catalog

# Login to registry from VM
echo 'staging2024!' | docker login localhost:5000 -u youmeyou --password-stdin

# Restart registry if needed
docker restart youmeyou-registry
``` 