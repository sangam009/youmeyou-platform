# YouMeYou Platform - Microservices Deployment Sequence

## Architecture Overview

Each microservice has its own dedicated resources:
- **Auth Microservice**: auth-mysql, auth-redis, auth-service (API on port 3001)
- **Design Microservice**: design-mongodb, design-redis, design-service (API on port 4000)  
- **Payment Microservice**: payment-mysql, payment-redis, payment-service (API on port 6000)
- **Gateway Service**: nginx-gateway (routes traffic on ports 80/443)

## Network Architecture

- **youmeyou-data**: Internal network for databases (NOT publicly accessible)
- **youmeyou-internal**: Internal network for service-to-service communication
- **youmeyou-public**: External network for gateway access

## Port Allocation

- **Port 3001**: Auth Service API
- **Port 4000**: Design Service API
- **Port 5000**: Docker Registry (internal)
- **Port 5001**: Registry UI
- **Port 6000**: Payment Service API (changed from 5000 to avoid registry conflict)
- **Port 9000**: Portainer UI

## Security Architecture

### 🔒 Two-Layer Security Model

**Layer 1: Docker Port Exposure (Server Level)**
- Services expose ports within the VM: `3001`, `4000`, `6000`
- These ports are accessible for debugging and inter-service communication
- Databases remain on internal Docker networks only

**Layer 2: Firewall Rules (Public Access)**
- Only gateway ports `80`, `443` are open to internet
- Microservice ports `3001`, `4000`, `6000` are **blocked** from public access
- Admin ports `9000` (Portainer), `5000`/`5001` (Registry) for management

### 🎯 Access Flow
```
Internet → Firewall (80/443) → Nginx Gateway → Internal Services (3001/4000/6000)
```

## Deployment Sequence

### Step 1: Verify Prerequisites
✅ Portainer accessible at: http://34.93.209.77:9000
✅ Private registry running at: localhost:5000 (with registry UI at localhost:5001)
✅ Networks created: youmeyou-public, youmeyou-internal, youmeyou-data
✅ Built images available:
- localhost:5000/youmeyou/auth-service:latest
- localhost:5000/youmeyou/design-service:latest  
- localhost:5000/youmeyou/payment-service:latest

### Step 2: Deploy Microservices (in order)

1. **Deploy Auth Microservice**
   - Stack name: `youmeyou-auth`
   - File: `1-auth-microservice.yml`
   - Creates: auth-mysql, auth-redis, auth-service
   - Public access: http://34.93.209.77:3001

2. **Deploy Design Microservice**
   - Stack name: `youmeyou-design`
   - File: `2-design-microservice.yml`
   - Creates: design-mongodb, design-redis, design-service
   - Public access: http://34.93.209.77:4000

3. **Deploy Payment Microservice**
   - Stack name: `youmeyou-payment`
   - File: `3-payment-microservice.yml`
   - Creates: payment-mysql, payment-redis, payment-service
   - Public access: http://34.93.209.77:6000

4. **Deploy Gateway Service**
   - Stack name: `youmeyou-gateway`
   - File: `4-gateway-service.yml`
   - Creates: nginx-gateway
   - Public access: http://34.93.209.77 (routes to all services)

### Step 3: API Access Points

After deployment, APIs will be accessible via:

**Direct Access (for testing):**
- Auth API: http://34.93.209.77:3001
- Design API: http://34.93.209.77:4000
- Payment API: http://34.93.209.77:6000

**Gateway Access (production):**
- Auth API: http://34.93.209.77/api/auth/
- Design API: http://34.93.209.77/api/design/
- Payment API: http://34.93.209.77/api/payment/

**Health Checks:**
- Auth Health: http://34.93.209.77/health/auth
- Design Health: http://34.93.209.77/health/design
- Payment Health: http://34.93.209.77/health/payment

### Step 4: Security Notes

🔒 **Internal Resources (NOT publicly accessible):**
- auth-mysql, auth-redis
- design-mongodb, design-redis
- payment-mysql, payment-redis

🌐 **Public Resources:**
- API endpoints only (ports 3001, 4000, 6000)
- Gateway (ports 80, 443)

### Step 5: Update Process

To update services:
1. Rebuild image: `./build-single-service.sh <token> <service>`
2. Update stack in Portainer (will pull latest image)
3. Or restart specific service container

## DNS Configuration (Future)

When domain is ready:
- Update nginx config server_name to include actual domain
- Add SSL certificates to ssl-certs directory
- Update CORS_ORIGIN in all services

## Monitoring

- Portainer: http://34.93.209.77:9000
- Registry UI: http://34.93.209.77:5001
- Gateway Status: http://34.93.209.77/ 