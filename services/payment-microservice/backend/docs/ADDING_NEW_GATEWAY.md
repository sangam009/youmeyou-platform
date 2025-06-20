# Adding a New Payment Gateway

This guide explains how to add a new payment gateway to the payment microservice.

## Overview

The payment microservice uses a gateway abstraction layer that makes it easy to add new payment gateways. The system is designed to be extensible while maintaining a consistent interface for payment operations.

## Steps to Add a New Gateway

### 1. Create Gateway Implementation

Create a new file in `src/services/gateways/` with your gateway implementation. The file should be named `[gateway-name].gateway.js`. For example, for a new gateway called "Stripe", create `stripe.gateway.js`.

Your gateway class must extend the `PaymentGateway` interface and implement all required methods:

```javascript
const PaymentGateway = require('./gateway.interface');

class StripeGateway extends PaymentGateway {
  constructor(config) {
    super(config);
    // Initialize your gateway client here
  }

  async createOrder(orderData) {
    // Implement order creation
  }

  async verifyPayment(paymentData) {
    // Implement payment verification
  }

  async getPaymentStatus(orderId) {
    // Implement status check
  }

  async processWebhook(eventData) {
    // Implement webhook processing
  }

  async initiateRefund(refundData) {
    // Implement refund initiation
  }

  // Optional: Implement subscription methods if supported
  async createPlan(planData) {
    // Implement plan creation
  }

  async createSubscription(subscriptionData) {
    // Implement subscription creation
  }

  async cancelSubscription(subscriptionId) {
    // Implement subscription cancellation
  }

  async renewSubscription(subscriptionId) {
    // Implement subscription renewal
  }
}
```

### 2. Update Gateway Factory

Add your new gateway to the `GatewayFactory` class in `src/services/gateway.factory.js`:

```javascript
const StripeGateway = require('./gateways/stripe.gateway');

class GatewayFactory {
  static getGateway(gatewayName) {
    const gatewayConfig = config.getGatewayConfig(gatewayName);
    
    switch (gatewayName.toLowerCase()) {
      // ... existing cases ...
      case 'stripe':
        return new StripeGateway(gatewayConfig);
      default:
        throw new Error(`Unsupported gateway: ${gatewayName}`);
    }
  }

  static isSupported(gatewayName) {
    const supportedGateways = ['razorpay', 'phonepe', 'cashfree', 'stripe'];
    return supportedGateways.includes(gatewayName.toLowerCase());
  }
}
```

### 3. Add Gateway Configuration

Add your gateway configuration to `src/config/payment-config.js`:

```javascript
class PaymentConfig {
  constructor() {
    this.gateways = {
      // ... existing gateways ...
      stripe: {
        enabled: process.env.STRIPE_ENABLED === 'true',
        credentials: {
          api_key: process.env.STRIPE_API_KEY,
          webhook_secret: process.env.STRIPE_WEBHOOK_SECRET
        }
      }
    };
  }
}
```

### 4. Add Environment Variables

Add the necessary environment variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_ENABLED=true
STRIPE_API_KEY=your_api_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### 5. Update Documentation

Update the following documentation files:
- Add your gateway to the list of supported gateways in `README.md`
- Add any gateway-specific configuration details to `CONFIGURATION.md`
- Add gateway-specific API documentation to `API.md`

## Best Practices

1. **Error Handling**: Implement proper error handling in your gateway implementation. Use the logger to log errors and throw meaningful error messages.

2. **Testing**: Create unit tests for your gateway implementation in `tests/unit/gateways/`.

3. **Webhook Security**: Implement proper webhook signature verification to ensure the security of incoming webhook events.

4. **Configuration**: Use environment variables for sensitive configuration and provide sensible defaults for non-sensitive settings.

5. **Documentation**: Document any gateway-specific features, limitations, or requirements.

## Example Implementation

Here's a simplified example of a gateway implementation:

```javascript
const PaymentGateway = require('./gateway.interface');
const axios = require('axios');
const logger = require('../../utils/logger');

class ExampleGateway extends PaymentGateway {
  constructor(config) {
    super(config);
    this.apiKey = config.api_key;
    this.baseUrl = config.base_url;
  }

  async createOrder(orderData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        {
          amount: orderData.amount,
          currency: orderData.currency,
          // ... other order data
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return {
        order_id: response.data.id,
        amount: orderData.amount,
        currency: orderData.currency,
        status: 'created',
        payment_url: response.data.payment_url
      };
    } catch (error) {
      logger.error('Error creating order:', error);
      throw new Error('Failed to create order');
    }
  }

  // ... implement other required methods
}
```

## Support

If you need help adding a new gateway or have questions about the implementation, please:
1. Check the existing gateway implementations for reference
2. Review the `PaymentGateway` interface documentation
3. Contact the development team for assistance 