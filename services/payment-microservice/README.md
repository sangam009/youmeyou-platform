# Payment Microservice

A flexible and extensible payment service designed to handle both one-time payments and subscription management with support for multiple payment gateways.

## Features

- **Multiple Gateway Support**: Initially built with Razorpay integration, designed to be easily extensible to other payment providers
- **Payment Types**: Supports both one-time payments and subscription-based recurring payments
- **Order Management**: Decoupled orders from payments for better tracking and auditing
- **Subscription Management**: Full lifecycle management including creation, payment, activation, cancellation, and renewal
- **Robust Payment Flow**: Initial pending state with verification to confirm successful payments
- **Comprehensive Logging**: Detailed logging throughout payment processes for diagnostics and auditing
- **Security**: Authorization checks for all operations to ensure data privacy

## Architecture

The payment microservice is built with a modular design:

- **Gateway Abstraction Layer**: Allows easy integration of new payment gateways
- **Service Layer**: Business logic for payments, subscriptions, and orders
- **Model Layer**: Database operations for persistent storage
- **Controller Layer**: API endpoints with input validation
- **Routes**: Well-organized API routes with authentication middleware

## Database Schema

### Orders Table

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) CHECK (status IN ('created', 'processing', 'completed', 'cancelled', 'refunded', 'failed')),
  gateway VARCHAR(100) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (user_id),
  INDEX (order_id)
);
```

### Payments Table

```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(255),
  order_reference_id INT NULL, -- Reference to orders table
  subscription_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) CHECK (status IN ('created', 'pending', 'success', 'failed', 'expired', 'cancelled')),
  user_id VARCHAR(255) NOT NULL,
  gateway VARCHAR(100) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('one-time', 'subscription')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMP,
  refund_status VARCHAR(50) CHECK (refund_status IN ('none', 'initiated', 'completed')),
  transaction_id UUID NOT NULL UNIQUE,
  FOREIGN KEY (order_reference_id) REFERENCES orders(id) ON DELETE SET NULL
);
```

### Plans Table

```sql
CREATE TABLE plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  interval INT NOT NULL,
  period VARCHAR(50) NOT NULL,
  gateway VARCHAR(100) NOT NULL,
  metadata JSON
);
```

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  plan_id INT NOT NULL,
  subscription_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) CHECK (status IN ('active', 'cancelled', 'failed', 'pending')),
  gateway VARCHAR(100) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  next_billing_date TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);
```

## API Endpoints

### Order Endpoints

- `POST /api/payment/create-order` - Create a new payment order
- `GET /api/order/:order_id` - Get order details
- `GET /api/orders` - Get all orders for the current user

### Payment Endpoints

- `POST /api/payment/verify-payment` - Verify a payment after completion
- `GET /api/payment/status/:order_id` - Get payment status (deprecated)
- `GET /api/payment/details/:payment_id` - Get detailed payment information
- `GET /api/payment/user-payments` - Get payment history for current user

### Plan Endpoints

- `POST /api/payment/create-plan` - Create a new subscription plan (admin only)
- `GET /api/payment/plans` - Get all available subscription plans
- `GET /api/payment/plan/:plan_id` - Get details for a specific plan

### Subscription Endpoints

- `POST /api/payment/subscribe` - Create a new subscription in pending state
- `POST /api/payment/create-subscription-order` - Create a payment order for a pending subscription
- `POST /api/payment/verify-subscription-payment` - Verify a subscription payment
- `GET /api/payment/subscriptions` - Get all subscriptions for current user
- `POST /api/payment/cancel-subscription` - Cancel an active subscription

### Webhook Endpoints

- `POST /api/payment/webhook/razorpay` - Handle Razorpay payment webhooks
- `POST /api/payment/webhook/razorpay/subscription` - Handle Razorpay subscription webhooks

### Webhook Events

The service handles the following webhook events:

#### Payment Events
- `payment.authorized`: Payment is authorized
- `payment.failed`: Payment failed
- `payment.captured`: Payment is captured
- `payment.refunded`: Payment is refunded

#### Subscription Events
- `subscription.activated`: Subscription is activated
- `subscription.cancelled`: Subscription is cancelled
- `subscription.charged`: Subscription payment is charged
- `subscription.completed`: Subscription is completed
- `subscription.authenticated`: Subscription is authenticated

### Real-time Updates

The service uses Firebase for real-time status updates. When a webhook is received:
1. The payment/subscription status is updated in the database
2. A real-time event is broadcast through Firebase
3. Clients can subscribe to these events to get instant updates

## Recent Enhancements

1. **Decoupled Orders**: Created a separate orders table to decouple orders from payments, allowing for better tracking and management of orders.

2. **Improved Subscription Flow**:
   - Subscriptions now start in 'pending' state instead of 'active'
   - Created payment records for subscriptions with initial 'created' status
   - Added payment verification to activate subscriptions only after successful payment

3. **Enhanced Logging**:
   - Added comprehensive logging throughout all services
   - Improved error handling with detailed error messages

4. **Additional Endpoints**:
   - Added dedicated endpoints for order management: `/api/order/:order_id`, `/api/orders` 
   - Created separate endpoints for subscription payment operations: `/api/payment/create-subscription-order`, `/api/payment/verify-subscription-payment`

## Installation and Setup

1. Clone the repository
2. Set up environment variables (see `.env.example`)
3. Install dependencies: `npm install`
4. Run database migrations: `npm run migrate`
5. Start the service: `npm run start`

## Development

- For local development: `npm run dev`
- Run tests: `npm test`
- Lint code: `npm run lint`

## Integration with Auth Microservice

This service integrates with the Authentication Microservice for user authentication and authorization. See the Auth Microservice documentation for details.

## API Documentation

The API documentation is available as a Postman collection in the `payment-service-api.postman_collection.json` file. Import this collection into Postman to explore and test the API endpoints.

### Environment Setup

Two Postman environments are provided:
- `payment-service-environments.postman_environment.json` - For local development
- `payment-service-production.postman_environment.json` - For production use

### Importing the Collection

1. Open Postman
2. Click on "Import" button
3. Upload the `payment-service-api.postman_collection.json` file
4. Import the environment files as well

### Testing with the Collection

1. Select the appropriate environment from the dropdown menu in Postman
2. For local development, first visit the test route to get a session cookie:
   - Send the request `Test Routes/Test Payment Config` which sets a test session cookie
3. Once the cookie is set, you can test other endpoints

## Docker Deployment

The payment microservice is containerized and ready for deployment using Docker or Docker Swarm.

### Using Docker Compose

```bash
# Start the services
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f payment-service-ms

# Stop the services
docker-compose -f docker-compose.local.yml down
```

### Docker Swarm Deployment

The service is configured to work with Docker Swarm for production deployment. 

1. Ensure your domain (`payment.youmeyou.ai`) is properly configured to point to your swarm manager
2. Place your SSL certificates in the `nginx/certs` directory
3. Deploy using Docker Stack:

```bash
docker stack deploy -c docker-compose.yml payment-stack
```

## NGINX Configuration

The NGINX configuration for the domain `payment.youmeyou.ai` is located in `nginx/payment-service.conf`. This configuration:

- Sets up SSL with appropriate security settings
- Configures CORS for the frontend domain
- Routes requests to the payment service
- Includes special handling for test routes (disabled in production)

## Environment Variables

The service requires these environment variables:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Port the service listens on
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL connection details
- `AUTH_SERVICE_URL` - URL of the auth microservice
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` - Razorpay credentials

## Microservice Architecture

The payment microservice is designed as a completely independent service that communicates with other services (like the auth service) via HTTP API calls. This design provides several advantages:

- **Loose Coupling**: Services are completely independent and only communicate via well-defined APIs
- **Deployment Flexibility**: Each service can be deployed separately with different scaling requirements
- **Technology Independence**: Services can be implemented using different tech stacks
- **Resilience**: Services can handle temporary unavailability of other services

### Communication with Auth Service

The payment service communicates with the auth service via HTTP calls rather than container networking:

- In development: `http://host.docker.internal:3000` (maps to localhost outside the container)
- In production: Configured via `AUTH_SERVICE_URL` environment variable

This approach allows for deploying the services in different environments, on different hosts, or even with different cloud providers if needed.

## Project Structure

```
├── backend/              # Node.js backend
│   ├── src/              # Source code
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Middleware functions
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   │   └── gateways/ # Payment gateway implementations
│   │   └── utils/        # Utility functions
│   ├── .env.development  # Development environment variables
│   └── package.json      # Dependencies
├── database/             # Database initialization
│   └── init/             # Schema files
├── docker-compose.local.yml      # Local development configuration
├── docker-compose.production.yml # Production optimized configuration
├── Dockerfile                    # Universal Dockerfile (supports dev & prod)
├── start.sh                      # Universal startup script
├── .env.example                  # Template for local environment variables
├── PRODUCTION.md                 # Production deployment guide
└── README.md                     # This file
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js and npm (for local development)
- Auth Microservice (optional, for full functionality)

### Running the Service

We provide a unified script `start.sh` that supports both local development and production deployment with different options.

#### Local Development

With Auth Service Integration (if Auth Service is running on your local machine):

```bash
./start.sh local
```

The script will automatically detect if the auth service is running and use it if available.

In Standalone Mode (with mock authentication):

```bash
./start.sh local --standalone
```

#### Production Deployment

For production deployment:

```bash
./start.sh production
```

This will use the production configuration in `docker-compose.production.yml`.

### Environment Variables

The `start.sh` script will create appropriate environment files if they don't exist:

- For local development: `.env` (template available in `.env.example`)
- For production: `.env.production`

Key variables for development:
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: Your Razorpay API credentials
- `AUTH_SERVICE_URL`: URL of the Auth Service (default: http://host.docker.internal:3000)
- `MOCK_AUTH`: Whether to use mock authentication (auto-detected by the startup script)

For detailed production configuration, see [PRODUCTION.md](./PRODUCTION.md).

## Testing

### Test Credentials

For testing, you can use the following Razorpay test credentials:
- **Key ID**: `rzp_test_wsmyEOUbhu4SYa`
- **Key Secret**: `TeKWGYmMpmvaRLhfPU6el15s`

### Test UI

A test page is available at `/test/razorpay-checkout` which provides a simple UI for testing payment flows. This page can be accessed at http://localhost:4000/test/razorpay-checkout after starting the service.

The test UI allows you to:
- Create test payment orders with various amounts and currencies
- Test both UPI and card payment flows
- Verify payments and see results
- View payment details

### Test Authentication

During development, you can use the test session ID to access protected endpoints:
- Add `Cookie: connect.sid=test-session-id` to your request headers
- This will authenticate you as a test user without requiring the auth service

### Test Cards for Razorpay

You can use these test cards for simulating transactions:

- **Success**: 4111 1111 1111 1111
- **Failure**: 4242 4242 4242 4242

For UPI, use:
- **Success**: `success@razorpay`
- **Failure**: `failure@razorpay`

## Development Milestones

1. **Project Setup** ✅
2. **Basic API Structure** ✅
3. **Payment Gateway Integration** ✅
4. **Order Management** ✅
5. **Webhooks and Event Processing** ✅
6. **Subscription Management** 🔄
7. **Admin Dashboard** 🔄
8. **Enhanced Security Features** 🔄 

## Testing the Webhook Implementation

### 1. Set Up Webhook Testing Environment

1. Install ngrok for webhook testing:
```bash
npm install -g ngrok
```

2. Start ngrok to create a public URL:
```bash
ngrok http 3000
```

3. Configure Razorpay webhook URL:
   - Go to Razorpay Dashboard > Settings > Webhooks
   - Add your ngrok URL + `/api/payment/webhook/razorpay`
   - Add your ngrok URL + `/api/payment/webhook/razorpay/subscription`
   - Select all payment and subscription events

### 2. Test Payment Flow

1. Create a one-time payment:
```bash
curl -X POST http://localhost:3000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "currency": "INR"}'
```

2. Complete the payment using Razorpay test card:
   - Card Number: 4111 1111 1111 1111
   - Expiry: Any future date
   - CVV: Any 3 digits

3. Verify webhook receipt:
   - Check the server logs for webhook events
   - Verify the payment status in the database
   - Check Firebase for real-time updates

### 3. Test Subscription Flow

1. Create a subscription plan:
```bash
curl -X POST http://localhost:3000/api/payment/create-plan \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Plan",
    "amount": 1000,
    "interval": 1,
    "period": "monthly"
  }'
```

2. Create a subscription:
```bash
curl -X POST http://localhost:3000/api/payment/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "plan_xxx",
    "gateway": "razorpay"
  }'
```

3. Complete the subscription payment using test card
4. Verify webhook receipt and subscription activation
5. Monitor subscription renewal webhooks

### 4. Monitor Real-time Updates

1. Set up Firebase listener in your client:
```javascript
firebase.database().ref('events/payments').on('child_added', (snapshot) => {
  const event = snapshot.val();
  console.log('Payment event:', event);
});

firebase.database().ref('events/subscriptions').on('child_added', (snapshot) => {
  const event = snapshot.val();
  console.log('Subscription event:', event);
});
```

2. Verify that events are received in real-time when webhooks are processed

## Postman Collection

The Postman collection has been updated to include webhook testing:

1. Import the updated collection:
   - `payment-service-api.postman_collection.json`
   - `payment-service-environments.postman_environment.json`

2. Set up environment variables:
   - `base_url`: Your service URL
   - `ngrok_url`: Your ngrok URL for webhook testing
   - `razorpay_key_id`: Your Razorpay test key
   - `razorpay_key_secret`: Your Razorpay test secret

3. Test webhook endpoints:
   - Use the "Webhook Testing" folder in the collection
   - Follow the test sequence for both payment and subscription flows 