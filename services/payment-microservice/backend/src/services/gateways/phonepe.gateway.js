const PaymentGateway = require('./gateway.interface');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * PhonePe Gateway Implementation
 * Implements the PaymentGateway interface for PhonePe
 */
class PhonePeGateway extends PaymentGateway {
  constructor(config) {
    super(config);
    
    // Initialize PhonePe client
    this.merchantId = config.merchant_id || process.env.PHONEPE_MERCHANT_ID;
    this.saltKey = config.salt_key || process.env.PHONEPE_SALT_KEY;
    this.saltIndex = config.salt_index || process.env.PHONEPE_SALT_INDEX;
    this.baseUrl = config.base_url || 'https://api.phonepe.com/apis/hermes';
    
    // Store config for later use
    this.config = config;
  }

  /**
   * Generate SHA256 hash for PhonePe API
   * @private
   */
  _generateHash(data) {
    const hash = crypto.createHash('sha256');
    hash.update(data + this.saltKey);
    return hash.digest('hex');
  }

  /**
   * Create a payment order
   * @param {Object} orderData - Order information
   * @returns {Promise<Object>} - Created order details
   */
  async createOrder(orderData) {
    try {
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: orderData.order_id || `ORDER_${Date.now()}`,
        amount: orderData.amount * 100, // Convert to paise
        redirectUrl: orderData.redirect_url,
        redirectMode: 'POST',
        callbackUrl: orderData.callback_url,
        mobileNumber: orderData.mobile_number,
        paymentInstrument: {
          type: 'PAY_PAGE'
        }
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const hash = this._generateHash(base64Payload + '/pg/v1/pay');

      const response = await axios.post(
        `${this.baseUrl}/pg/v1/pay`,
        {
          request: base64Payload
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': `${hash}###${this.saltIndex}`
          }
        }
      );

      return {
        order_id: payload.merchantTransactionId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        status: 'created',
        payment_url: response.data.data.instrumentResponse.redirectInfo.url
      };
    } catch (error) {
      logger.error('Error creating PhonePe order:', error);
      throw new Error('Failed to create PhonePe order');
    }
  }

  /**
   * Verify a payment
   * @param {Object} paymentData - Payment verification data
   * @returns {Promise<Object>} - Verification result
   */
  async verifyPayment(paymentData) {
    try {
      const { merchantTransactionId } = paymentData;
      const hash = this._generateHash(`/pg/v1/status/${this.merchantId}/${merchantTransactionId}`);

      const response = await axios.get(
        `${this.baseUrl}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': `${hash}###${this.saltIndex}`
          }
        }
      );

      const paymentStatus = response.data.data.state;
      return {
        payment_id: merchantTransactionId,
        status: paymentStatus === 'COMPLETED' ? 'completed' : 'failed',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error verifying PhonePe payment:', error);
      throw new Error('Failed to verify PhonePe payment');
    }
  }

  /**
   * Get payment status
   * @param {string} orderId - Order ID to check
   * @returns {Promise<Object>} - Payment status details
   */
  async getPaymentStatus(orderId) {
    try {
      const hash = this._generateHash(`/pg/v1/status/${this.merchantId}/${orderId}`);

      const response = await axios.get(
        `${this.baseUrl}/pg/v1/status/${this.merchantId}/${orderId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': `${hash}###${this.saltIndex}`
          }
        }
      );

      const paymentStatus = response.data.data.state;
      return {
        payment_id: orderId,
        status: paymentStatus === 'COMPLETED' ? 'completed' : 'failed',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error getting PhonePe payment status:', error);
      throw new Error('Failed to get PhonePe payment status');
    }
  }

  /**
   * Process a webhook event
   * @param {Object} eventData - Webhook event data
   * @returns {Promise<Object>} - Processed event result
   */
  async processWebhook(eventData) {
    try {
      const { merchantTransactionId, state } = eventData;
      
      return {
        payment_id: merchantTransactionId,
        status: state === 'COMPLETED' ? 'completed' : 'failed',
        gateway_response: eventData
      };
    } catch (error) {
      logger.error('Error processing PhonePe webhook:', error);
      throw new Error('Failed to process PhonePe webhook');
    }
  }

  /**
   * Initiate a refund
   * @param {Object} refundData - Refund information
   * @returns {Promise<Object>} - Refund details
   */
  async initiateRefund(refundData) {
    try {
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: refundData.payment_id,
        merchantUserId: refundData.user_id,
        amount: refundData.amount * 100, // Convert to paise
        callbackUrl: refundData.callback_url
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const hash = this._generateHash(base64Payload + '/pg/v1/refund');

      const response = await axios.post(
        `${this.baseUrl}/pg/v1/refund`,
        {
          request: base64Payload
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': `${hash}###${this.saltIndex}`
          }
        }
      );

      return {
        refund_id: response.data.data.merchantTransactionId,
        payment_id: refundData.payment_id,
        amount: refundData.amount,
        status: 'pending',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error initiating PhonePe refund:', error);
      throw new Error('Failed to initiate PhonePe refund');
    }
  }

  // Note: PhonePe doesn't support subscriptions, so these methods throw errors
  async createPlan() {
    throw new Error('PhonePe does not support subscription plans');
  }

  async createSubscription() {
    throw new Error('PhonePe does not support subscriptions');
  }

  async cancelSubscription() {
    throw new Error('PhonePe does not support subscriptions');
  }

  async renewSubscription() {
    throw new Error('PhonePe does not support subscriptions');
  }
}

module.exports = PhonePeGateway; 