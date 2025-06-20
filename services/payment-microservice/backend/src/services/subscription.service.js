const gatewayFactory = require('./gateway.factory');
const planModel = require('../models/plan.model');
const subscriptionModel = require('../models/subscription.model');
const paymentModel = require('../models/payment.model');
const paymentConfig = require('../config/payment-config');
const orderModel = require('../models/order.model');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Subscription Service
 * Handles business logic for subscription operations
 */
class SubscriptionService {
  /**
   * Create a subscription plan
   * @param {Object} planData - Plan information
   * @returns {Promise<Object>} - Created plan details
   */
  async createPlan(planData) {
    try {
      const { name, amount, interval, period, gateway, metadata } = planData;
      
      // Validate gateway
      if (!gatewayFactory.isSupported(gateway)) {
        throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
      
      // Get gateway instance
      const gatewayInstance = gatewayFactory.getGateway(gateway);
      
      // Create plan with the gateway
      const gatewayResponse = await gatewayInstance.createPlan({
        name,
        amount,
        interval,
        period,
        metadata
      });
      
      // Store plan record in database
      const plan = await planModel.createPlan({
        plan_id: gatewayResponse.plan_id,
        name,
        amount,
        interval,
        period,
        gateway,
        metadata
      });
      
      // Return combined response
      return {
        status: 'success',
        message: 'Plan created successfully',
        plan: {
          id: plan.id,
          plan_id: plan.plan_id,
          name: plan.name,
          amount: plan.amount,
          interval: plan.interval,
          period: plan.period,
          gateway: plan.gateway,
          metadata: plan.metadata,
          created_at: plan.created_at
        }
      };
    } catch (error) {
      console.error('Error creating plan:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Get all available plans
   * @returns {Promise<Object>} - List of all plans
   */
  async getAllPlans() {
    try {
      const plans = await planModel.getAllPlans();
      
      return {
        status: 'success',
        plans: plans.map(plan => ({
          id: plan.id,
          plan_id: plan.plan_id,
          name: plan.name,
          amount: plan.amount,
          interval: plan.interval,
          period: plan.period,
          gateway: plan.gateway,
          metadata: plan.metadata,
          created_at: plan.created_at
        }))
      };
    } catch (error) {
      console.error('Error fetching plans:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Get plan details
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} - Plan details
   */
  async getPlan(planId) {
    try {
      const plan = await planModel.getPlanByPlanId(planId);
      
      return {
        status: 'success',
        plan: {
          id: plan.id,
          plan_id: plan.plan_id,
          name: plan.name,
          amount: plan.amount,
          interval: plan.interval,
          period: plan.period,
          gateway: plan.gateway,
          metadata: plan.metadata,
          created_at: plan.created_at
        }
      };
    } catch (error) {
      console.error('Error fetching plan:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Calculate next billing date based on plan period and interval
   * @param {string} period - Plan period (monthly/yearly)
   * @param {number} interval - Billing interval
   * @returns {Date} - Next billing date
   */
  calculateNextBillingDate(period, interval = 1) {
    const nextDate = new Date();
    
    switch (period) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + interval); // Default to monthly
    }
    
    return nextDate;
  }

  /**
   * Subscribe a user to a plan
   * @param {Object} subscriptionData - Subscription information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Created subscription details
   */
  async subscribe(subscriptionData, userId) {
    try {
      logger.info('Creating new subscription', { subscriptionData, userId });
      
      // Get plan details
      const plan = await this.getPlan(subscriptionData.planId);
      if (!plan) {
        logger.error('Plan not found', { planId: subscriptionData.planId });
        return {
          status: 'error',
          message: 'Plan not found'
        };
      }

      // Get gateway instance
      const gateway = subscriptionData.gateway || paymentConfig.defaultGateway;
      const gatewayInstance = gatewayFactory.getGateway(gateway);
      
      if (!gatewayInstance) {
        logger.error('Unsupported payment gateway', { gateway });
        return {
          status: 'error',
          message: `Unsupported payment gateway: ${gateway}`
        };
      }

      // Create subscription in payment gateway first
      const gatewaySubscription = await gatewayInstance.createSubscription({
        plan_id: plan.plan.plan_id,
        customer: subscriptionData.customer
      });

      if (!gatewaySubscription || !gatewaySubscription.subscription_id) {
        logger.error('Failed to create subscription in gateway', { gatewaySubscription });
        return {
          status: 'error',
          message: 'Failed to create subscription in payment gateway'
        };
      }

      // Calculate billing dates
      const startDate = new Date();
      const nextBillingDate = this.calculateNextBillingDate(plan.plan.period, plan.plan.interval);
      const endDate = this.calculateEndDate(plan.plan.period);
      
      // Create subscription record in our database
      const subscription = {
        user_id: userId,
        plan_id: plan.plan.id,
        status: 'pending',
        start_date: startDate,
        next_billing_date: nextBillingDate,
        end_date: endDate,
        gateway: gateway,
        subscription_id: gatewaySubscription.subscription_id,
        metadata: {
          customer: subscriptionData.customer,
          plan_details: plan,
          gateway_subscription: gatewaySubscription,
          billing_cycle: {
            current_period_start: startDate,
            current_period_end: nextBillingDate,
            interval: plan.plan.interval,
            period: plan.plan.period
          }
        }
      };
      
      const result = await subscriptionModel.createSubscription(subscription);
      
      if (!result) {
        logger.error('Failed to create subscription record', { subscription });
        // Try to cancel the gateway subscription since our record creation failed
        try {
          await gatewayInstance.cancelSubscription(gatewaySubscription.subscription_id);
        } catch (cancelError) {
          logger.error('Failed to cancel gateway subscription after record creation failure', {
            error: cancelError,
            subscription_id: gatewaySubscription.subscription_id
          });
        }
        return {
          status: 'error',
          message: 'Failed to create subscription record'
        };
      }
      
      logger.info('Subscription created successfully', { 
        subscription_id: result.id,
        gateway_subscription_id: gatewaySubscription.subscription_id,
        plan_id: plan.id,
        user_id: userId,
        next_billing_date: nextBillingDate
      });
      
      return {
        status: 'success',
        subscription: {
          id: result.id,
          subscription_id: gatewaySubscription.subscription_id,
          plan_id: plan.id,
          status: 'pending',
          start_date: startDate,
          next_billing_date: nextBillingDate,
          end_date: endDate,
          billing_cycle: {
            current_period_start: startDate,
            current_period_end: nextBillingDate,
            interval: plan.plan.interval,
            period: plan.plan.period
          }
        }
      };
    } catch (error) {
      logger.error('Error creating subscription', { error, subscriptionData });
      return {
        status: 'error',
        message: error.message || 'Failed to create subscription'
      };
    }
  }

  /**
   * Get all subscriptions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - List of user subscriptions
   */
  async getUserSubscriptions(userId) {
    try {
      const subscriptions = await subscriptionModel.getUserSubscriptions(userId);
      
      return {
        status: 'success',
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          user_id: sub.user_id,
          plan_id: sub.plan_id,
          subscription_id: sub.subscription_id,
          status: sub.status,
          gateway: sub.gateway,
          start_date: sub.start_date,
          next_billing_date: sub.next_billing_date,
          plan: {
            name: sub.plan_name,
            amount: sub.plan_amount,
            period: sub.plan_period,
            interval: sub.plan_interval
          }
        }))
      };
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Result of cancellation
   */
  async cancelSubscription(subscriptionId, userId) {
    try {
      // Get subscription details
      const subscription = await subscriptionModel.getSubscriptionBySubscriptionId(subscriptionId);
      
      // Check if user has permission to cancel this subscription
      if (subscription.user_id !== userId) {
        throw new Error('You do not have permission to cancel this subscription');
      }
      
      // Get gateway instance
      const gatewayInstance = gatewayFactory.getGateway(subscription.gateway);
      
      // Cancel subscription with the gateway
      await gatewayInstance.cancelSubscription(subscriptionId);
      
      // Update subscription status in database
      const updatedSubscription = await subscriptionModel.cancelSubscription(subscription.id);
      
      // Return response
      return {
        status: 'success',
        message: 'Subscription cancelled successfully',
        subscription: {
          id: updatedSubscription.id,
          user_id: updatedSubscription.user_id,
          plan_id: updatedSubscription.plan_id,
          subscription_id: updatedSubscription.subscription_id,
          status: updatedSubscription.status,
          gateway: updatedSubscription.gateway,
          start_date: updatedSubscription.start_date,
          next_billing_date: updatedSubscription.next_billing_date
        }
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Process renewal for subscriptions that are due
   * This would typically be called by a scheduled job
   * @returns {Promise<Object>} - Result of renewal processing
   */
  async processRenewals() {
    try {
      // Get subscriptions due for renewal
      const dueSubscriptions = await subscriptionModel.getSubscriptionsDueForRenewal();
      
      let processed = 0;
      let failed = 0;
      
      // Process each subscription
      for (const subscription of dueSubscriptions) {
        try {
          // Get plan details
          const plan = await planModel.getPlanById(subscription.plan_id);
          
          // Get gateway instance
          const gatewayInstance = gatewayFactory.getGateway(subscription.gateway);
          
          // Process renewal with the gateway
          const renewalResult = await gatewayInstance.renewSubscription(subscription.subscription_id);
          
          if (renewalResult.success) {
            // Create a payment record for the renewal
            await paymentModel.createPayment({
              subscription_id: subscription.subscription_id,
              amount: plan.amount,
              user_id: subscription.user_id,
              gateway: subscription.gateway,
              type: 'subscription',
              status: 'success',
              order_id: null // Explicitly set to null for subscription renewals
            });
            
            // Calculate next billing date
            const nextBillingDate = new Date();
            
            if (plan.period === 'monthly') {
              nextBillingDate.setMonth(nextBillingDate.getMonth() + plan.interval);
            } else if (plan.period === 'yearly') {
              nextBillingDate.setFullYear(nextBillingDate.getFullYear() + plan.interval);
            }
            
            // Update subscription with new billing date
            await subscriptionModel.updateNextBillingDate(subscription.id, nextBillingDate);
            
            processed++;
          } else {
            // Handle failed renewal
            await subscriptionModel.updateSubscriptionStatus(subscription.id, 'failed');
            failed++;
          }
        } catch (subError) {
          console.error(`Error processing renewal for subscription ${subscription.id}:`, subError);
          await subscriptionModel.updateSubscriptionStatus(subscription.id, 'failed');
          failed++;
        }
      }
      
      return {
        status: 'success',
        message: 'Renewal processing completed',
        stats: {
          total: dueSubscriptions.length,
          processed,
          failed
        }
      };
    } catch (error) {
      console.error('Error processing renewals:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Create a subscription order for payment
   * @param {string} subscriptionId - Subscription ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result with payment or error
   */
  async createSubscriptionOrder(subscriptionId, userId) {
    try {
      logger.info('Creating subscription order', { subscriptionId, userId });
      
      // Get subscription details
      const subscription = await subscriptionModel.getSubscriptionBySubscriptionId(subscriptionId);
      
      if (!subscription) {
        logger.error('Subscription not found', { subscriptionId });
        return { 
          status: 'error', 
          message: 'Subscription not found'
        };
      }
      
      // Check if subscription belongs to the user
      if (subscription.user_id !== userId) {
        logger.error('Unauthorized subscription access', { 
          subscriptionId, 
          subscriptionUserId: subscription.user_id, 
          requestingUserId: userId 
        });
        return {
          status: 'error',
          message: 'Unauthorized'
        };
      }
      
      // Check if subscription is in the correct state for payment
      if (subscription.status !== 'pending') {
        logger.error('Subscription not in pending state', { 
          subscriptionId, 
          currentStatus: subscription.status 
        });
        return {
          status: 'error',
          message: 'Subscription is not in pending state'
        };
      }
      
      // Get the plan details directly using the numeric ID from the subscription
      let plan;
      try {
        plan = await planModel.getPlanById(subscription.plan_id);
        logger.info('Plan found for subscription', { 
          planId: subscription.plan_id,
          planName: plan.name
        });
      } catch (error) {
        logger.error('Error fetching plan', { 
          error: error.message, 
          planId: subscription.plan_id 
        });
        return {
          status: 'error',
          message: `Plan not found: ${error.message}`
        };
      }
      
      // Get gateway handler
      const gateway = subscription.gateway;
      const gatewayHandler = gatewayFactory.getGateway(gateway);
      
      if (!gatewayHandler) {
        logger.error('Unsupported payment gateway', { gateway });
        return {
          status: 'error',
          message: `Unsupported payment gateway: ${gateway}`
        };
      }
      
      // Create order in gateway
      const gatewayOrderResult = await gatewayHandler.createOrder({
        amount: plan.amount,
        currency: 'INR',
        notes: {
          subscription_id: subscriptionId,
          type: 'subscription',
          plan_id: plan.plan_id
        }
      });
      
      if (!gatewayOrderResult || !gatewayOrderResult.order_id) {
        logger.error('Failed to create order in payment gateway', { gatewayOrderResult });
        return {
          status: 'error',
          message: 'Failed to create order in payment gateway'
        };
      }
      
      // Create order record
      const orderRecord = await orderModel.createOrder({
        order_id: gatewayOrderResult.order_id,
        user_id: userId,
        amount: plan.amount,
        currency: 'INR',
        status: 'created',
        gateway,
        metadata: {
          subscription_id: subscriptionId,
          plan_id: plan.plan_id,
          type: 'subscription',
          gateway_data: gatewayOrderResult
        }
      });
      
      logger.info('Order record created for subscription', { 
        order_id: orderRecord.order_id,
        id: orderRecord.id,
        subscription_id: subscriptionId
      });
      
      // Create payment record linked to the subscription and order
      const paymentData = {
        order_id: gatewayOrderResult.order_id,
        order_reference_id: orderRecord.id,
        subscription_id: subscriptionId,
        amount: plan.amount,
        status: 'created', // Initial status is 'created'
        user_id: userId,
        gateway,
        type: 'subscription',
        transaction_id: uuidv4(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
      };
      
      const payment = await paymentModel.createPayment(paymentData);
      
      logger.info('Payment record created for subscription', { 
        payment_id: payment.id,
        order_id: payment.order_id,
        subscription_id: subscriptionId
      });
      
      return {
        status: 'success',
        payment: {
          id: payment.id,
          order_id: payment.order_id,
          amount: payment.amount,
          currency: 'INR',
          status: 'created',
          gateway,
          type: 'subscription',
          gateway_data: gatewayOrderResult
        }
      };
    } catch (error) {
      logger.error('Error creating subscription order', { error: error.message, subscriptionId });
      return {
        status: 'error',
        message: `Error creating subscription order: ${error.message}`
      };
    }
  }

  /**
   * Verify a subscription payment
   * @param {Object} paymentData - Payment data from the gateway
   * @param {string} subscriptionId - Subscription ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result with status and details
   */
  async verifySubscriptionPayment(paymentData, subscriptionId, userId) {
    try {
      logger.info('Verifying subscription payment', { 
        order_id: paymentData.order_id, 
        subscription_id: subscriptionId 
      });
      
      // Validate required fields
      if (!paymentData.order_id || !paymentData.razorpay_payment_id || !paymentData.razorpay_signature) {
        logger.error('Missing required payment verification data', { paymentData });
        return {
          status: 'error',
          message: 'Missing required payment data'
        };
      }
      
      // Get subscription details
      const subscription = await subscriptionModel.getSubscriptionBySubscriptionId(subscriptionId);
      
      if (!subscription) {
        logger.error('Subscription not found', { subscriptionId });
        return {
          status: 'error',
          message: 'Subscription not found'
        };
      }
      
      // Check if subscription belongs to the user
      if (subscription.user_id !== userId) {
        logger.error('Unauthorized subscription access', { 
          subscriptionId, 
          subscriptionUserId: subscription.user_id, 
          requestingUserId: userId 
        });
        return {
          status: 'error',
          message: 'Unauthorized'
        };
      }
      
      // Get payment record by order_id
      const payment = await paymentModel.getPaymentByOrderId(paymentData.order_id);
      
      if (!payment) {
        logger.error('Payment record not found', { order_id: paymentData.order_id });
        return {
          status: 'error',
          message: 'Payment record not found'
        };
      }
      
      // Verify that this payment belongs to the subscription
      if (payment.subscription_id !== subscriptionId) {
        logger.error('Payment not associated with the subscription', { 
          payment_subscription_id: payment.subscription_id, 
          requested_subscription_id: subscriptionId 
        });
        return {
          status: 'error',
          message: 'Payment not associated with the subscription'
        };
      }
      
      // Get gateway handler
      const gateway = subscription.gateway;
      const gatewayHandler = gatewayFactory.getGateway(gateway);
      
      if (!gatewayHandler) {
        logger.error('Unsupported payment gateway during verification', { gateway });
        return {
          status: 'error',
          message: `Unsupported payment gateway: ${gateway}`
        };
      }
      
      // Verify payment with gateway
      const verificationResult = await gatewayHandler.verifyPayment({
        order_id: paymentData.order_id,
        payment_id: paymentData.razorpay_payment_id,
        signature: paymentData.razorpay_signature
      });
      
      if (!verificationResult.verified) {
        logger.error('Payment verification failed', { 
          result: verificationResult, 
          order_id: paymentData.order_id,
          subscription_id: subscriptionId
        });
        
        // Update payment status to failed
        await paymentModel.updatePaymentStatus(payment.id, 'failed', verificationResult.error || 'Signature verification failed');
        
        // Update order status to failed if applicable
        if (payment.order_reference_id) {
          try {
            await orderModel.updateOrderStatus(paymentData.order_id, 'failed');
          } catch (orderError) {
            logger.error('Error updating order status', { 
              error: orderError.message, 
              order_id: paymentData.order_id 
            });
          }
        }
        
        return {
          status: 'error',
          message: verificationResult.error || 'Payment verification failed'
        };
      }
      
      // Payment verification successful
      logger.info('Subscription payment verification successful', { 
        order_id: paymentData.order_id, 
        payment_id: paymentData.razorpay_payment_id,
        subscription_id: subscriptionId
      });
      
      // Update payment status to success
      await paymentModel.updatePaymentStatus(payment.id, 'success');
      
      // Update order status to completed if applicable
      if (payment.order_reference_id) {
        try {
          await orderModel.updateOrderStatus(paymentData.order_id, 'completed');
        } catch (orderError) {
          logger.error('Error updating order status', { 
            error: orderError.message, 
            order_id: paymentData.order_id 
          });
        }
      }
      
      // Update subscription status to active
      await subscriptionModel.updateSubscriptionStatus(subscription.id, 'active');
      
      // Update the next billing date based on the plan period
      await subscriptionModel.updateNextBillingDate(subscription.id);
      
      // Get updated subscription details
      const updatedSubscription = await subscriptionModel.getSubscriptionById(subscription.id);
      
      // Get plan details for the response
      const planDetails = await this.getPlan(updatedSubscription.plan_id);
      const plan = planDetails.status === 'success' ? planDetails.plan : null;
      
      return {
        status: 'success',
        message: 'Subscription payment verified successfully',
        subscription: {
          ...updatedSubscription,
          plan: plan
        }
      };
    } catch (error) {
      logger.error('Error verifying subscription payment', { 
        error: error.message, 
        subscription_id: subscriptionId,
        order_id: paymentData?.order_id
      });
      return {
        status: 'error',
        message: `Error verifying subscription payment: ${error.message}`
      };
    }
  }

  /**
   * Activate a subscription after successful payment
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} - Updated subscription details
   */
  async activateSubscription(subscriptionId) {
    try {
      logger.info('Activating subscription', { subscriptionId });
      
      // Get subscription details
      const subscription = await subscriptionModel.getSubscriptionById(subscriptionId);
      
      if (!subscription) {
        logger.error('Subscription not found', { subscriptionId });
        throw new Error('Subscription not found');
      }
      
      // Update subscription status to active
      const result = await subscriptionModel.updateSubscriptionStatus(subscriptionId, 'active');
      
      if (!result) {
        logger.error('Failed to activate subscription', { subscriptionId });
        throw new Error('Failed to activate subscription');
      }
      
      logger.info('Subscription activated successfully', { subscriptionId });
      
      return {
        status: 'success',
        subscription: {
          id: subscription.id,
          plan_id: subscription.plan_id,
          status: 'active',
          start_date: subscription.start_date,
          end_date: subscription.end_date
        }
      };
    } catch (error) {
      logger.error('Error activating subscription', { error, subscriptionId });
      return {
        status: 'error',
        message: error.message || 'Failed to activate subscription'
      };
    }
  }

  /**
   * Calculate subscription end date based on plan duration
   * @param {string} duration - Plan duration (e.g., 'monthly', 'yearly')
   * @returns {Date} - End date
   */
  calculateEndDate(duration) {
    const now = new Date();
    switch (duration) {
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1)); // Default to monthly
    }
  }
}

module.exports = new SubscriptionService(); 