/**
 * Payment Gateway Interface
 * 
 * This file defines the interface that all payment gateways must implement.
 * Each gateway provider (Razorpay, PhonePe, etc.) should extend this class
 * and implement these methods according to their specific APIs.
 */

class PaymentGateway {
  /**
   * Initialize the gateway with configuration
   * @param {Object} config - Gateway-specific configuration
   */
  constructor(config) {
    if (this.constructor === PaymentGateway) {
      throw new Error("PaymentGateway is an abstract class and cannot be instantiated directly");
    }
    
    this.config = config;
  }

  /**
   * Create a payment order
   * @param {Object} orderData - Order information
   * @returns {Promise<Object>} - Created order details
   */
  async createOrder(orderData) {
    throw new Error("Method 'createOrder' must be implemented");
  }

  /**
   * Verify a payment
   * @param {Object} paymentData - Payment verification data
   * @returns {Promise<Object>} - Verification result
   */
  async verifyPayment(paymentData) {
    throw new Error("Method 'verifyPayment' must be implemented");
  }

  /**
   * Get payment status
   * @param {string} orderId - Order ID to check
   * @returns {Promise<Object>} - Payment status details
   */
  async getPaymentStatus(orderId) {
    throw new Error("Method 'getPaymentStatus' must be implemented");
  }

  /**
   * Create a subscription plan
   * @param {Object} planData - Plan information
   * @returns {Promise<Object>} - Created plan details
   */
  async createPlan(planData) {
    throw new Error("Method 'createPlan' must be implemented");
  }

  /**
   * Create a subscription for a customer
   * @param {Object} subscriptionData - Subscription information
   * @returns {Promise<Object>} - Created subscription details
   */
  async createSubscription(subscriptionData) {
    throw new Error("Method 'createSubscription' must be implemented");
  }

  /**
   * Process a webhook event
   * @param {Object} eventData - Webhook event data
   * @returns {Promise<Object>} - Processed event result
   */
  async processWebhook(eventData) {
    throw new Error("Method 'processWebhook' must be implemented");
  }

  /**
   * Initiate a refund
   * @param {Object} refundData - Refund information
   * @returns {Promise<Object>} - Refund details
   */
  async initiateRefund(refundData) {
    throw new Error("Method 'initiateRefund' must be implemented");
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Subscription ID to cancel
   * @returns {Promise<Object>} - Cancellation result
   */
  async cancelSubscription(subscriptionId) {
    throw new Error("Method 'cancelSubscription' must be implemented");
  }

  /**
   * Renew a subscription
   * @param {string} subscriptionId - Subscription ID to renew
   * @returns {Promise<Object>} - Renewal result
   */
  async renewSubscription(subscriptionId) {
    throw new Error("Method 'renewSubscription' must be implemented");
  }
}

module.exports = PaymentGateway; 