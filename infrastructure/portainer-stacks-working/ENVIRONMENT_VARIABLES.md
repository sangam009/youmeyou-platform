# YouMeYou Platform - DNS-Based Architecture

## 🏗️ **Architecture Overview**
This deployment uses a **DNS-based microservices architecture** with proper network segmentation for enhanced security and scalability.

### **Network Layers**
1. **youmeyou-public**: External-facing gateway only
2. **youmeyou-internal**: Service-to-service communication
3. **youmeyou-data**: Database and cache layer (most restricted)

### **DNS Structure**
- **Public DNS**: `staging.youmeyou.ai` (gateway only)
- **Internal DNS**: `*.youmeyou.internal` (service discovery)
- **Data DNS**: `*.data.youmeyou.internal` (database access)

## 🔒 **Security Model**

### **Public Access (Port Exposed)**
- **Gateway**: `80, 443` - Only public-facing service

### **Internal Access (DNS Only)**
- **Auth Service**: `auth-service.youmeyou.internal:3001`
- **Design Service**: `design-service.youmeyou.internal:4000`
- **Payment Service**: `payment-service.youmeyou.internal:5000`
- **Web App**: `web-app.youmeyou.internal:3000`

### **Data Layer (Completely Internal)**
- **Auth MySQL**: `auth-mysql.youmeyou.internal:3306`
- **Auth Redis**: `auth-redis.youmeyou.internal:6379`
- **Design MySQL**: `design-mysql.youmeyou.internal:3306`
- **Design Redis**: `design-redis.youmeyou.internal:6379`
- **MongoDB**: `design-mongodb.youmeyou.internal:27017`
- **Payment MySQL**: `payment-mysql.youmeyou.internal:3306`
- **Payment Redis**: `payment-redis.youmeyou.internal:6379`

## 📋 **Deployment Order**

### **Phase 0: Infrastructure**
1. `network` - Creates network segments
2. `gateway` - Public reverse proxy

### **Phase 1: Data Layer**
3. `auth-mysql` - Auth database
4. `auth-redis` - Auth cache
5. `design-mysql` - Design database
6. `design-redis` - Design cache
7. `mongodb` - Design document store
8. `payment-mysql` - Payment database
9. `payment-redis` - Payment cache

### **Phase 2: Service Layer**
10. `auth-service` - Authentication API
11. `design-service` - Design API
12. `payment-service` - Payment API

### **Phase 3: Application Layer**
13. `web-app` - Frontend application

## 🌐 **DNS Resolution**

### **External Access**
```
https://staging.youmeyou.ai/api/auth     → Gateway → auth-service.youmeyou.internal:3001
https://staging.youmeyou.ai/api/design  → Gateway → design-service.youmeyou.internal:4000
https://staging.youmeyou.ai/api/payment → Gateway → payment-service.youmeyou.internal:5000
https://staging.youmeyou.ai/            → Gateway → web-app.youmeyou.internal:3000
```

### **Internal Service Communication**
```
auth-service → auth-mysql.youmeyou.internal:3306
auth-service → auth-redis.youmeyou.internal:6379
design-service → design-mysql.youmeyou.internal:3306
design-service → design-mongodb.youmeyou.internal:27017
design-service → design-redis.youmeyou.internal:6379
```

## 🔧 **Configuration Benefits**

### **Security**
- ✅ Databases not publicly accessible
- ✅ Services isolated by network layer
- ✅ Rate limiting and CORS at gateway
- ✅ Internal DNS prevents external access

### **Scalability**
- ✅ Load balancing via DNS
- ✅ Service discovery automatic
- ✅ Easy to add new services
- ✅ Network-level traffic control

### **Maintenance**
- ✅ Clear separation of concerns
- ✅ Independent service updates
- ✅ Centralized routing configuration
- ✅ Monitoring at gateway level

## ⚙️ **Environment Variables**

### **Gateway Configuration**
- **Public Domain**: `staging.youmeyou.ai`
- **SSL**: Configured for HTTPS
- **Rate Limiting**: API protection enabled

### **Service Configuration**
- **Auth**: DNS-based database connections
- **Design**: Multi-database DNS routing
- **Payment**: Secure payment gateway DNS
- **Web**: Internal API communication via DNS

## 🚀 **Production Ready Features**
- **Zero-downtime deployments**
- **Automatic service discovery**
- **Network-level security**
- **Centralized logging and monitoring**
- **SSL termination at gateway**
- **Rate limiting and DDoS protection**

## 🔐 **EXTRACTED FROM APPLICATION CODE - EXACT VALUES**
These values are taken directly from the application configurations to ensure compatibility.

## Global Variables (Required for All Stacks)
```bash
STACK_NAME=prod
ENVIRONMENT=staging
```

## 🗄️ Database Stacks

### auth-mysql.yml
```bash
# From authmicroservice/mysql.env (EXACT VALUES)
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=admin_backend
MYSQL_USER=kafeneo
MYSQL_PASSWORD=kafeneo#009
AUTH_MYSQL_PORT=3306
```

### design-mysql.yml  
```bash
# From codaloo/backend/designmicroservice/env.production.txt
MYSQL_ROOT_PASSWORD=youmeyou_secure_mysql_2024
MYSQL_DATABASE=designmicroservice
MYSQL_USER=root
MYSQL_PASSWORD=youmeyou_secure_mysql_2024
DESIGN_MYSQL_PORT=3307
```

### payment-mysql.yml
```bash
# From paymentmicroservice/backend/src/config/database.js
MYSQL_ROOT_PASSWORD=youmeyou_secure_mysql_2024
MYSQL_DATABASE=paymentmicroservice
MYSQL_USER=root
MYSQL_PASSWORD=youmeyou_secure_mysql_2024
PAYMENT_MYSQL_PORT=3308
```

### mongodb.yml
```bash
# From codaloo/backend/designmicroservice/env.production.txt
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=youmeyou_secure_mongo_2024
MONGO_INITDB_DATABASE=designmicroservice
DESIGN_MONGODB_PORT=27017
```

### Redis Stacks
```bash
# Consistent across all services
REDIS_PASSWORD=youmeyou_secure_redis_2024
AUTH_REDIS_PORT=6379
DESIGN_REDIS_PORT=6380
PAYMENT_REDIS_PORT=6381
```

## 🚀 Service Stacks

### auth-service.yml
```bash
# From authmicroservice/backend/src/config/database.js and index.js (EXACT VALUES)
STACK_NAME=prod
ENVIRONMENT=staging
NODE_ENV=production

# Database connection (from database.js)
DB_HOST=auth-mysql-prod
DB_USER=kafeneo
DB_PASSWORD=kafeneo#009
DB_NAME=admin_backend
DB_PORT=3306
DB_CONNECTION_LIMIT=10

# Redis connection (from index.js)
REDIS_HOST=auth-redis-prod
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_PREFIX=auth_
REDIS_TTL=86400

# Service config (from index.js)
PORT=3001
SESSION_SECRET=youmeyou_session_secret_2024

# CORS origins (UPDATED FOR STAGING)
CORS_ORIGIN=https://staging.youmeyou.ai,http://localhost:3000,http://localhost:3001,http://localhost:4000

# Firebase (needs to be configured)
FIREBASE_PROJECT_ID=youmeyou-staging
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@youmeyou-staging.iam.gserviceaccount.com
```

### design-service.yml
```bash
# MySQL connection
MYSQL_HOST=design-mysql-prod
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=youmeyou_secure_mysql_2024
MYSQL_DATABASE=designmicroservice

# MongoDB connection
MONGODB_URI=mongodb://admin:youmeyou_secure_mongo_2024@design-mongodb-prod:27017
MONGODB_DB=designmicroservice

# Redis connection
REDIS_HOST=design-redis-prod
REDIS_PORT=6379
REDIS_PASSWORD=youmeyou_secure_redis_2024

# Service config
DESIGN_PORT=4000
NODE_ENV=production
AUTH_SERVICE_URL=http://auth-service-prod:3001

# AI Configuration (replace with actual key)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GOOGLE_AI_KEY=your_actual_gemini_api_key_here
```

### payment-service.yml
```bash
# Database connection
DB_HOST=payment-mysql-prod
DB_USER=root
DB_PASSWORD=youmeyou_secure_mysql_2024
DB_NAME=paymentmicroservice
DB_PORT=3306

# Redis connection
REDIS_HOST=payment-redis-prod
REDIS_PORT=6379
REDIS_PASSWORD=youmeyou_secure_redis_2024

# Service config
PAYMENT_PORT=5000
NODE_ENV=production
AUTH_SERVICE_URL=http://auth-service-prod:3001

# Payment Gateway Config (replace with actual values)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
PHONEPE_MERCHANT_ID=your_phonepe_merchant_id
PHONEPE_SALT_KEY=your_phonepe_salt_key
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
WEBHOOK_SECRET=youmeyou_webhook_secret_2024
```

## 📋 **COPY-PASTE READY** Environment Variables

### For Database Stacks (Phase 1):
```bash
STACK_NAME=prod
ENVIRONMENT=staging
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=admin_backend
MYSQL_USER=kafeneo
MYSQL_PASSWORD=kafeneo#009
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=youmeyou_secure_mongo_2024
MONGO_INITDB_DATABASE=designmicroservice
REDIS_PASSWORD=youmeyou_secure_redis_2024
AUTH_MYSQL_PORT=3306
DESIGN_MYSQL_PORT=3307
PAYMENT_MYSQL_PORT=3308
DESIGN_MONGODB_PORT=27017
AUTH_REDIS_PORT=6379
DESIGN_REDIS_PORT=6380
PAYMENT_REDIS_PORT=6381
```

### For Service Stacks (Phase 2):
```bash
STACK_NAME=prod
ENVIRONMENT=staging
NODE_ENV=production
DB_HOST=auth-mysql-prod
DB_USER=kafeneo
DB_PASSWORD=kafeneo#009
DB_NAME=admin_backend
DB_PORT=3306
MYSQL_HOST=design-mysql-prod
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=youmeyou_secure_mysql_2024
MYSQL_DATABASE=designmicroservice
MONGODB_URI=mongodb://admin:youmeyou_secure_mongo_2024@design-mongodb-prod:27017
MONGODB_DB=designmicroservice
REDIS_HOST=auth-redis-prod
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_PREFIX=auth_
REDIS_TTL=86400
AUTH_PORT=3001
DESIGN_PORT=4000
PAYMENT_PORT=5000
JWT_SECRET=youmeyou_jwt_secret_2024_super_secure_key_staging
AUTH_SERVICE_URL=http://auth-service-prod:3001
GEMINI_API_KEY=your_actual_gemini_api_key_here
GOOGLE_AI_KEY=your_actual_gemini_api_key_here
FIREBASE_PROJECT_ID=youmeyou-staging
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@youmeyou-staging.iam.gserviceaccount.com
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
WEBHOOK_SECRET=youmeyou_webhook_secret_2024
```

## 🔧 **DATABASE INITIALIZATION**

### MySQL Databases:
- **auth-mysql**: Uses `/authmicroservice/mysql/init/01-schema.sql`
- **design-mysql**: Uses `/codaloo/backend/designmicroservice/init-scripts/init.sql`  
- **payment-mysql**: Uses `/paymentmicroservice/mysql/init/02-payment-schema.sql`

### MongoDB:
- **design-mongodb**: Uses `/codaloo/backend/designmicroservice/mongo-init/init-mongo.js`

## 🚨 **IMMEDIATE FIX FOR auth-mysql**

Use these exact variables for your failing auth-mysql stack:
```bash
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=admin_backend
MYSQL_USER=kafeneo
MYSQL_PASSWORD=kafeneo#009
ENVIRONMENT=staging
STACK_NAME=prod
```

## 🚨 **AUTH SERVICE STACK - PHASE 1**

### auth-redis.yml
```bash
# From authmicroservice/docker-compose.local.yml (EXACT VALUES)
STACK_NAME=prod
ENVIRONMENT=staging
REDIS_PASSWORD=
AUTH_REDIS_PORT=6379
```

## 📝 **DEPLOYMENT ORDER FOR AUTH SERVICE**
1. **youmeyou-auth-mysql** → auth-mysql.yml
2. **youmeyou-auth-redis** → auth-redis.yml  
3. **youmeyou-auth-service** → auth-service.yml

## 🌐 **CORS CONFIGURATION**
The auth service will accept requests from:
- `https://staging.youmeyou.ai` (PRODUCTION STAGING)
- `http://localhost:3000` (LOCAL DEV)
- `http://localhost:3001` (LOCAL DEV)
- `http://localhost:4000` (LOCAL DEV) 