# YouMeYou Platform

🚀 **AI-powered platform for system design, code generation, and deployment**

YouMeYou allows users to architect, build, and ship software systems through intelligent AI workflows.

## 🏗️ Architecture

```
├── services/           # Microservices
│   ├── design-microservice/    # Core design & canvas service
│   ├── auth-microservice/      # Authentication & user management
│   └── payment-microservice/   # Payment processing
├── web/               # Next.js frontend application
├── infrastructure/    # Deployment & infrastructure
│   ├── terraform/     # GCP infrastructure as code
│   ├── docker/        # Container configurations
│   └── portainer-stacks/ # Container orchestration
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## 🚀 Quick Start

### Local Development

1. **Design Microservice**
   ```bash
   cd services/design-microservice
   ./start-local.sh
   ```

2. **Web Frontend**
   ```bash
   cd web
   npm run dev
   ```

3. **Auth Service**
   ```bash
   cd services/auth-microservice
   ./start-dev.sh
   ```

### Staging Deployment

1. **Deploy Infrastructure**
   ```bash
   cd infrastructure/terraform/staging
   terraform apply
   ```

2. **Deploy Application**
   ```bash
   ./deploy-to-staging.sh
   ```

## 🌐 Environments

- **Local**: http://localhost:3000
- **Staging**: https://staging.youmeyou.ai
- **Production**: https://youmeyou.ai (coming soon)

## 🔧 Services

### Design Microservice (Port 4000)
- Canvas management
- Project templates
- Workspace collaboration
- **Tech**: Node.js, MongoDB, Redis

### Auth Microservice (Port 8080)
- User authentication
- Session management
- Firebase integration
- **Tech**: Node.js, MySQL

### Payment Microservice (Port 3001)
- Multi-gateway support (Razorpay, PhonePe, Cashfree)
- Subscription management
- Webhook handling
- **Tech**: Node.js, MySQL

### Web Frontend (Port 3000)
- Modern React dashboard
- Real-time collaboration
- Responsive design
- **Tech**: Next.js, TypeScript, Tailwind CSS

## 📊 Infrastructure

- **Cloud**: Google Cloud Platform (GCP)
- **Orchestration**: Docker + Portainer
- **Database**: MongoDB, MySQL, Redis
- **Monitoring**: Built-in health checks
- **Cost Optimization**: Scheduled VM shutdown

## 🚀 Vision

YouMeYou brings architecture into the development workflow — letting AI not just write code, but understand systems.

## 📝 License

Proprietary - All rights reserved
