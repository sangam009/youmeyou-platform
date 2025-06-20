const PaymentGateway = require('./gateway.interface');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Cashfree Gateway Implementation
 * Implements the PaymentGateway interface for Cashfree
 */
class CashfreeGateway extends PaymentGateway {
  constructor(config) {
    super(config);
    
    // Initialize Cashfree client
    this.appId = config.app_id || process.env.CASHFREE_APP_ID;
    this.secretKey = config.secret_key || process.env.CASHFREE_SECRET_KEY;
    this.baseUrl = config.base_url || 'https://api.cashfree.com/pg';
    this.env = config.env || 'PRODUCTION';
    
    // Store config for later use
    this.config = config;
  }

  /**
   * Generate signature for Cashfree API
   * @private
   */
  _generateSignature(data) {
    const signature = crypto.createHmac('sha256', this.secretKey);
    signature.update(data);
    return signature.digest('hex');
  }

  /**
   * Create a payment order
   * @param {Object} orderData - Order information
   * @returns {Promise<Object>} - Created order details
   */
  async createOrder(orderData) {
    try {
      const payload = {
        order_id: orderData.order_id || `ORDER_${Date.now()}`,
        order_amount: orderData.amount,
        order_currency: orderData.currency || 'INR',
        order_note: orderData.note || 'Payment for order',
        customer_details: {
          customer_id: orderData.customer_id,
          customer_email: orderData.customer_email,
          customer_phone: orderData.customer_phone
        },
        order_meta: {
          return_url: orderData.redirect_url
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/orders`,
        payload,
        {
          headers: {
            'x-api-version': '2022-09-01',
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey
          }
        }
      );

      return {
        order_id: response.data.order_id,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        status: 'created',
        payment_url: response.data.payment_link
      };
    } catch (error) {
      logger.error('Error creating Cashfree order:', error);
      throw new Error('Failed to create Cashfree order');
    }
  }

  /**
   * Verify a payment
   * @param {Object} paymentData - Payment verification data
   * @returns {Promise<Object>} - Verification result
   */
  async verifyPayment(paymentData) {
    try {
      const { order_id } = paymentData;
      const response = await axios.get(
        `${this.baseUrl}/orders/${order_id}`,
        {
          headers: {
            'x-api-version': '2022-09-01',
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey
          }
        }
      );

      return {
        payment_id: response.data.order_id,
        status: response.data.order_status === 'PAID' ? 'completed' : 'failed',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error verifying Cashfree payment:', error);
      throw new Error('Failed to verify Cashfree payment');
    }
  }

  /**
   * Get payment status
   * @param {string} orderId - Order ID to check
   * @returns {Promise<Object>} - Payment status details
   */
  async getPaymentStatus(orderId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/orders/${orderId}`,
        {
          headers: {
            'x-api-version': '2022-09-01',
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey
          }
        }
      );

      return {
        payment_id: response.data.order_id,
        status: response.data.order_status === 'PAID' ? 'completed' : 'failed',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error getting Cashfree payment status:', error);
      throw new Error('Failed to get Cashfree payment status');
    }
  }

  /**
   * Process a webhook event
   * @param {Object} eventData - Webhook event data
   * @returns {Promise<Object>} - Processed event result
   */
  async processWebhook(eventData) {
    try {
      const signature = eventData.signature;
      const data = eventData.data;
      
      // Verify webhook signature
      const computedSignature = this._generateSignature(JSON.stringify(data));
      if (computedSignature !== signature) {
        throw new Error('Invalid webhook signature');
      }

      return {
        payment_id: data.order.order_id,
        status: data.order.order_status === 'PAID' ? 'completed' : 'failed',
        gateway_response: data
      };
    } catch (error) {
      logger.error('Error processing Cashfree webhook:', error);
      if (error.message === 'Invalid webhook signature') {
        throw error;
      }
      throw new Error('Failed to process Cashfree webhook');
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
        order_id: refundData.payment_id,
        refund_amount: refundData.amount,
        refund_note: refundData.note || 'Refund for payment'
      };

      const response = await axios.post(
        `${this.baseUrl}/orders/${refundData.payment_id}/refunds`,
        payload,
        {
          headers: {
            'x-api-version': '2022-09-01',
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey
          }
        }
      );

      return {
        refund_id: response.data.refund_id,
        payment_id: refundData.payment_id,
        amount: refundData.amount,
        status: 'pending',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error initiating Cashfree refund:', error);
      throw new Error('Failed to initiate Cashfree refund');
    }
  }

  /**
   * Create a subscription plan
   * @param {Object} planData - Plan information
   * @returns {Promise<Object>} - Created plan details
   */
  async createPlan(planData) {
    try {
      const payload = {
        plan_id: planData.plan_id || `PLAN_${Date.now()}`,
        plan_name: planData.name,
        type: planData.type || 'PERIODIC',
        amount: planData.amount,
        interval: planData.interval || 'MONTH',
        description: planData.description
      };

      const response = await axios.post(
        `${this.baseUrl}/plans`,
        payload,
        {
          headers: {
            'x-api-version': '2022-09-01',
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey
          }
        }
      );

      return {
        plan_id: response.data.plan_id,
        status: 'active',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error creating Cashfree plan:', error);
      throw new Error('Failed to create Cashfree plan');
    }
  }

  /**
   * Create a subscription
   * @param {Object} subscriptionData - Subscription information
   * @returns {Promise<Object>} - Created subscription details
   */
  async createSubscription(subscriptionData) {
    try {
      const payload = {
        subscription_id: subscriptionData.subscription_id || `SUB_${Date.now()}`,
        plan_id: subscriptionData.plan_id,
        customer_details: {
          customer_id: subscriptionData.customer_id,
          customer_email: subscriptionData.customer_email,
          customer_phone: subscriptionData.customer_phone
        },
        subscription_note: subscriptionData.note || 'Subscription created'
      };

      const response = await axios.post(
        `${this.baseUrl}/subscriptions`,
        payload,
        {
          headers: {
            'x-api-version': '2022-09-01',
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey
          }
        }
      );

      return {
        subscription_id: response.data.subscription_id,
        status: 'active',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error creating Cashfree subscription:', error);
      throw new Error('Failed to create Cashfree subscription');
    }
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Subscription ID to cancel
   * @returns {Promise<Object>} - Cancellation result
   */
  async cancelSubscription(subscriptionId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/subscriptions/${subscriptionId}/cancel`,
        {},
        {
          headers: {
            'x-api-version': '2022-09-01',
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey
          }
        }
      );

      return {
        subscription_id: subscriptionId,
        status: 'cancelled',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error cancelling Cashfree subscription:', error);
      throw new Error('Failed to cancel Cashfree subscription');
    }
  }

  /**
   * Renew a subscription
   * @param {string} subscriptionId - Subscription ID to renew
   * @returns {Promise<Object>} - Renewal result
   */
  async renewSubscription(subscriptionId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/subscriptions/${subscriptionId}/renew`,
        {},
        {
          headers: {
            'x-api-version': '2022-09-01',
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey
          }
        }
      );

      return {
        subscription_id: subscriptionId,
        status: 'active',
        gateway_response: response.data
      };
    } catch (error) {
      logger.error('Error renewing Cashfree subscription:', error);
      throw new Error('Failed to renew Cashfree subscription');
    }
  }
}

module.exports = CashfreeGateway; 