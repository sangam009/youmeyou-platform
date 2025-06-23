# YouMeYou Platform - Registry-Based Deployment Strategy

This document outlines the complete deployment strategy for the YouMeYou platform, including the registry-based build and deployment workflow.

## Overview

The YouMeYou platform follows a **registry-first deployment strategy** where:
1. Code changes are committed to Git
2. Docker images are built from source and pushed to private registry
3. Portainer stacks pull images from registry for deployment
4. Services are deployed consistently across environments

## Architecture Components

### Private Docker Registry
- **Registry Service**: `registry-staging.youmeyou.ai` (HTTPS)
- **Registry UI**: `https://registry-ui-staging.youmeyou.ai` (management interface)
- **Authentication**: `youmeyou:staging2024!`
- **Storage**: Persistent volumes on VM

### Service Images
- **Auth Service**: `registry-staging.youmeyou.ai/youmeyou/auth-service:latest`
- **Design Service**: `registry-staging.youmeyou.ai/youmeyou/design-service:latest`
- **Payment Service**: `registry-staging.youmeyou.ai/youmeyou/payment-service:latest`
- **Web Application**: `registry-staging.youmeyou.ai/youmeyou/codaloo-web:latest`

### Portainer Orchestration
- **Portainer UI**: `https://staging.youmeyou.ai:9443`
- **Stack Management**: Docker Compose stack deployments
- **Registry Integration**: Automatic image pulling from private registry

## Standard Deployment Workflow

### 1. Development Phase
```bash
# Local development and testing
npm install
npm run dev
# Test changes locally

# Use docker-compose for local testing
docker-compose -f docker-compose.local.yml up
```

### 2. Code Commit and Push
```bash
# Commit changes to Git
git add .
git commit -m "feat: description of changes"
git push origin main
```

### 3. Build and Registry Push (On VM)
```bash
# SSH to VM
ssh user@staging.youmeyou.ai

# Navigate to project directory
cd /path/to/youmeyou-platform

# Pull latest changes
git pull origin main

# Option A: Build all services (for major releases)
./infrastructure/portainer-stacks-working/build-all-services.sh <github_token>

# Option B: Build single service (for individual service changes)
./infrastructure/portainer-stacks-working/build-single-service.sh <github_token> <service_name>
# Available services: auth, design, payment

# Option C: Build web application only
cd web
docker build -t registry-staging.youmeyou.ai/youmeyou/codaloo-web:latest .
docker push registry-staging.youmeyou.ai/youmeyou/codaloo-web:latest
```

### 4. Deployment via Portainer
1. **Access Portainer**: https://staging.youmeyou.ai:9443
2. **Navigate to Stacks**: Select the relevant stack
3. **Update Stack**: Click "Update the stack" button
4. **Pull Latest Images**: Portainer automatically pulls `:latest` from registry
5. **Deploy**: Wait for deployment completion
6. **Verify**: Check container logs and health status

### 5. Post-Deployment Verification
```bash
# Check service health endpoints
curl https://staging.youmeyou.ai/api/auth/health
curl https://staging.youmeyou.ai/api/design/health
curl https://staging.youmeyou.ai/api/payment/health

# Check frontend application
curl https://staging.youmeyou.ai/

# Check specific functionality
curl -X POST https://staging.youmeyou.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

## Build Scripts Documentation

### `build-all-services.sh`
**Purpose**: Build all services from Git repository
**Usage**: `./build-all-services.sh <github_token>`

**Features**:
- Clones repository from GitHub
- Builds all services with Dockerfiles
- Tags with timestamp and `:latest`
- Pushes to private registry
- Automatic cleanup

**Services Built**:
- Auth Service (`services/auth-microservice/backend`)
- Design Service (`services/design-microservice`)
- Payment Service (`services/payment-microservice`)
- Web Application (`web`)

### `build-single-service.sh`
**Purpose**: Build individual service (faster for single-service changes)
**Usage**: `./build-single-service.sh <github_token> <service_name>`

**Available Services**:
- `auth` - Authentication microservice
- `design` - Design/canvas microservice  
- `payment` - Payment processing microservice

**Benefits**:
- Faster build times
- Targeted deployments
- Resource efficient

## Registry Management

### Viewing Registry Contents
```bash
# List all repositories
curl -u youmeyou:staging2024! -X GET https://registry-staging.youmeyou.ai/v2/_catalog

# List tags for specific image
curl -u youmeyou:staging2024! -X GET https://registry-staging.youmeyou.ai/v2/youmeyou/auth-service/tags/list
curl -u youmeyou:staging2024! -X GET https://registry-staging.youmeyou.ai/v2/youmeyou/design-service/tags/list
curl -u youmeyou:staging2024! -X GET https://registry-staging.youmeyou.ai/v2/youmeyou/payment-service/tags/list
```

### Registry UI Access
- **External**: https://registry-ui-staging.youmeyou.ai
- **Authentication**: youmeyou:staging2024!
- **Features**: Browse images, tags, and metadata

### Registry Authentication
```bash
# Login to registry (required for push operations)
echo "staging2024!" | docker login registry-staging.youmeyou.ai -u youmeyou --password-stdin
```

## Service-Specific Deployment Notes

### Auth Service
- **Dockerfile**: `services/auth-microservice/backend/Dockerfile`
- **Dependencies**: MySQL, Redis
- **Health Check**: `/health` endpoint
- **Port**: 3001 (internal)

### Design Service
- **Dockerfile**: `services/design-microservice/Dockerfile`
- **Dependencies**: MongoDB, Redis
- **Health Check**: `/health` endpoint
- **Port**: 4000 (internal)

### Payment Service
- **Dockerfile**: `services/payment-microservice/Dockerfile`
- **Dependencies**: MySQL
- **Health Check**: `/health` endpoint
- **Port**: 6000 (internal)

### Web Application
- **Dockerfile**: `web/Dockerfile`
- **Framework**: Next.js 15
- **Build**: Static optimization
- **Port**: 3000 (public via nginx)

## Environment-Specific Configuration

### Development
- **API URLs**: Direct service URLs (`localhost:3001`, etc.)
- **CORS**: Permissive for local development
- **SSL**: Not required
- **Registry**: Optional (can use local builds)

### Staging
- **API URLs**: Nginx proxy routes (`/api/auth`, `/api/design`)
- **CORS**: Restricted to staging domain
- **SSL**: Required (Let's Encrypt)
- **Registry**: Private registry mandatory

### Production (Future)
- **API URLs**: Production nginx proxy routes
- **CORS**: Restricted to production domains
- **SSL**: Production certificates
- **Registry**: Production registry instance

## Rollback Procedures

### Immediate Rollback (Portainer)
1. **Access Portainer**: Navigate to affected stack
2. **Stack History**: View previous deployments
3. **Rollback**: Select previous version and deploy
4. **Verify**: Check service health after rollback

### Image-Level Rollback
```bash
# List available image tags
curl -X GET http://localhost:5000/v2/youmeyou/auth-service/tags/list

# Update stack file with specific tag
# Change from :latest to specific timestamp tag
image: registry-staging.youmeyou.ai/youmeyou/auth-service:staging-20241120-143022

# Redeploy stack with fixed tag
```

### Configuration Rollback
```bash
# Git-based rollback for stack configurations
git log --oneline  # Find previous commit
git revert <commit_hash>  # Revert problematic changes
git push origin main  # Push rollback
```

## Monitoring and Logging

### Health Checks
All services include built-in health checks:
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:PORT/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Log Access
- **Portainer**: Container logs available in UI
- **SSH**: `docker logs <container_name>`
- **Centralized**: Future ELK stack integration

### Metrics
- **Container Stats**: Available in Portainer
- **Service Metrics**: Exposed via health endpoints
- **Registry Metrics**: Available via registry API

## Security Considerations

### Registry Security
- **Private Access**: Registry not publicly accessible
- **Authentication**: Required for all operations
- **Network Isolation**: Registry on internal VM network
- **Image Scanning**: Manual verification required

### Deployment Security
- **Image Integrity**: Use specific tags for production
- **Secret Management**: Environment variables in Portainer
- **Network Isolation**: Services on isolated Docker networks
- **SSL/TLS**: HTTPS for all public endpoints

## Troubleshooting

### Common Issues

**Build Failures**:
```bash
# Check Docker daemon
docker info

# Check disk space
df -h

# Clean Docker cache
docker system prune -a
```

**Registry Connection Issues**:
```bash
# Test registry connectivity
curl -I http://localhost:5000/v2/

# Check registry container
docker ps | grep registry
docker logs <registry_container>
```

**Portainer Deployment Issues**:
```bash
# Check stack logs in Portainer UI
# Verify image availability in registry
# Check network connectivity between services
```

### Recovery Procedures

**Complete Platform Reset**:
1. Stop all stacks in Portainer
2. Clean Docker volumes (if necessary)
3. Rebuild all images
4. Deploy database stacks first
5. Deploy application stacks
6. Verify all services

**Partial Service Recovery**:
1. Identify failing service
2. Rebuild specific service image
3. Push to registry
4. Redeploy only affected stack
5. Verify service integration

## Best Practices

### Development
- **Test Locally**: Always test changes locally before pushing
- **Incremental Changes**: Small, focused commits
- **Documentation**: Update docs with significant changes

### Deployment
- **Single Service Updates**: Use targeted builds when possible
- **Verification**: Always verify deployments before proceeding
- **Monitoring**: Watch logs during deployment

### Registry Management
- **Tag Strategy**: Use timestamp tags for traceability
- **Cleanup**: Regularly clean old images to save space
- **Backup**: Consider registry backup strategy

### Security
- **Token Management**: Secure GitHub tokens
- **Registry Credentials**: Rotate registry passwords
- **SSL Certificates**: Monitor certificate expiry

## Future Improvements

### Short Term
- **Automated Testing**: CI/CD pipeline integration
- **Health Monitoring**: Automated health checks
- **Log Aggregation**: Centralized logging solution

### Long Term
- **Production Registry**: Separate production registry
- **Blue-Green Deployments**: Zero-downtime deployments
- **Auto-scaling**: Container orchestration improvements
- **Monitoring Stack**: Prometheus + Grafana integration

---

**Document Version**: 1.0
**Last Updated**: $(date)
**Next Review**: Monthly
**Owner**: DevOps Team 