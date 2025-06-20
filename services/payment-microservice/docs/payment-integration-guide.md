# Payment Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Payment Flows](#payment-flows)
   - [One-Time Payment Flow](#one-time-payment-flow)
   - [Subscription Payment Flow](#subscription-payment-flow)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Webhooks](#webhooks)

## Overview

This guide provides detailed information about integrating with the Payment Microservice. The service supports both one-time payments and subscription-based payments through Razorpay.

## Payment Flows

### One-Time Payment Flow

1. **Create Order**
   ```http
   POST /api/payment/create-order
   Content-Type: application/json

   {
     "amount": 1000,
     "currency": "INR",
     "notes": {
       "order_reference": "ORDER_123"
     }
   }
   ```
   Response:
   ```json
   {
     "status": "success",
     "payment": {
       "order_id": "order_xyz123",
       "amount": 1000,
       "currency": "INR",
       "status": "created"
     }
   }
   ```

2. **Process Payment**
   - Use the `order_id` from step 1 to initialize Razorpay checkout
   - The checkout will handle the payment processing
   - After successful payment, Razorpay will return payment details

3. **Verify Payment**
   ```http
   POST /api/payment/verify-payment
   Content-Type: application/json

   {
     "order_id": "order_xyz123",
     "razorpay_payment_id": "pay_abc123",
     "razorpay_order_id": "order_xyz123",
     "razorpay_signature": "signature_xyz"
   }
   ```
   Response:
   ```json
   {
     "status": "success",
     "payment": {
       "order_id": "order_xyz123",
       "payment_id": "pay_abc123",
       "status": "success",
       "amount": 1000,
       "currency": "INR"
     }
   }
   ```

### Subscription Payment Flow

1. **Create Subscription Plan** (Admin Only)
   ```http
   POST /api/payment/create-plan
   Content-Type: application/json

   {
     "name": "Premium Plan",
     "amount": 2999,
     "billing_interval": 1,
     "period": "monthly",
     "gateway": "razorpay",
     "metadata": {
       "features": ["premium_content", "ad_free", "support"],
       "description": "Our premium subscription plan"
     }
   }
   ```
   Response:
   ```json
   {
     "status": "success",
     "plan": {
       "plan_id": "plan_xyz123",
       "name": "Premium Plan",
       "amount": 2999,
       "period": "monthly"
     }
   }
   ```

2. **Create Subscription**
   ```http
   POST /api/payment/subscribe
   Content-Type: application/json

   {
     "planId": "plan_xyz123",
     "gateway": "razorpay",
     "customer": {
       "name": "John Doe",
       "email": "john@example.com",
       "contact": "9876543210"
     }
   }
   ```
   Response:
   ```json
   {
     "status": "success",
     "subscription": {
       "subscription_id": "sub_xyz123",
       "plan_id": "plan_xyz123",
       "status": "pending"
     }
   }
   ```

3. **Process Initial Payment**
   - Use the subscription ID to create a payment order
   - Initialize Razorpay checkout with the order details
   - Process the payment through Razorpay

4. **Verify Subscription Payment**
   ```http
   POST /api/payment/verify-subscription-payment
   Content-Type: application/json

   {
     "subscription_id": "sub_xyz123",
     "order_id": "order_xyz123",
     "razorpay_payment_id": "pay_abc123",
     "razorpay_order_id": "order_xyz123",
     "razorpay_signature": "signature_xyz"
   }
   ```
   Response:
   ```json
   {
     "status": "success",
     "subscription": {
       "subscription_id": "sub_xyz123",
       "status": "active",
       "next_billing_date": "2024-04-01T00:00:00.000Z"
     }
   }
   ```

5. **Check Subscription Status**
   ```http
   GET /api/payment/subscription/{subscription_id}
   ```
   Response:
   ```json
   {
     "status": "success",
     "subscription": {
       "subscription_id": "sub_xyz123",
       "status": "active",
       "plan": {
         "name": "Premium Plan",
         "amount": 2999,
         "period": "monthly"
       },
       "next_billing_date": "2024-04-01T00:00:00.000Z",
       "current_period_start": "2024-03-01T00:00:00.000Z",
       "current_period_end": "2024-04-01T00:00:00.000Z"
     }
   }
   ```

6. **Cancel Subscription**
   ```http
   POST /api/payment/cancel-subscription
   Content-Type: application/json

   {
     "subscription_id": "sub_xyz123"
   }
   ```
   Response:
   ```json
   {
     "status": "success",
     "subscription": {
       "subscription_id": "sub_xyz123",
       "status": "cancelled",
       "cancelled_at": "2024-03-15T10:00:00.000Z"
     }
   }
   ```

## API Endpoints

### Payment Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payment/create-order` | POST | Create a new payment order |
| `/api/payment/verify-payment` | POST | Verify a payment |
| `/api/payment/payment-status/{order_id}` | GET | Check payment status |

### Subscription Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payment/create-plan` | POST | Create a subscription plan (Admin) |
| `/api/payment/subscribe` | POST | Create a new subscription |
| `/api/payment/verify-subscription-payment` | POST | Verify subscription payment |
| `/api/payment/subscription/{subscription_id}` | GET | Get subscription details |
| `/api/payment/cancel-subscription` | POST | Cancel a subscription |

## Error Handling

All API endpoints return responses in the following format:

```json
{
  "status": "error",
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Validation error message"
    }
  ]
}
```

Common HTTP Status Codes:
- 200: Success
- 400: Bad Request (Validation Error)
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Webhooks

The service supports webhooks for payment and subscription events. Configure the following webhook endpoints in your Razorpay dashboard:

1. **Payment Webhook**
   - URL: `{your_domain}/api/payment/webhook`
   - Events: `payment.authorized`, `payment.failed`

2. **Subscription Webhook**
   - URL: `{your_domain}/api/payment/subscription-webhook`
   - Events: `subscription.activated`, `subscription.cancelled`, `subscription.charged`

### Webhook Payload Example

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
        "order_id": "order_xyz123"
      }
    }
  }
}
```

## Best Practices

1. **Error Handling**
   - Always implement proper error handling for API responses
   - Check for both HTTP status codes and response status
   - Implement retry logic for failed payments

2. **Security**
   - Always verify Razorpay signatures for webhooks
   - Use HTTPS for all API calls
   - Implement proper authentication for API endpoints

3. **Testing**
   - Use Razorpay test mode for development
   - Test all payment scenarios (success, failure, cancellation)
   - Verify webhook handling

4. **Monitoring**
   - Monitor payment success rates
   - Track subscription status changes
   - Set up alerts for failed payments

## Support

For any integration issues or questions, please contact:
- Email: support@example.com
- Documentation: https://docs.example.com/payment
- API Reference: https://api.example.com/docs 