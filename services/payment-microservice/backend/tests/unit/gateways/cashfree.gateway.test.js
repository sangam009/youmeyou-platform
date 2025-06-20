const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const CashfreeGateway = require('../../../src/services/gateways/cashfree.gateway');

describe('Cashfree Gateway', () => {
  let gateway;
  let sandbox;

  beforeEach(() => {
    // Create a test configuration
    const config = {
      app_id: 'TEST_APP_ID',
      secret_key: 'TEST_SECRET',
      base_url: 'https://api.cashfree.com/pg',
      env: 'TEST'
    };

    gateway = new CashfreeGateway(config);
    sandbox = sinon.createSandbox();
    sandbox.stub(axios, 'post');
    sandbox.stub(axios, 'get');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      const orderData = {
        amount: 100,
        currency: 'INR',
        redirect_url: 'https://example.com/redirect',
        customer_id: 'CUST_123',
        customer_email: 'test@example.com',
        customer_phone: '1234567890'
      };

      const mockResponse = {
        data: {
          order_id: 'ORDER_123',
          payment_link: 'https://cashfree.com/pay'
        }
      };

      axios.post.resolves(mockResponse);

      const result = await gateway.createOrder(orderData);

      expect(result.order_id).to.equal('ORDER_123');
      expect(result.amount).to.equal(100);
      expect(result.currency).to.equal('INR');
      expect(result.status).to.equal('created');
      expect(result.payment_url).to.equal('https://cashfree.com/pay');
    });

    it('should handle errors when creating an order', async () => {
      const orderData = {
        amount: 100,
        currency: 'INR'
      };

      axios.post.rejects(new Error('API Error'));

      try {
        await gateway.createOrder(orderData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to create Cashfree order');
      }
    });
  });

  describe('verifyPayment', () => {
    it('should verify a payment successfully', async () => {
      const paymentData = {
        order_id: 'ORDER_123'
      };

      const mockResponse = {
        data: {
          order_id: 'ORDER_123',
          order_status: 'PAID'
        }
      };

      axios.get.resolves(mockResponse);

      const result = await gateway.verifyPayment(paymentData);

      expect(result.payment_id).to.equal('ORDER_123');
      expect(result.status).to.equal('completed');
    });

    it('should handle failed payment verification', async () => {
      const paymentData = {
        order_id: 'ORDER_123'
      };

      const mockResponse = {
        data: {
          order_id: 'ORDER_123',
          order_status: 'FAILED'
        }
      };

      axios.get.resolves(mockResponse);

      const result = await gateway.verifyPayment(paymentData);

      expect(result.payment_id).to.equal('ORDER_123');
      expect(result.status).to.equal('failed');
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const orderId = 'ORDER_123';

      const mockResponse = {
        data: {
          order_id: 'ORDER_123',
          order_status: 'PAID'
        }
      };

      axios.get.resolves(mockResponse);

      const result = await gateway.getPaymentStatus(orderId);

      expect(result.payment_id).to.equal('ORDER_123');
      expect(result.status).to.equal('completed');
    });
  });

  describe('processWebhook', () => {
    it('should process webhook successfully with valid signature', async () => {
      const eventData = {
        signature: 'valid_signature',
        data: {
          order: {
            order_id: 'ORDER_123',
            order_status: 'PAID'
          }
        }
      };

      // Mock the signature verification
      sinon.stub(gateway, '_generateSignature').returns('valid_signature');

      const result = await gateway.processWebhook(eventData);

      expect(result.payment_id).to.equal('ORDER_123');
      expect(result.status).to.equal('completed');
    });

    it('should reject webhook with invalid signature', async () => {
      const eventData = {
        signature: 'invalid_signature',
        data: {
          order: {
            order_id: 'ORDER_123',
            order_status: 'PAID'
          }
        }
      };

      // Mock the signature verification
      sinon.stub(gateway, '_generateSignature').returns('valid_signature');

      try {
        await gateway.processWebhook(eventData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Invalid webhook signature');
      }
    });
  });

  describe('initiateRefund', () => {
    it('should initiate refund successfully', async () => {
      const refundData = {
        payment_id: 'ORDER_123',
        amount: 100,
        note: 'Test refund'
      };

      const mockResponse = {
        data: {
          refund_id: 'REFUND_123'
        }
      };

      axios.post.resolves(mockResponse);

      const result = await gateway.initiateRefund(refundData);

      expect(result.refund_id).to.equal('REFUND_123');
      expect(result.payment_id).to.equal('ORDER_123');
      expect(result.amount).to.equal(100);
      expect(result.status).to.equal('pending');
    });
  });

  describe('subscription methods', () => {
    it('should create a plan successfully', async () => {
      const planData = {
        name: 'Test Plan',
        amount: 100,
        interval: 'MONTH',
        description: 'Test subscription plan'
      };

      const mockResponse = {
        data: {
          plan_id: 'PLAN_123'
        }
      };

      axios.post.resolves(mockResponse);

      const result = await gateway.createPlan(planData);

      expect(result.plan_id).to.equal('PLAN_123');
      expect(result.status).to.equal('active');
    });

    it('should create a subscription successfully', async () => {
      const subscriptionData = {
        plan_id: 'PLAN_123',
        customer_id: 'CUST_123',
        customer_email: 'test@example.com',
        customer_phone: '1234567890'
      };

      const mockResponse = {
        data: {
          subscription_id: 'SUB_123'
        }
      };

      axios.post.resolves(mockResponse);

      const result = await gateway.createSubscription(subscriptionData);

      expect(result.subscription_id).to.equal('SUB_123');
      expect(result.status).to.equal('active');
    });

    it('should cancel a subscription successfully', async () => {
      const subscriptionId = 'SUB_123';

      const mockResponse = {
        data: {
          status: 'CANCELLED'
        }
      };

      axios.post.resolves(mockResponse);

      const result = await gateway.cancelSubscription(subscriptionId);

      expect(result.subscription_id).to.equal('SUB_123');
      expect(result.status).to.equal('cancelled');
    });

    it('should renew a subscription successfully', async () => {
      const subscriptionId = 'SUB_123';

      const mockResponse = {
        data: {
          status: 'ACTIVE'
        }
      };

      axios.post.resolves(mockResponse);

      const result = await gateway.renewSubscription(subscriptionId);

      expect(result.subscription_id).to.equal('SUB_123');
      expect(result.status).to.equal('active');
    });
  });
}); 