const crypto = require('crypto');
const logger = require('../utils/logger');
const paymentModel = require('../models/payment.model');
const subscriptionModel = require('../models/subscription.model');
const orderModel = require('../models/order.model');
const firebase = require('../utils/firebase');
const paymentConfig = require('../config/payment-config');

class WebhookService {
  constructor() {
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} - Whether signature is valid
   */
  verifyWebhook(payload, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Error verifying webhook signature', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Process payment webhook
   * @param {string} event - Event type
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async processPaymentWebhook(event, payload) {
    try {
      logger.info('Processing payment webhook', { event, payload });

      const payment = payload.payment.entity;
      
      // Update payment status in database
      await paymentModel.updatePaymentStatus(
        payment.id,
        this.mapPaymentStatus(payment.status),
        payment.error_description
      );

      // Update order status if exists
      if (payment.order_id) {
        await orderModel.updateOrderStatus(
          payment.order_id,
          this.mapOrderStatus(payment.status)
        );
      }

      // Prepare event data for Firebase
      const eventData = {
        payment_id: payment.id,
        order_id: payment.order_id,
        status: this.mapPaymentStatus(payment.status),
        amount: payment.amount / 100, // Convert from paise to rupees
        currency: payment.currency,
        method: payment.method,
        error_code: payment.error_code,
        error_description: payment.error_description,
        created_at: new Date(payment.created_at * 1000).toISOString(),
        updated_at: new Date().toISOString()
      };

      // Broadcast status update through Firebase
      await this.broadcastPaymentEvent(event, eventData);

      return {
        status: 'success',
        message: 'Payment webhook processed successfully'
      };
    } catch (error) {
      logger.error('Error processing payment webhook', {
        error: error.message,
        stack: error.stack,
        event,
        payload
      });

      // Store failed event for retry
      await this.storeFailedEvent('payment', event, payload, error);

      return {
        status: 'error',
        message: 'Error processing payment webhook',
        error: error.message
      };
    }
  }

  /**
   * Process subscription webhook
   * @param {string} event - Event type
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async processSubscriptionWebhook(event, payload) {
    try {
      logger.info('Processing subscription webhook', { event, payload });

      const subscription = payload.subscription.entity;
      
      // Update subscription status in database
      await subscriptionModel.updateSubscriptionStatus(
        subscription.id,
        this.mapSubscriptionStatus(subscription.status)
      );

      // Handle subscription charged event
      if (event === 'subscription.charged' && payload.payment) {
        await this.handleSubscriptionCharged(subscription);
      }

      // Prepare event data for Firebase
      const eventData = {
        subscription_id: subscription.id,
        plan_id: subscription.plan_id,
        status: this.mapSubscriptionStatus(subscription.status),
        current_start: new Date(subscription.current_start * 1000).toISOString(),
        current_end: new Date(subscription.current_end * 1000).toISOString(),
        created_at: new Date(subscription.created_at * 1000).toISOString(),
        updated_at: new Date().toISOString()
      };

      // Broadcast status update through Firebase
      await this.broadcastSubscriptionEvent(event, eventData);

      return {
        status: 'success',
        message: 'Subscription webhook processed successfully'
      };
    } catch (error) {
      logger.error('Error processing subscription webhook', {
        error: error.message,
        stack: error.stack,
        event,
        payload
      });

      // Store failed event for retry
      await this.storeFailedEvent('subscription', event, payload, error);

      return {
        status: 'error',
        message: 'Error processing subscription webhook',
        error: error.message
      };
    }
  }

  /**
   * Handle subscription activated event
   * @param {Object} subscription - Subscription data
   */
  async handleSubscriptionActivated(subscription) {
    // Update next billing date
    await subscriptionModel.updateNextBillingDate(
      subscription.id,
      new Date(subscription.current_end * 1000)
    );
  }

  /**
   * Handle subscription cancelled event
   * @param {Object} subscription - Subscription data
   */
  async handleSubscriptionCancelled(subscription) {
    // Update subscription end date
    await subscriptionModel.updateSubscriptionEndDate(
      subscription.id,
      new Date(subscription.ended_at * 1000)
    );
  }

  /**
   * Handle subscription charged event
   * @param {Object} subscription - Subscription data
   */
  async handleSubscriptionCharged(subscription) {
    // Create payment record for the charge
    await paymentModel.createPayment({
      subscription_id: subscription.id,
      amount: subscription.amount,
      currency: 'INR',
      status: 'success',
      type: 'subscription',
      gateway: 'razorpay',
      transaction_id: `sub_${subscription.id}_${Date.now()}`
    });
  }

  /**
   * Broadcast payment event through Firebase
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  async broadcastPaymentEvent(event, data) {
    try {
      // Update payment status in real-time
      await firebase.database().ref(`payments/${data.payment_id}`).update({
        ...data,
        last_event: event,
        updated_at: new Date().toISOString()
      });

      // Add to events log
      await firebase.database().ref(`events/payments`).push({
        event,
        data,
        timestamp: new Date().toISOString()
      });

      logger.info('Payment event broadcasted', { event, payment_id: data.payment_id });
    } catch (error) {
      logger.error('Error broadcasting payment event', {
        error: error.message,
        event,
        data
      });
    }
  }

  /**
   * Broadcast subscription event through Firebase
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  async broadcastSubscriptionEvent(event, data) {
    try {
      // Update subscription status in real-time
      await firebase.database().ref(`subscriptions/${data.subscription_id}`).update({
        ...data,
        last_event: event,
        updated_at: new Date().toISOString()
      });

      // Add to events log
      await firebase.database().ref(`events/subscriptions`).push({
        event,
        data,
        timestamp: new Date().toISOString()
      });

      logger.info('Subscription event broadcasted', { event, subscription_id: data.subscription_id });
    } catch (error) {
      logger.error('Error broadcasting subscription event', {
        error: error.message,
        event,
        data
      });
    }
  }

  /**
   * Store failed event for retry
   * @param {string} type - Event type (payment/subscription)
   * @param {string} event - Event name
   * @param {Object} payload - Event payload
   * @param {Error} error - Error object
   */
  async storeFailedEvent(type, event, payload, error) {
    try {
      await firebase.database().ref(`failed_events/${type}`).push({
        event,
        payload,
        error: {
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date().toISOString(),
        retry_count: 0
      });

      logger.info('Failed event stored for retry', { type, event });
    } catch (error) {
      logger.error('Error storing failed event', {
        error: error.message,
        type,
        event
      });
    }
  }

  /**
   * Map Razorpay payment status to internal status
   * @param {string} status - Razorpay status
   * @returns {string} - Internal status
   */
  mapPaymentStatus(status) {
    const statusMap = {
      'authorized': 'authorized',
      'captured': 'success',
      'failed': 'failed',
      'refunded': 'refunded'
    };
    return statusMap[status] || status;
  }

  /**
   * Map Razorpay order status to internal status
   * @param {string} status - Razorpay status
   * @returns {string} - Internal status
   */
  mapOrderStatus(status) {
    const statusMap = {
      'authorized': 'pending',
      'captured': 'completed',
      'failed': 'failed',
      'refunded': 'refunded'
    };
    return statusMap[status] || status;
  }

  /**
   * Map Razorpay subscription status to internal status
   * @param {string} status - Razorpay status
   * @returns {string} - Internal status
   */
  mapSubscriptionStatus(status) {
    const statusMap = {
      'created': 'pending',
      'authenticated': 'authenticated',
      'active': 'active',
      'cancelled': 'cancelled',
      'completed': 'completed',
      'expired': 'expired'
    };
    return statusMap[status] || status;
  }
}

module.exports = new WebhookService(); 