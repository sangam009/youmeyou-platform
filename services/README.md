# YouMeYou Microservices

This directory contains all the microservices that power the YouMeYou platform.

## Services Overview

### 🎨 Design Microservice
**Purpose**: Core canvas and design functionality
**Port**: 4000
**Database**: MongoDB + Redis
**Key Features**:
- Visual canvas editor
- Project management
- Template system
- Real-time collaboration

### 🔐 Auth Microservice  
**Purpose**: User authentication and session management
**Port**: 8080
**Database**: MySQL
**Key Features**:
- Firebase authentication
- Session management
- User profiles
- Access control

### 💳 Payment Microservice
**Purpose**: Payment processing and subscriptions
**Port**: 3001
**Database**: MySQL
**Key Features**:
- Multi-gateway support
- Subscription billing
- Webhook processing
- Transaction management

## Development

Each service can be run independently:

```bash
# Design Service
cd design-microservice && ./start-local.sh

# Auth Service  
cd auth-microservice && ./start-dev.sh

# Payment Service
cd payment-microservice && ./start.sh
```

## API Documentation

- Design API: http://localhost:4000/health
- Auth API: http://localhost:8080/health  
- Payment API: http://localhost:3001/health
