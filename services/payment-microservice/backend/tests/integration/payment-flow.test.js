const request = require('supertest');
const app = require('../../src/app');
const { expect } = require('chai');
const crypto = require('crypto');
const Razorpay = require('razorpay');

describe('Payment Flow Integration Tests', () => {
  let razorpay;
  let testOrderId;
  let testPaymentId;
  let testSignature;
  let testPlanId;
  let testSubscriptionId;

  before(() => {
    // Initialize Razorpay with test credentials
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_wsmyEOUbhu4SYa',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'TeKWGYmMpmvaRLhfPU6el15s'
    });
  });

  describe('One-Time Payment Flow', () => {
    it('should create a payment order', async () => {
      const response = await request(app)
        .post('/api/payment/create-order')
        .send({
          amount: 1000,
          currency: 'INR',
          gateway: 'razorpay'
        })
        .set('Cookie', ['connect.sid=test-session-id']);

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal('success');
      expect(response.body.payment).to.have.property('order_id');
      testOrderId = response.body.payment.order_id;
    });

    it('should verify a successful payment', async () => {
      // Simulate a successful payment
      const payment = await razorpay.payments.create({
        amount: 1000 * 100,
        currency: 'INR',
        order_id: testOrderId,
        method: 'card',
        card: {
          number: '4111111111111111',
          expiry_month: '12',
          expiry_year: '24',
          cvv: '123'
        }
      });

      testPaymentId = payment.id;

      // Generate signature
      const body = `${testOrderId}|${testPaymentId}`;
      testSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'TeKWGYmMpmvaRLhfPU6el15s')
        .update(body)
        .digest('hex');

      const response = await request(app)
        .post('/api/payment/verify-payment')
        .send({
          order_id: testOrderId,
          razorpay_payment_id: testPaymentId,
          razorpay_order_id: testOrderId,
          razorpay_signature: testSignature
        })
        .set('Cookie', ['connect.sid=test-session-id']);

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal('success');
    });
  });

  describe('Subscription Flow', () => {
    it('should create a subscription plan', async () => {
      const response = await request(app)
        .post('/api/payment/create-plan')
        .send({
          name: 'Test Plan',
          amount: 1000,
          interval: 1,
          period: 'monthly',
          gateway: 'razorpay'
        })
        .set('Cookie', ['connect.sid=test-session-id']);

      expect(response.status).to.equal(201);
      expect(response.body.status).to.equal('success');
      expect(response.body.plan).to.have.property('plan_id');
      testPlanId = response.body.plan.plan_id;
    });

    it('should create a subscription', async () => {
      const response = await request(app)
        .post('/api/payment/subscribe')
        .send({
          planId: testPlanId,
          gateway: 'razorpay',
          customer: {
            name: 'Test User',
            email: 'test@example.com',
            contact: '9876543210'
          }
        })
        .set('Cookie', ['connect.sid=test-session-id']);

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal('success');
      expect(response.body.subscription).to.have.property('subscription_id');
      testSubscriptionId = response.body.subscription.subscription_id;
    });

    it('should verify subscription payment', async () => {
      // Create a payment for the subscription
      const payment = await razorpay.payments.create({
        amount: 1000 * 100,
        currency: 'INR',
        method: 'card',
        card: {
          number: '4111111111111111',
          expiry_month: '12',
          expiry_year: '24',
          cvv: '123'
        }
      });

      testPaymentId = payment.id;

      // Generate signature
      const body = `${testOrderId}|${testPaymentId}`;
      testSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'TeKWGYmMpmvaRLhfPU6el15s')
        .update(body)
        .digest('hex');

      const response = await request(app)
        .post('/api/payment/verify-subscription-payment')
        .send({
          subscription_id: testSubscriptionId,
          order_id: testOrderId,
          razorpay_payment_id: testPaymentId,
          razorpay_order_id: testOrderId,
          razorpay_signature: testSignature
        })
        .set('Cookie', ['connect.sid=test-session-id']);

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal('success');
    });
  });

  describe('Webhook Handling', () => {
    it('should handle payment webhook', async () => {
      const webhookPayload = {
        event: 'payment.authorized',
        payload: {
          payment: {
            entity: {
              id: testPaymentId,
              amount: 1000 * 100,
              currency: 'INR',
              status: 'authorized',
              order_id: testOrderId,
              method: 'card',
              captured: false,
              description: 'Test payment',
              email: 'test@example.com',
              contact: '9876543210',
              notes: {
                order_reference: 'ORDER_123'
              },
              created_at: Math.floor(Date.now() / 1000)
            }
          }
        }
      };

      // Generate webhook signature
      const webhookSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret')
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .send(webhookPayload)
        .set('X-Razorpay-Signature', webhookSignature);

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal('success');
    });

    it('should handle subscription webhook', async () => {
      const webhookPayload = {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: {
              id: testSubscriptionId,
              plan_id: testPlanId,
              status: 'active',
              current_start: Math.floor(Date.now() / 1000),
              current_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
              ended_at: null,
              quantity: 1,
              notes: {
                user_name: 'Test User'
              },
              charge_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
              start_at: Math.floor(Date.now() / 1000),
              end_at: null,
              auth_attempts: 0,
              total_count: 12,
              paid_count: 1,
              customer_notify: true,
              created_at: Math.floor(Date.now() / 1000)
            }
          }
        }
      };

      // Generate webhook signature
      const webhookSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret')
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      const response = await request(app)
        .post('/api/payment/webhook/razorpay/subscription')
        .send(webhookPayload)
        .set('X-Razorpay-Signature', webhookSignature);

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal('success');
    });
  });
}); 