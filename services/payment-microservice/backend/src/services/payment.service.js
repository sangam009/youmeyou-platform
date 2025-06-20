const gatewayFactory = require('./gateway.factory');
const paymentModel = require('../models/payment.model');
const paymentConfig = require('../config/payment-config');
const logger = require('../utils/logger');
const subscriptionModel = require('../models/subscription.model');
const orderModel = require('../models/order.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Payment Service
 * Handles business logic for payment operations
 */
class PaymentService {
  /**
   * Create a payment order
   * @param {Object} orderData - Order information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Created order details
   */
  async createOrder(orderData, userId) {
    try {
      logger.info('Creating new payment order', { orderData, userId });
      
      // Validate order data
      if (!orderData.amount) {
        logger.error('Invalid order data: missing amount', { orderData });
        return { 
          status: 'error', 
          message: 'Amount is required' 
        };
      }
      
      // Set default values
      const gateway = orderData.gateway || paymentConfig.defaultGateway;
      const currency = orderData.currency || 'INR';
      
      // Get gateway handler
      const gatewayHandler = gatewayFactory.getGateway(gateway);
      if (!gatewayHandler) {
        logger.error('Unsupported payment gateway', { gateway });
        return { 
          status: 'error', 
          message: `Unsupported payment gateway: ${gateway}` 
        };
      }
      
      // Create gateway order
      const gatewayOrderResult = await gatewayHandler.createOrder({
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        method: orderData.method,
        flow: orderData.flow,
        notes: {
          ...orderData.notes,
          user_id: userId
        }
      });
      
      if (!gatewayOrderResult || (!gatewayOrderResult.order_id && !gatewayOrderResult.id)) {
        logger.error('Failed to create order in payment gateway', { gatewayOrderResult });
        return { 
          status: 'error', 
          message: 'Failed to create order in payment gateway' 
        };
      }
      
      const orderId = gatewayOrderResult.order_id || gatewayOrderResult.id;
      
      // First, create the order record
      const orderRecord = {
        order_id: orderId,
        user_id: userId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        status: 'created',
        gateway: 'razorpay',
        metadata: {
          gateway_data: gatewayOrderResult,
          source: orderData.notes?.source || 'test-page',
          method: orderData.method,
          subscription_id: orderData.notes?.subscription_id,
          plan_id: orderData.notes?.plan_id
        }
      };
      
      logger.info('Creating new order', { orderData: orderRecord });
      const order = await orderModel.createOrder(orderRecord);
      
      if (!order) {
        logger.error('Failed to create order record', { orderRecord });
        return { 
          status: 'error', 
          message: 'Failed to create order record' 
        };
      }
      
      logger.info('Order created successfully', { order_id: orderId, id: order.id });
      
      // Create payment record
      const paymentRecord = {
        order_id: orderId,
        user_id: userId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        status: 'pending',
        gateway: 'razorpay',
        metadata: {
          subscription_id: orderData.notes?.subscription_id,
          plan_id: orderData.notes?.plan_id
        }
      };
      
      const payment = await paymentModel.createPayment(paymentRecord);
      
      if (!payment) {
        logger.error('Failed to create payment record', { paymentRecord });
        return { 
          status: 'error', 
          message: 'Failed to create payment record' 
        };
      }
      
      logger.info('Payment record created', { payment_id: payment.id, order_id: orderId });
      
      return {
        status: 'success',
        order_id: orderId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR'
      };
    } catch (error) {
      logger.error('Error creating order', { error, orderData });
      return { 
        status: 'error', 
        message: error.message || 'Failed to create order' 
      };
    }
  }
  
  /**
   * Verify a payment
   * @param {Object} paymentData - Payment verification data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Verification result
   */
  async verifyPayment(paymentData, userId) {
    try {
      logger.info('Starting payment verification', { 
        orderId: paymentData.razorpay_order_id,
        paymentId: paymentData.razorpay_payment_id,
        userId 
      });
      
      // Validate required fields
      if (!paymentData.razorpay_order_id || !paymentData.razorpay_payment_id || !paymentData.razorpay_signature) {
        logger.error('Missing required payment verification data', { 
          hasOrderId: !!paymentData.razorpay_order_id,
          hasPaymentId: !!paymentData.razorpay_payment_id,
          hasSignature: !!paymentData.razorpay_signature
        });
        return { 
          status: 'error', 
          message: 'Missing required payment data' 
        };
      }
      
      // Get payment record by order_id
      const payment = await paymentModel.getPaymentByOrderId(paymentData.razorpay_order_id);
      
      if (!payment) {
        logger.error('Payment record not found', { orderId: paymentData.razorpay_order_id });
        return { 
          status: 'error', 
          message: 'Payment record not found' 
        };
      }
      
      // Get gateway handler
      const gatewayHandler = gatewayFactory.getGateway(payment.gateway);
      if (!gatewayHandler) {
        logger.error('Unsupported payment gateway during verification', { 
          gateway: payment.gateway,
          orderId: paymentData.razorpay_order_id
        });
        return { 
          status: 'error', 
          message: `Unsupported payment gateway: ${payment.gateway}` 
        };
      }
      
      // Verify payment with gateway
      const verificationResult = await gatewayHandler.verifyPayment({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature
      });
      
      if (!verificationResult.verified) {
        logger.error('Payment verification failed', { 
          result: verificationResult, 
          orderId: paymentData.razorpay_order_id 
        });
        
        // Update payment status to failed
        await paymentModel.updatePaymentStatus(payment.id, 'failed', {
          error_message: 'Payment verification failed',
          gateway_payment_id: paymentData.razorpay_payment_id
        });
        
        return { 
          status: 'error', 
          message: 'Payment verification failed' 
        };
      }
      
      // Update payment status to success
      await paymentModel.updatePaymentStatus(payment.id, 'success', {
        gateway_payment_id: paymentData.razorpay_payment_id,
        gateway_response: verificationResult
      });
      
      // If this is a subscription payment, activate the subscription
      if (payment.subscription_id) {
        logger.info('Activating subscription after successful payment', {
          subscriptionId: payment.subscription_id,
          paymentId: payment.id
        });
        
        const subscriptionService = require('./subscription.service');
        await subscriptionService.activateSubscription(payment.subscription_id);
      }
      
      logger.info('Payment verified successfully', { 
        orderId: paymentData.razorpay_order_id,
        paymentId: payment.id,
        subscriptionId: payment.subscription_id
      });
      
      return {
        status: 'success',
        message: 'Payment verified successfully',
        payment: {
          id: payment.id,
          order_id: payment.order_id,
          amount: payment.amount,
          status: 'success',
          transaction_id: payment.transaction_id,
          subscription_id: payment.subscription_id
        }
      };
    } catch (error) {
      logger.error('Error verifying payment', { error: error.message });
      return { 
        status: 'error', 
        message: `Error verifying payment: ${error.message}` 
      };
    }
  }
  
  /**
   * Get payment status
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Payment status details
   */
  async getPaymentStatus(orderId, userId) {
    try {
      // Get payment record
      let payment;
      try {
        payment = await paymentModel.getPaymentByOrderId(orderId);
      } catch (err) {
        throw new Error(`Payment not found for order: ${orderId}`);
      }
      
      // Check if user has permission to view this payment
      if (payment.user_id !== userId) {
        throw new Error('You do not have permission to view this payment');
      }
      
      // Get gateway instance
      const gatewayInstance = gatewayFactory.getGateway(payment.gateway);
      
      // Check status with the gateway
      const gatewayStatus = await gatewayInstance.getPaymentStatus(orderId);
      
      // If gateway status is different from our record, update it
      if (gatewayStatus.status !== payment.status) {
        await paymentModel.updatePaymentStatus(payment.id, gatewayStatus.status);
        payment = await paymentModel.getPaymentById(payment.id);
      }
      
      // Apply expiry logic
      if (payment.status === 'created' || payment.status === 'pending') {
        if (new Date(payment.expires_at) < new Date()) {
          await paymentModel.updatePaymentStatus(payment.id, 'expired');
          payment = await paymentModel.getPaymentById(payment.id);
        }
      }
      
      // Return response
      return {
        status: 'success',
        payment: {
          id: payment.id,
          transaction_id: payment.transaction_id,
          order_id: payment.order_id,
          amount: payment.amount,
          status: payment.status,
          gateway: payment.gateway,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          expires_at: payment.expires_at
        }
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }
  
  /**
   * Get payment details
   * @param {string} paymentId - Payment ID (internal)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Detailed payment information
   */
  async getPaymentDetails(paymentId, userId) {
    try {
      // Get payment with computed status (checks expiry)
      const payment = await paymentModel.getPaymentWithComputedStatus(paymentId);
      
      // Check if user has permission to view this payment
      if (payment.user_id !== userId) {
        throw new Error('You do not have permission to view this payment');
      }
      
      // Return payment details
      return {
        status: 'success',
        payment: {
          id: payment.id,
          transaction_id: payment.transaction_id,
          order_id: payment.order_id,
          subscription_id: payment.subscription_id,
          amount: payment.amount,
          status: payment.status,
          type: payment.type,
          gateway: payment.gateway,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          expires_at: payment.expires_at,
          refund_status: payment.refund_status,
          metadata: payment.metadata
        }
      };
    } catch (error) {
      console.error('Error getting payment details:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }
  
  /**
   * Get user payments
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} - List of user payments
   */
  async getUserPayments(userId, limit = 10, offset = 0) {
    try {
      const payments = await paymentModel.getUserPayments(userId, limit, offset);
      
      // Return payment list
      return {
        status: 'success',
        payments: payments.map(payment => ({
          id: payment.id,
          transaction_id: payment.transaction_id,
          order_id: payment.order_id,
          amount: payment.amount,
          status: payment.status,
          gateway: payment.gateway,
          created_at: payment.created_at
        }))
      };
    } catch (error) {
      console.error('Error getting user payments:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }
  
  /**
   * Check and mark expired payments
   * @returns {Promise<number>} - Number of payments marked as expired
   */
  async markExpiredPayments() {
    try {
      return await paymentModel.markExpiredPayments();
    } catch (error) {
      console.error('Error marking expired payments:', error);
      throw error;
    }
  }
  
  /**
   * Process a subscription renewal payment
   * @param {Object} subscription - Subscription record with plan information
   * @returns {Promise<Object>} - Result of the renewal attempt
   */
  async processSubscriptionRenewal(subscription) {
    try {
      logger.info(`Processing renewal for subscription ${subscription.id} (${subscription.subscription_id})`);
      
      // Extract plan details from the subscription
      const {
        user_id, 
        plan_amount, 
        plan_gateway, 
        plan_name,
        plan_interval,
        plan_period
      } = subscription;
      
      // Default currency is INR if not specified 
      const plan_currency = 'INR';
      
      // Get the gateway instance
      const gateway = plan_gateway || paymentConfig.defaultGateway;
      const gatewayInstance = gatewayFactory.getGateway(gateway);
      
      // Calculate next billing date
      const nextBillingDate = this.calculateNextBillingDate(
        new Date(),
        plan_interval,
        plan_period
      );
      
      // Create a description for this renewal
      const description = `Renewal for ${plan_name} (${plan_interval} ${plan_period})`;
      
      // Create a payment for this renewal
      const orderData = {
        amount: plan_amount,
        currency: plan_currency,
        method: 'subscription_renewal',
        flow: 'server_initiated',
        gateway,
        description,
        metadata: {
          subscription_id: subscription.id,
          plan_id: subscription.plan_id
        }
      };
      
      logger.debug(`Creating renewal payment for subscription ${subscription.id}`, orderData);
      
      // For automatic renewals, we use the gateway's direct charge or server-initiated payment
      const renewalResult = await gatewayInstance.processRenewal({
        subscription_id: subscription.subscription_id,
        amount: plan_amount,
        currency: plan_currency,
        description
      });
      
      if (renewalResult.success) {
        logger.info(`Successfully renewed subscription ${subscription.id} with transaction ${renewalResult.transaction_id}`);
        
        // Store the payment record
        await paymentModel.createPayment({
          order_id: renewalResult.order_id || `renewal_${Date.now()}`,
          transaction_id: renewalResult.transaction_id,
          amount: plan_amount,
          user_id,
          gateway,
          status: 'completed',
          metadata: {
            currency: plan_currency,
            method: 'subscription_renewal',
            description,
            subscription_id: subscription.id
          }
        });
        
        // Update subscription record with new billing date and transaction details
        await subscriptionModel.recordSuccessfulRenewal(
          subscription.id,
          nextBillingDate,
          renewalResult.transaction_id
        );
        
        return {
          success: true,
          transaction_id: renewalResult.transaction_id,
          next_billing_date: nextBillingDate
        };
      } else {
        logger.warn(`Failed to renew subscription ${subscription.id}: ${renewalResult.message}`);
        
        return {
          success: false,
          message: renewalResult.message
        };
      }
    } catch (error) {
      logger.error(`Error processing subscription renewal for subscription ${subscription.id}:`, error);
      
      return {
        success: false,
        message: error.message || 'Unknown error during renewal processing'
      };
    }
  }
  
  /**
   * Calculate the next billing date based on interval and period
   * @param {Date} currentDate - Base date for calculation
   * @param {string} interval - Interval value (number)
   * @param {string} period - Interval period (day, week, month, year)
   * @returns {Date} - Next billing date
   */
  calculateNextBillingDate(currentDate, interval, period) {
    const nextDate = new Date(currentDate);
    const intervalNum = parseInt(interval, 10);
    
    switch (period.toLowerCase()) {
      case 'day':
        nextDate.setDate(nextDate.getDate() + intervalNum);
        break;
      case 'week':
        nextDate.setDate(nextDate.getDate() + (7 * intervalNum));
        break;
      case 'month':
        nextDate.setMonth(nextDate.getMonth() + intervalNum);
        break;
      case 'year':
        nextDate.setFullYear(nextDate.getFullYear() + intervalNum);
        break;
      default:
        // Default to 1 month if period is unknown
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate;
  }
  
  /**
   * Retry a failed payment
   * @param {Object} payment - Payment record to retry
   * @returns {Promise<Object>} - Result of retry attempt
   */
  async retryPayment(payment) {
    try {
      logger.info(`Retrying payment ${payment.id}`);

      // Get gateway instance
      const gatewayInstance = gatewayFactory.getGateway(payment.gateway);

      // Prepare retry data
      const retryData = {
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        method: payment.method,
        description: `Retry attempt ${payment.retry_count + 1} for payment ${payment.id}`,
        metadata: {
          original_payment_id: payment.id,
          retry_count: payment.retry_count + 1,
          retry_reason: payment.error_message
        }
      };

      // Attempt to retry payment
      const retryResult = await gatewayInstance.createOrder(retryData);

      if (retryResult.status === 'created') {
        // Update payment with new order ID
        await paymentModel.updatePaymentOrder(
          payment.id,
          retryResult.order_id,
          retryResult.transaction_id
        );

        return {
          success: true,
          status: 'pending',
          order_id: retryResult.order_id,
          transaction_id: retryResult.transaction_id,
          message: 'Payment retry initiated successfully'
        };
      } else {
        return {
          success: false,
          status: 'failed',
          message: retryResult.message || 'Failed to retry payment'
        };
      }
    } catch (error) {
      logger.error(`Error retrying payment ${payment.id}:`, error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Error retrying payment'
      };
    }
  }
}

module.exports = new PaymentService(); 