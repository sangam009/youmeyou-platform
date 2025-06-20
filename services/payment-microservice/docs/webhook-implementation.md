# Webhook Implementation Guide

## Overview

This document details the webhook implementation for the Payment Microservice, focusing on real-time payment and subscription status updates through Razorpay webhooks and Firebase integration.

## Webhook Architecture

### 1. Webhook Endpoints

#### Payment Webhook
```http
POST /api/payment/webhook/razorpay
Content-Type: application/json
X-Razorpay-Signature: <signature>
```

#### Subscription Webhook
```http
POST /api/payment/webhook/razorpay/subscription
Content-Type: application/json
X-Razorpay-Signature: <signature>
```

### 2. Supported Events

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

## Implementation Details

### 1. Webhook Verification

```javascript
// Example webhook verification
const verifyWebhook = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};
```

### 2. Event Processing

#### Payment Event Processing
```javascript
// Example payment event processing
const processPaymentEvent = async (event, payload) => {
  switch (event) {
    case 'payment.authorized':
      await handlePaymentAuthorized(payload);
      break;
    case 'payment.failed':
      await handlePaymentFailed(payload);
      break;
    // ... other cases
  }
};
```

#### Subscription Event Processing
```javascript
// Example subscription event processing
const processSubscriptionEvent = async (event, payload) => {
  switch (event) {
    case 'subscription.activated':
      await handleSubscriptionActivated(payload);
      break;
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(payload);
      break;
    // ... other cases
  }
};
```

### 3. Firebase Integration

#### Real-time Status Updates
```javascript
// Example Firebase status update
const updatePaymentStatus = async (paymentId, status) => {
  await firebase.database().ref(`payments/${paymentId}`).update({
    status,
    updated_at: new Date().toISOString()
  });
};
```

#### Event Broadcasting
```javascript
// Example event broadcasting
const broadcastPaymentEvent = async (event, data) => {
  await firebase.database().ref(`events/payments`).push({
    event,
    data,
    timestamp: new Date().toISOString()
  });
};
```

## Webhook Payload Examples

### Payment Authorized
```json
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xyz123",
        "amount": 1000,
        "currency": "INR",
        "status": "authorized",
        "order_id": "order_xyz123",
        "method": "card",
        "captured": false,
        "description": "Test payment",
        "card_id": "card_xyz123",
        "bank": "HDFC",
        "wallet": null,
        "vpa": null,
        "email": "test@example.com",
        "contact": "9876543210",
        "notes": {
          "order_reference": "ORDER_123"
        },
        "fee": 20,
        "tax": 3,
        "error_code": null,
        "error_description": null,
        "created_at": 1634567890
      }
    }
  }
}
```

### Subscription Activated
```json
{
  "event": "subscription.activated",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_xyz123",
        "plan_id": "plan_xyz123",
        "status": "active",
        "current_start": 1634567890,
        "current_end": 1637246290,
        "ended_at": null,
        "quantity": 1,
        "notes": {
          "user_name": "John Doe"
        },
        "charge_at": 1637246290,
        "start_at": 1634567890,
        "end_at": null,
        "auth_attempts": 0,
        "total_count": 12,
        "paid_count": 1,
        "customer_notify": true,
        "created_at": 1634567890
      }
    }
  }
}
```

## Error Handling

### 1. Webhook Verification Failures
```javascript
// Example error handling
const handleWebhookError = (error) => {
  logger.error('Webhook verification failed', {
    error: error.message,
    stack: error.stack
  });
  
  return {
    status: 'error',
    message: 'Webhook verification failed',
    error: error.message
  };
};
```

### 2. Event Processing Failures
```javascript
// Example event processing error handling
const handleEventProcessingError = async (error, event, payload) => {
  logger.error('Event processing failed', {
    event,
    error: error.message,
    stack: error.stack
  });
  
  // Store failed event for retry
  await storeFailedEvent(event, payload, error);
  
  return {
    status: 'error',
    message: 'Event processing failed',
    error: error.message
  };
};
```

## Best Practices

1. **Security**
   - Always verify webhook signatures
   - Use HTTPS for webhook endpoints
   - Implement rate limiting
   - Validate payload structure

2. **Reliability**
   - Implement idempotency
   - Store failed events for retry
   - Use transaction for database operations
   - Implement proper error handling

3. **Monitoring**
   - Log all webhook events
   - Monitor webhook processing times
   - Track failed events
   - Set up alerts for critical failures

4. **Testing**
   - Test with Razorpay test mode
   - Verify signature validation
   - Test all event types
   - Validate Firebase updates

## Configuration

### 1. Environment Variables
```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
```

### 2. Webhook Configuration in Razorpay Dashboard
1. Go to Settings > Webhooks
2. Add webhook URLs:
   - Payment: `https://your-domain.com/api/payment/webhook/razorpay`
   - Subscription: `https://your-domain.com/api/payment/webhook/razorpay/subscription`
3. Select events to receive
4. Save configuration

## Support

For webhook-related issues:
- Check webhook logs in Razorpay dashboard
- Verify webhook configuration
- Check Firebase real-time database
- Contact support with webhook ID and event details 