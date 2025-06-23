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