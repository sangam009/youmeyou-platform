# 🌐 YouMeYou DNS-Based Architecture

## **DNS Resolution Flow**

### **External DNS (Real DNS Records)**
```
staging.youmeyou.ai → 34.93.209.77 (VM IP)
```
- This is a **real DNS A record** you need to create in your domain registrar
- Points to your VM's static IP address

### **Internal Docker DNS (Automatic)**
```
Container Network: youmeyou-internal
├── auth-service:3001
├── design-service:4000
├── payment-service:5000
└── web-app:3000

Container Network: youmeyou-data
├── auth-mysql:3306
├── auth-redis:6379
├── design-mysql:3306
├── design-mongodb:27017
├── payment-mysql:3306
└── payment-redis:6379
```

## **🔒 Security Architecture**

### **Public Access (Port 80/443)**
- **ONLY** `gateway` container exposed to internet
- All requests go through NGINX reverse proxy

### **Internal Access (Docker DNS Only)**
- Services communicate via container names
- Example: `auth-service` connects to `auth-mysql:3306`
- No public ports exposed for databases or services

### **Network Segmentation**
1. **youmeyou-public**: Gateway only
2. **youmeyou-internal**: Service-to-service communication
3. **youmeyou-data**: Database layer (most restricted)

## **🚀 Request Flow**

```
User → staging.youmeyou.ai → VM:80 → Gateway Container → Service Container
```

### **Example: Auth API Call**
```
1. User makes request: https://staging.youmeyou.ai/api/auth/login
2. DNS resolves: staging.youmeyou.ai → 34.93.209.77
3. VM routes: Port 80 → Gateway Container
4. NGINX routes: /api/auth/ → auth-service:3001
5. Auth service connects to: auth-mysql:3306 (internal DNS)
```

## **📋 Environment Variables**

### **Auth Service Configuration**
```bash
# Database connection (uses Docker DNS)
DB_HOST=auth-mysql          # NOT auth-mysql.youmeyou.internal
DB_PORT=3306
DB_USER=kafeneo
DB_PASSWORD=kafeneo#009
DB_NAME=admin_backend

# Redis connection (uses Docker DNS)
REDIS_HOST=auth-redis       # NOT auth-redis.youmeyou.internal
REDIS_PORT=6379
REDIS_PASSWORD=auth_redis_password
```

## **🎯 Key Points**

### **What Docker Handles Automatically**
- Container name resolution within networks
- Service discovery via aliases
- Load balancing between container replicas

### **What You Need to Configure**
- External DNS record: `staging.youmeyou.ai → 34.93.209.77`
- NGINX routing rules in gateway
- Environment variables for service connections

### **Why This Works**
- **Docker's built-in DNS** resolves container names to IP addresses
- **Network isolation** prevents external access to internal services
- **Single point of entry** through gateway for security and monitoring

## **🔧 Deployment Order**

1. **Create networks**: `network.yml`
2. **Deploy gateway**: `gateway.yml` 
3. **Deploy databases**: `auth-mysql.yml`, `auth-redis.yml`
4. **Deploy services**: `auth-service.yml`
5. **Test connectivity**: Internal DNS resolution

## **🐛 Troubleshooting**

### **Service Can't Connect to Database**
```bash
# Check if containers are on same network
docker network ls
docker network inspect youmeyou-data

# Test DNS resolution inside container
docker exec -it auth-service-prod nslookup auth-mysql
```

### **External Access Issues**
```bash
# Check if gateway is running and has public ports
docker ps | grep gateway
curl -I http://34.93.209.77/health
```

This architecture ensures **production-grade security** with **internal-only database access** and **DNS-based service discovery**. 