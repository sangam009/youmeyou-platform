const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const PhonePeGateway = require('../../../src/services/gateways/phonepe.gateway');

describe('PhonePe Gateway', () => {
  let gateway;
  let sandbox;

  beforeEach(() => {
    // Create a test configuration
    const config = {
      merchant_id: 'TEST_MERCHANT',
      salt_key: 'TEST_SALT',
      salt_index: '1',
      base_url: 'https://api.phonepe.com/apis/hermes'
    };

    gateway = new PhonePeGateway(config);
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
        callback_url: 'https://example.com/callback',
        mobile_number: '1234567890'
      };

      const mockResponse = {
        data: {
          data: {
            instrumentResponse: {
              redirectInfo: {
                url: 'https://phonepe.com/pay'
              }
            }
          }
        }
      };

      axios.post.resolves(mockResponse);

      const result = await gateway.createOrder(orderData);

      expect(result).to.have.property('order_id');
      expect(result.amount).to.equal(100);
      expect(result.currency).to.equal('INR');
      expect(result.status).to.equal('created');
      expect(result.payment_url).to.equal('https://phonepe.com/pay');
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
        expect(error.message).to.equal('Failed to create PhonePe order');
      }
    });
  });

  describe('verifyPayment', () => {
    it('should verify a payment successfully', async () => {
      const paymentData = {
        merchantTransactionId: 'TEST_ORDER_123'
      };

      const mockResponse = {
        data: {
          data: {
            state: 'COMPLETED'
          }
        }
      };

      axios.get.resolves(mockResponse);

      const result = await gateway.verifyPayment(paymentData);

      expect(result.payment_id).to.equal('TEST_ORDER_123');
      expect(result.status).to.equal('completed');
    });

    it('should handle failed payment verification', async () => {
      const paymentData = {
        merchantTransactionId: 'TEST_ORDER_123'
      };

      const mockResponse = {
        data: {
          data: {
            state: 'FAILED'
          }
        }
      };

      axios.get.resolves(mockResponse);

      const result = await gateway.verifyPayment(paymentData);

      expect(result.payment_id).to.equal('TEST_ORDER_123');
      expect(result.status).to.equal('failed');
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const orderId = 'TEST_ORDER_123';

      const mockResponse = {
        data: {
          data: {
            state: 'COMPLETED'
          }
        }
      };

      axios.get.resolves(mockResponse);

      const result = await gateway.getPaymentStatus(orderId);

      expect(result.payment_id).to.equal(orderId);
      expect(result.status).to.equal('completed');
    });
  });

  describe('processWebhook', () => {
    it('should process webhook successfully', async () => {
      const eventData = {
        merchantTransactionId: 'TEST_ORDER_123',
        state: 'COMPLETED'
      };

      const result = await gateway.processWebhook(eventData);

      expect(result.payment_id).to.equal('TEST_ORDER_123');
      expect(result.status).to.equal('completed');
    });
  });

  describe('initiateRefund', () => {
    it('should initiate refund successfully', async () => {
      const refundData = {
        payment_id: 'TEST_ORDER_123',
        amount: 100,
        user_id: 'TEST_USER'
      };

      const mockResponse = {
        data: {
          data: {
            merchantTransactionId: 'REFUND_123'
          }
        }
      };

      axios.post.resolves(mockResponse);

      const result = await gateway.initiateRefund(refundData);

      expect(result.refund_id).to.equal('REFUND_123');
      expect(result.payment_id).to.equal('TEST_ORDER_123');
      expect(result.amount).to.equal(100);
      expect(result.status).to.equal('pending');
    });
  });

  describe('subscription methods', () => {
    it('should throw error for createPlan', async () => {
      try {
        await gateway.createPlan({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('PhonePe does not support subscription plans');
      }
    });

    it('should throw error for createSubscription', async () => {
      try {
        await gateway.createSubscription({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('PhonePe does not support subscriptions');
      }
    });

    it('should throw error for cancelSubscription', async () => {
      try {
        await gateway.cancelSubscription('TEST_SUB');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('PhonePe does not support subscriptions');
      }
    });

    it('should throw error for renewSubscription', async () => {
      try {
        await gateway.renewSubscription('TEST_SUB');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('PhonePe does not support subscriptions');
      }
    });
  });
}); 