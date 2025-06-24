# YouMeYou Platform - Complete Deployment Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Lessons Learned](#lessons-learned)
3. [Current Issues & Solutions](#current-issues--solutions)
4. [Development Deployment](#development-deployment)
5. [Production Deployment Steps](#production-deployment-steps)
6. [Network Architecture Improvements](#network-architecture-improvements)
7. [Troubleshooting Guide](#troubleshooting-guide)

## Architecture Overview

### Current Stack
- **Frontend**: Next.js 15 + TypeScript (port 3000)
- **Auth Service**: Node.js + MySQL + Redis (port 3001)
- **Design Service**: Node.js + MongoDB + Redis (port 4000)
- **Payment Service**: Node.js + MySQL + Redis (port 6000)
- **Gateway**: Nginx reverse proxy (ports 80/443)
- **Registry**: Private Docker registry (port 5000)
- **Infrastructure**: Docker containers on GCP VM, Custom VPC

### Network Topology
```
Internet → GCP Firewall → Nginx Gateway (Host Network) → Internal Services (Docker Networks)
```

## Lessons Learned

### 1. Critical SSL Certificate Issue
**Problem**: Certificate mismatch causing "Not Secure" warnings
**Root Cause**: Nginx using wrong certificate for domain
**Solution**: 
- Separate certificates for each domain (`youmeyou.ai`, `staging.youmeyou.ai`)
- Correct nginx server block configuration
- Proper certificate mounting in containers

### 2. Network Architecture Complexity
**Problem**: Services on different networks causing communication issues
**Current Setup**:
- Nginx: Host network (`--network host`)
- Services: Custom Docker networks (`youmeyou-internal`, `youmeyou-data`)
- **Issue**: Cross-network communication requires VM internal IPs (hardcoded)

### 3. Firewall Configuration Critical Error
**Problem**: Firewall rules in wrong VPC network
**Root Cause**: VM on `youmeyou-staging-vpc` but rules created in `default` network
**Solution**: Create firewall rules in correct VPC network

### 4. CORS and Hardcoded URLs Issue
**Current Problem**: Frontend hardcoded with `localhost:3001` URLs
**Impact**: CORS errors, mixed content warnings
**Need**: Environment-aware configuration with proper service discovery

## Current Issues & Solutions

### Issue 1: Hardcoded Service URLs ❌
**Current Code**:
```typescript
// web/src/config/index.ts - PROBLEMATIC
auth: {
  serviceUrl: (() => {
    if (isProduction) return "/api/auth";
    return "http://localhost:3001"; // HARDCODED
  })()
}
```

**Problems**:
- Hardcoded localhost URLs
- Not scalable
- Causes CORS errors
- Mixed content issues

### Issue 2: Network Architecture Inefficiency ❌
**Current Setup**:
- Nginx on host network
- Services on Docker networks
- Communication via VM internal IPs (10.0.1.2)
- Hardcoded IP addresses in nginx config

## Development Deployment

### Prerequisites
1. **GCP VM** with custom VPC (`youmeyou-staging-vpc`)
2. **Docker** and **Docker Compose**
3. **SSL Certificates** for domains
4. **Private Docker Registry**

### Current Working Configuration

#### Firewall Rules (youmeyou-staging-vpc)
```bash
# Web access (your IP only)
gcloud compute firewall-rules create youmeyou-staging-web-access-vpc \
    --network youmeyou-staging-vpc \
    --allow tcp:80,tcp:443,tcp:3000,tcp:4000,tcp:6000 \
    --source-ranges YOUR_IP/32 \
    --target-tags youmeyou-staging

# Management access
gcloud compute firewall-rules create youmeyou-staging-allow-portainer \
    --network youmeyou-staging-vpc \
    --allow tcp:9000,tcp:9443 \
    --source-ranges YOUR_IP/32 \
    --target-tags youmeyou-staging
```

#### SSL Configuration
```nginx
# Separate server blocks for each domain
server {
    listen 443 ssl;
    server_name youmeyou.ai;
    ssl_certificate /etc/ssl/certs/youmeyou.ai-fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/youmeyou.ai-privkey.pem;
    # ... rest of config
}

server {
    listen 443 ssl;
    server_name staging.youmeyou.ai;
    ssl_certificate /etc/ssl/certs/staging.youmeyou.ai-fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/staging.youmeyou.ai-privkey.pem;
    # ... rest of config
}
```

### Deployment Sequence
1. **Build and Push Images**
2. **Deploy Infrastructure Services** (MySQL, Redis, MongoDB)
3. **Deploy Microservices** (Auth → Design → Payment)
4. **Deploy Gateway** (Nginx)
5. **Deploy Frontend** (Web Application)

## Production Deployment Steps

### Phase 1: Infrastructure Preparation
1. **Create Production VPC**
```bash
gcloud compute networks create youmeyou-prod-vpc --subnet-mode custom
gcloud compute networks subnets create youmeyou-prod-subnet \
    --network youmeyou-prod-vpc \
    --range 10.0.0.0/24 \
    --region asia-south1
```

2. **Setup Load Balancer** (for high availability)
3. **Configure Auto-scaling** groups
4. **Setup Monitoring** (Prometheus + Grafana)

### Phase 2: Security Hardening
1. **Remove IP restrictions** from firewall
2. **Implement rate limiting**
3. **Setup WAF** (Web Application Firewall)
4. **Configure secrets management**

### Phase 3: Service Deployment
1. **Deploy to Kubernetes** (recommended for production)
2. **Implement service mesh** (Istio/Linkerd)
3. **Setup CI/CD pipeline**
4. **Configure backup strategies**

## Network Architecture Improvements

### Current Issues
1. **Hardcoded IPs**: Nginx config uses `10.0.1.2` (VM internal IP)
2. **Mixed Networks**: Services can't communicate via service names
3. **Not Scalable**: Manual IP management

### Recommended Solutions

#### Option 1: Shared Docker Network (Immediate Fix)
```bash
# Create shared network
docker network create youmeyou-shared --driver bridge

# Run all services on shared network
docker run --network youmeyou-shared --name auth-service ...
docker run --network youmeyou-shared --name nginx-gateway ...
```

**Benefits**:
- Service name resolution works
- No hardcoded IPs
- Easy to implement

#### Option 2: Docker Compose (Better Structure)
```yaml
# docker-compose.yml
version: '3.8'
networks:
  youmeyou-network:
    driver: bridge

services:
  auth-service:
    networks: [youmeyou-network]
  
  nginx-gateway:
    networks: [youmeyou-network]
    # Can now use: proxy_pass http://auth-service:3001
```

#### Option 3: Kubernetes (Production Ready)
```yaml
# Use Kubernetes service discovery
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth-service
  ports:
    - port: 3001
```

### Frontend Configuration Fix

#### Current Problematic Code:
```typescript
// ❌ HARDCODED - CAUSES CORS ERRORS
return "http://localhost:3001";
```

#### Recommended Solution:
```typescript
// ✅ ENVIRONMENT VARIABLES
export const config = {
  auth: {
    serviceUrl: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "/api/auth"
  },
  api: {
    designService: process.env.NEXT_PUBLIC_DESIGN_SERVICE_URL || "/api/design"
  }
}
```

#### Environment Variables:
```bash
# Development
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_DESIGN_SERVICE_URL=http://localhost:4000

# Production
NEXT_PUBLIC_AUTH_SERVICE_URL=/api/auth
NEXT_PUBLIC_DESIGN_SERVICE_URL=/api/design
```

## Troubleshooting Guide

### SSL Certificate Issues
**Symptoms**: "Not Secure" warnings, certificate mismatch
**Solutions**:
1. Check certificate subject matches domain
2. Verify nginx server_name configuration
3. Ensure correct certificate mounting

### CORS Errors
**Symptoms**: Console errors, blocked requests
**Solutions**:
1. Update CORS_ORIGIN in backend services
2. Fix frontend service URLs
3. Ensure proper proxy configuration

### Firewall Access Issues
**Symptoms**: Connection timeouts, unreachable services
**Solutions**:
1. Verify VM is in correct VPC
2. Create firewall rules in matching VPC network
3. Check target tags match VM tags

### Network Communication Issues
**Symptoms**: Services can't reach each other
**Solutions**:
1. Use shared Docker network
2. Implement proper service discovery
3. Avoid hardcoded IP addresses

## Next Steps for Production

### Immediate Fixes Needed
1. **Fix CORS errors** by implementing proper service URLs
2. **Remove hardcoded IPs** from nginx configuration
3. **Implement shared Docker network** for service discovery
4. **Environment-based configuration** for all services

### Medium Term Improvements
1. **Migrate to Kubernetes** for better orchestration
2. **Implement service mesh** for advanced networking
3. **Setup monitoring and alerting**
4. **Automated CI/CD pipeline**

### Long Term Goals
1. **Multi-region deployment** for high availability
2. **Auto-scaling** based on load
3. **Advanced security** (WAF, DDoS protection)
4. **Performance optimization** (CDN, caching)

## Commands Reference

### Build and Deploy
```bash
# Build all services
./infrastructure/portainer-stacks-working/build-all-services.sh <github_token>

# Deploy via Portainer
# 1. Auth Service Stack
# 2. Design Service Stack  
# 3. Payment Service Stack
# 4. Web Application Stack
```

### Firewall Management
```bash
# Restrict to your IP
gcloud compute firewall-rules update youmeyou-staging-web-access-vpc \
    --source-ranges YOUR_IP/32

# Open for production
gcloud compute firewall-rules update youmeyou-staging-web-access-vpc \
    --source-ranges 0.0.0.0/0
```

### Health Checks
```bash
# Test all services
curl https://youmeyou.ai/api/auth/health
curl https://youmeyou.ai/api/design/health
curl https://youmeyou.ai/api/payment/health
```

---

**Status**: Development environment working with IP restrictions
**Next Priority**: Fix CORS errors and implement scalable network architecture 