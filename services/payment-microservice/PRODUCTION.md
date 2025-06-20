# Payment Microservice Production Deployment Guide

This document provides instructions for deploying the Payment Microservice in a production environment.

## Prerequisites

- Docker and Docker Compose installed on the server
- Access to a secure MySQL database (or use the containerized version)
- Razorpay account with live API credentials
- Domain name with proper SSL/TLS configuration
- Auth Service accessible via HTTPS

## Deployment Options

The Payment Microservice can be deployed in several ways:

### 1. Using Docker Compose (Recommended for Simple Deployments)

This is the simplest method, using Docker Compose to manage containers directly on a server.

### 2. Using Kubernetes (Recommended for Production at Scale)

For larger deployments, Kubernetes provides better scalability and management capabilities.

### 3. Using Cloud Services

The service can be deployed to AWS ECS, Google Cloud Run, or Azure Container Apps.

## Production Deployment with Docker Compose

### 1. Prepare the Environment

The unified `start.sh` script will create a `.env.production` file if one doesn't exist. Simply run:

```bash
./start.sh production
```

This will create the file with default values, but you should edit it with your production values:

```bash
vim .env.production
```

Important values to configure:

- Your production Razorpay live credentials
- Secure database passwords
- Your Auth Service URL
- Appropriate CORS settings
- Production JWT secret

### 2. Configure SSL/TLS (Recommended)

For production, it's recommended to put the service behind a reverse proxy like Nginx or Traefik to handle SSL termination.

Example Nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name payment.yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Start the Service

After configuring your `.env.production` file, start the service in production mode:

```bash
./start.sh production
```

This script will:
- Check for required environment variables
- Build the Docker image with production optimizations
- Start the service and database containers
- Perform health checks to verify the service is operational

## Docker Build Configuration

Our unified Dockerfile uses build arguments to configure the build process for production:

```bash
# These are automatically set by the start.sh script in production mode
NODE_ENV=production      # Enables production optimizations
USE_NON_ROOT_USER=true   # Enhances security by running as non-root
```

## Scaling Considerations

### Database Scaling

For production workloads, consider:
- Using an external managed MySQL service instead of the containerized version
- Implementing read replicas for high-read scenarios
- Setting up proper database backups

To use an external database, update the environment variables in your `.env.production` file:

```
MYSQL_HOST=your-production-db-host
MYSQL_USER=your-db-user
MYSQL_PASSWORD=your-secure-password
MYSQL_DATABASE=paymentdb
```

### Container Scaling

For higher loads:
- Increase the number of containers using Docker Compose scale or Kubernetes replicas
- Implement a load balancer in front of multiple service instances
- Consider using a container orchestration platform like Kubernetes

## Monitoring and Logging

### Monitoring

Consider integrating with:
- Prometheus and Grafana for metrics
- Health check services like Datadog or Uptime Robot

### Logging

The service outputs logs to both stdout (for Docker logging) and the local `logs` directory.

To integrate with a logging service:
- Configure Docker to use a logging driver compatible with your logging system
- Forward logs to a centralized logging service like ELK Stack or Datadog

## Security Considerations

### Environment Variables

- Use a secrets management service in production
- Rotate API keys and passwords regularly
- Never commit .env.production files to version control

### Network Security

- Place the service in a private subnet when possible
- Use a reverse proxy or API gateway with proper request filtering
- Implement rate limiting to prevent abuse

### Database Security

- Use strong passwords and restrict network access
- Enable SSL for database connections
- Regularly backup database data

## Webhook Configuration

For Razorpay webhooks:

1. In your Razorpay dashboard, configure the webhook URL:
   ```
   https://payment.yourdomain.com/api/payment/webhook
   ```

2. Set the webhook secret in your `.env.production` file:
   ```
   RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
   ```

## Health Checks and Readiness

The service provides a health check endpoint at `/api/health`. Use this endpoint for:

- Load balancer health checks
- Container orchestration readiness probes
- External monitoring services

The Docker containers are configured with health checks that use this endpoint.

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check if database is accessible from the container network
   - Verify credentials and database name

2. **Razorpay API Issues**
   - Verify API credentials are correct
   - Check if your account has been activated for live payments

3. **Auth Service Communication**
   - Ensure AUTH_SERVICE_URL is correctly set
   - Check if the auth service is accessible from the payment service

### Viewing Logs

```bash
# View logs from the payment service
docker logs payment-service

# Follow logs in real-time
docker logs -f payment-service
```

## Maintenance

### Updates and Upgrades

To update the service:

1. Pull the latest code
2. Stop the existing containers: `./start.sh production`
3. The script will automatically rebuild the Docker image

### Backups

Regularly backup:
- MySQL database data
- Environment configuration
- Custom configurations

## Support

For support issues, please contact the development team or raise an issue in the repository.