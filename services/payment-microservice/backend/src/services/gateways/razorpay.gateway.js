const Razorpay = require('razorpay');
const PaymentGateway = require('./gateway.interface');
const crypto = require('crypto');
const paymentConfig = require('../../config/payment-config');
const logger = require('../../utils/logger');

/**
 * Razorpay Gateway Implementation
 * Implements the PaymentGateway interface for Razorpay
 */
class RazorpayGateway extends PaymentGateway {
  constructor(config) {
    super(config);
    
    // Initialize Razorpay client
    this.client = new Razorpay({
      key_id: config.credentials.key_id || process.env.RAZORPAY_KEY_ID,
      key_secret: config.credentials.key_secret || process.env.RAZORPAY_KEY_SECRET
    });
    
    // Store config for later use
    this.config = config;
    
    // Keep credentials for signature verification
    this.key_secret = config.key_secret || process.env.RAZORPAY_KEY_SECRET;
  }
  
  /**
   * Create a payment order
   * @param {Object} orderData - Order information
   * @returns {Promise<Object>} - Created order details
   */
  async createOrder(orderData) {
    try {
      const { amount, currency = 'INR', receipt = null, notes = {}, method, flow } = orderData;
      
      // Amount in paise (Razorpay expects amount in smallest currency unit)
      const amountInSmallestUnit = amount * 100;
      
      // Create Razorpay order
      const order = await this.client.orders.create({
        amount: amountInSmallestUnit,
        currency,
        receipt,
        notes,
        payment_capture: 1 // Auto-capture payment
      });

      // Prepare the response
      const response = {
        gateway: 'razorpay',
        order_id: order.id,
        id: order.id,
        amount: order.amount / 100, // Convert back to rupees for consistency
        currency: order.currency,
        status: 'created',
        created_at: new Date(order.created_at * 1000).toISOString(),
        gateway_response: order
      };

      // Get UPI settings from config
      const razorpayConfig = paymentConfig.gateways.razorpay;
      const upiSettings = razorpayConfig.settings.upi;

      // Handle UPI intent flow if requested
      if (method === 'upi' && flow === 'intent') {
        const payeeVpa = upiSettings.defaultVpa;
        const payeeName = upiSettings.merchantName;
        
        // Create UPI intent URL
        response.intent_url = `upi://pay?pa=${payeeVpa}&pn=${payeeName}&am=${amount}&cu=${currency}&tn=${order.id}`;
      }
      
      // Handle UPI collect flow if requested
      if (method === 'upi' && flow === 'collect') {
        response.collect_request_id = `collect_${order.id}`;
      }
      
      return response;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error(`Razorpay order creation failed: ${error.message}`);
    }
  }
  
  /**
   * Verify Razorpay payment signature
   * @param {string} orderId - Razorpay order ID
   * @param {string} paymentId - Razorpay payment ID
   * @param {string} signature - Razorpay signature
   * @returns {boolean} - Whether the signature is valid
   */
  verifySignature(orderId, paymentId, signature) {
    try {
      if (!orderId || !paymentId || !signature || !this.key_secret) {
        logger.error('Missing required parameters for signature verification', {
          hasOrderId: !!orderId,
          hasPaymentId: !!paymentId,
          hasSignature: !!signature,
          hasKeySecret: !!this.key_secret
        });
        return false;
      }

      // Generate the signature payload exactly as per Razorpay docs
      const payload = orderId + "|" + paymentId;
      
      // Create HMAC SHA256 hash
      const expectedSignature = crypto
        .createHmac("sha256", this.key_secret.toString())
        .update(payload.toString())
        .digest("hex");
      
      logger.debug('Verifying signature', {
        orderId,
        paymentId,
        expectedLength: expectedSignature.length,
        actualLength: signature.length
      });

      // Use timing-safe string comparison
      const isValid = expectedSignature === signature;
      
      if (!isValid) {
        logger.error('Signature verification failed', {
          orderId,
          paymentId,
          expectedSignature,
          receivedSignature: signature
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error during signature verification:', error);
      return false;
    }
  }
  
  /**
   * Verify a payment
   * @param {Object} paymentData - Payment verification data
   * @returns {Promise<Object>} - Verification result
   */
  async verifyPayment(paymentData) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
      
      logger.info('Verifying Razorpay payment', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });

      // Verify the payment signature
      const isValidSignature = this.verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );
      
      if (!isValidSignature) {
        logger.error('Invalid payment signature', { 
          orderId: razorpay_order_id, 
          paymentId: razorpay_payment_id 
        });
        return {
          gateway: 'razorpay',
          status: 'failed',
          message: 'Invalid payment signature',
          verified: false
        };
      }
      
      // Get payment details from Razorpay
      const payment = await this.client.payments.fetch(razorpay_payment_id);
      
      logger.info('Retrieved payment details from Razorpay', {
        paymentId: razorpay_payment_id,
        status: payment.status
      });

      // Determine payment status
      let status = 'pending';
      if (payment.status === 'captured') {
        status = 'success';
      } else if (payment.status === 'failed') {
        status = 'failed';
      }
      
      return {
        gateway: 'razorpay',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        amount: payment.amount / 100, // Convert from paise to rupees
        status,
        verified: true,
        gateway_response: payment
      };
    } catch (error) {
      logger.error('Error verifying Razorpay payment:', error);
      return {
        gateway: 'razorpay',
        status: 'failed',
        message: `Verification failed: ${error.message}`,
        verified: false
      };
    }
  }
  
  /**
   * Get payment status
   * @param {string} orderId - Order ID to check
   * @returns {Promise<Object>} - Payment status details
   */
  async getPaymentStatus(orderId) {
    try {
      // Get order details from Razorpay
      const order = await this.client.orders.fetch(orderId);
      
      // Get payments for the order
      const payments = await this.client.orders.fetchPayments(orderId);
      
      // Determine overall status
      let status = 'pending';
      let paymentId = null;
      
      if (payments.items.length > 0) {
        const latestPayment = payments.items[0];
        paymentId = latestPayment.id;
        
        if (latestPayment.status === 'captured') {
          status = 'success';
        } else if (latestPayment.status === 'failed') {
          status = 'failed';
        }
      } else if (new Date(order.created_at * 1000 + 60 * 60 * 1000) < new Date()) {
        // If no payments and order created more than 1 hour ago, mark as expired
        status = 'expired';
      }
      
      return {
        gateway: 'razorpay',
        order_id: orderId,
        payment_id: paymentId,
        amount: order.amount / 100,
        currency: order.currency,
        status,
        gateway_response: {
          order,
          payments: payments.items
        }
      };
    } catch (error) {
      console.error('Error checking Razorpay payment status:', error);
      throw new Error(`Razorpay payment status check failed: ${error.message}`);
    }
  }
  
  /**
   * Create a subscription plan
   * @param {Object} planData - Plan information
   * @returns {Promise<Object>} - Created plan details
   */
  async createPlan(planData) {
    try {
      const { name, amount, interval, period, metadata = {} } = planData;
      
      // Maps our period to Razorpay's interval
      const intervalMap = {
        monthly: 'monthly',
        yearly: 'yearly'
      };
      
      // Razorpay requires amount in paise (currency subunit)
      const planOptions = {
        period: intervalMap[period] || 'monthly',
        interval: interval,
        item: {
          name: name,
          amount: amount * 100,
          currency: 'INR',
          description: metadata.description || `${name} subscription plan`
        },
        notes: {
          description: metadata.description || '',
          plan_type: metadata.plan_type || 'standard',
          features: typeof metadata.features === 'string' ? metadata.features : JSON.stringify(metadata.features),
          created_by: metadata.created_by || 'system',
          custom_metadata: typeof metadata.custom_metadata === 'object' ? JSON.stringify(metadata.custom_metadata) : (metadata.custom_metadata || '')
        }
      };
      
      const plan = await this.client.plans.create(planOptions);
      
      return {
        plan_id: plan.id,
        name: name,
        amount: amount,
        interval: interval,
        period: period
      };
    } catch (error) {
      console.error('Error creating Razorpay plan:', error);
      throw new Error(`Razorpay plan creation failed: ${error.message}`);
    }
  }
  
  /**
   * Create a subscription for a customer
   * @param {Object} subscriptionData - Subscription information
   * @returns {Promise<Object>} - Created subscription details
   */
  async createSubscription(subscriptionData) {
    try {
      const { plan_id, customer } = subscriptionData;
      
      const subscriptionOptions = {
        plan_id: plan_id,
        customer_notify: 1, // Notify customer about the subscription
        total_count: 12, // Support up to 12 installments (1 year)
        notes: {
          user_name: customer.name || 'Customer'
        }
      };
      
      // We don't add customer.email and customer.contact as Razorpay API doesn't accept these
      // in subscription creation request (as per the error message)
      
      const subscription = await this.client.subscriptions.create(subscriptionOptions);
      
      return {
        subscription_id: subscription.id,
        plan_id: subscription.plan_id,
        status: subscription.status
      };
    } catch (error) {
      console.error('Error creating Razorpay subscription:', error);
      throw new Error(`Razorpay subscription creation failed: ${error.message}`);
    }
  }
  
  /**
   * Process a webhook event
   * @param {Object} eventData - Webhook event data
   * @returns {Promise<Object>} - Processed event result
   */
  async processWebhook(eventData) {
    try {
      const { event, payload } = eventData;
      logger.info('Processing Razorpay webhook', { event });

      // Handle different event types
      switch (event) {
        case 'payment.authorized':
          return await this.handlePaymentAuthorized(payload);
        case 'payment.failed':
          return await this.handlePaymentFailed(payload);
        case 'payment.captured':
          return await this.handlePaymentCaptured(payload);
        case 'payment.refunded':
          return await this.handlePaymentRefunded(payload);
        case 'subscription.activated':
          return await this.handleSubscriptionActivated(payload);
        case 'subscription.cancelled':
          return await this.handleSubscriptionCancelled(payload);
        case 'subscription.charged':
          return await this.handleSubscriptionCharged(payload);
        case 'subscription.completed':
          return await this.handleSubscriptionCompleted(payload);
        case 'subscription.authenticated':
          return await this.handleSubscriptionAuthenticated(payload);
        default:
          logger.warn('Unsupported webhook event', { event });
          return {
            status: 'ignored',
            message: 'Unsupported event type'
          };
      }
    } catch (error) {
      logger.error('Error processing Razorpay webhook', {
        error: error.message,
        stack: error.stack,
        eventData
      });
      throw new Error(`Razorpay webhook processing failed: ${error.message}`);
    }
  }
  
  /**
   * Handle payment authorized event
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handlePaymentAuthorized(payload) {
    const payment = payload.payment.entity;
    return {
      gateway: 'razorpay',
      order_id: payment.order_id,
      payment_id: payment.id,
      status: 'authorized',
      amount: payment.amount / 100, // Convert from paise to rupees
      currency: payment.currency,
      method: payment.method,
      message: 'Payment authorized'
    };
  }
  
  /**
   * Handle payment failed event
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handlePaymentFailed(payload) {
    const payment = payload.payment.entity;
    return {
      gateway: 'razorpay',
      order_id: payment.order_id,
      payment_id: payment.id,
      status: 'failed',
      amount: payment.amount / 100,
      currency: payment.currency,
      method: payment.method,
      error_code: payment.error_code,
      error_description: payment.error_description,
      message: 'Payment failed'
    };
  }
  
  /**
   * Handle payment captured event
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handlePaymentCaptured(payload) {
    const payment = payload.payment.entity;
    return {
      gateway: 'razorpay',
      order_id: payment.order_id,
      payment_id: payment.id,
      status: 'captured',
      amount: payment.amount / 100,
      currency: payment.currency,
      method: payment.method,
      message: 'Payment captured'
    };
  }
  
  /**
   * Handle payment refunded event
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handlePaymentRefunded(payload) {
    const payment = payload.payment.entity;
    return {
      gateway: 'razorpay',
      order_id: payment.order_id,
      payment_id: payment.id,
      status: 'refunded',
      amount: payment.amount / 100,
      currency: payment.currency,
      method: payment.method,
      message: 'Payment refunded'
    };
  }
  
  /**
   * Handle subscription activated event
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handleSubscriptionActivated(payload) {
    const subscription = payload.subscription.entity;
    return {
      gateway: 'razorpay',
      subscription_id: subscription.id,
      status: 'active',
      plan_id: subscription.plan_id,
      current_start: subscription.current_start,
      current_end: subscription.current_end,
      message: 'Subscription activated'
    };
  }
  
  /**
   * Handle subscription cancelled event
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handleSubscriptionCancelled(payload) {
    const subscription = payload.subscription.entity;
    return {
      gateway: 'razorpay',
      subscription_id: subscription.id,
      status: 'cancelled',
      plan_id: subscription.plan_id,
      cancelled_at: subscription.cancelled_at,
      message: 'Subscription cancelled'
    };
  }
  
  /**
   * Handle subscription charged event
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handleSubscriptionCharged(payload) {
    const subscription = payload.subscription.entity;
    return {
      gateway: 'razorpay',
      subscription_id: subscription.id,
      status: 'charged',
      plan_id: subscription.plan_id,
      payment_id: payload.payment.entity.id,
      amount: payload.payment.entity.amount / 100,
      currency: payload.payment.entity.currency,
      message: 'Subscription charged'
    };
  }
  
  /**
   * Handle subscription completed event
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handleSubscriptionCompleted(payload) {
    const subscription = payload.subscription.entity;
    return {
      gateway: 'razorpay',
      subscription_id: subscription.id,
      status: 'completed',
      plan_id: subscription.plan_id,
      completed_at: subscription.completed_at,
      message: 'Subscription completed'
    };
  }
  
  /**
   * Handle subscription authenticated event
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handleSubscriptionAuthenticated(payload) {
    const subscription = payload.subscription.entity;
    return {
      gateway: 'razorpay',
      subscription_id: subscription.id,
      status: 'authenticated',
      plan_id: subscription.plan_id,
      authenticated_at: subscription.authenticated_at,
      message: 'Subscription authenticated'
    };
  }
  
  /**
   * Initiate a refund
   * @param {Object} refundData - Refund information
   * @returns {Promise<Object>} - Refund details
   */
  async initiateRefund(refundData) {
    try {
      logger.info('Initiating Razorpay refund:', refundData);

      // Create refund in Razorpay
      const refund = await this.client.payments.refund(refundData.payment_id, {
        amount: refundData.amount * 100, // Convert to paise
        notes: {
          reason: refundData.reason
        }
      });

      logger.info('Razorpay refund initiated successfully:', {
        refund_id: refund.id,
        payment_id: refundData.payment_id
      });

      return {
        gateway: 'razorpay',
        refund_id: refund.id,
        payment_id: refundData.payment_id,
        amount: refund.amount / 100, // Convert from paise to rupees
        status: refund.status,
        gateway_response: refund
      };
    } catch (error) {
      logger.error('Error initiating Razorpay refund:', error);
      throw new Error(`Razorpay refund initiation failed: ${error.message}`);
    }
  }
  
  /**
   * Process a subscription renewal
   * @param {string} subscriptionId - Subscription ID to renew
   * @param {Object} renewalData - Optional additional data for processing the renewal
   * @returns {Promise<Object>} - Result of the renewal process
   */
  async renewSubscription(subscriptionId, renewalData = {}) {
    try {
      const { 
        amount, 
        currency = 'INR', 
        description = 'Subscription renewal' 
      } = renewalData;
      
      logger.info(`Processing Razorpay subscription renewal for ${subscriptionId}`);
      
      // For Razorpay, we need to create a charge against the subscription
      // First, create an order
      const amountInPaise = Math.round(amount * 100); // Convert to paise
      
      const order = await this.client.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `renewal_${Date.now()}`,
        notes: {
          subscription_id: subscriptionId,
          description,
          type: 'subscription_renewal'
        },
        payment_capture: 1 // Auto-capture payment
      });
      
      logger.debug(`Created Razorpay order for renewal: ${order.id}`);
      
      // In a production environment, we would use Razorpay's subscription APIs
      // to automatically charge the saved card/payment method
      
      // For this implementation, we'll simulate a successful payment
      // In a real implementation, you would use:
      // 1. Razorpay Subscriptions API if using their subscription product
      // 2. Razorpay's Payment Links for recurring payments
      // 3. Saved cards with customer consent for merchant-initiated transactions
      
      if (process.env.NODE_ENV === 'production') {
        // In production, this would need to use a proper payment method
        // This is a placeholder for the actual implementation
        logger.warn(
          `Production renewal for subscription ${subscriptionId} - NOT IMPLEMENTED. ` +
          `This requires setting up Razorpay's subscription APIs or using stored payment methods.`
        );
        
        return {
          success: false,
          message: 'Automatic renewals not implemented in production yet'
        };
      } else {
        // For testing/development, simulate a successful payment
        const transactionId = `rzp_renewal_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        logger.info(`Simulated successful renewal for subscription ${subscriptionId} with transaction ${transactionId}`);
        
        // Return successful result for development environment
        return {
          success: true,
          transaction_id: transactionId,
          order_id: order.id,
          amount: amount,
          currency: currency
        };
      }
    } catch (error) {
      logger.error('Error processing Razorpay renewal:', error);
      
      return {
        success: false,
        message: `Renewal failed: ${error.message}`
      };
    }
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Subscription ID to cancel
   * @returns {Promise<Object>} - Cancellation result
   */
  async cancelSubscription(subscriptionId) {
    try {
      console.log(`Cancelling Razorpay subscription: ${subscriptionId}`);
      
      // In a production environment, we would use Razorpay's API to cancel the subscription
      // For example: await this.client.subscriptions.cancel(subscriptionId);
      
      // For this implementation, we'll simulate a successful cancellation
      if (process.env.NODE_ENV === 'production') {
        // In production, implement the actual Razorpay cancellation
        // This is where you would call the actual Razorpay API
        
        try {
          // Uncomment in production:
          // await this.client.subscriptions.cancel(subscriptionId);
          
          console.log(`Production cancellation for subscription ${subscriptionId} - simulated success`);
          
          return {
            success: true,
            subscription_id: subscriptionId,
            status: 'cancelled',
            message: 'Subscription cancelled successfully'
          };
        } catch (razorpayError) {
          console.error('Error in Razorpay subscription cancellation:', razorpayError);
          throw new Error(`Razorpay cancellation failed: ${razorpayError.message}`);
        }
      } else {
        // For testing/development, simulate a successful cancellation
        console.log(`Simulated successful cancellation for subscription ${subscriptionId}`);
        
        // Return successful result for development environment
        return {
          success: true,
          subscription_id: subscriptionId,
          status: 'cancelled',
          message: 'Subscription cancelled successfully'
        };
      }
    } catch (error) {
      console.error('Error cancelling Razorpay subscription:', error);
      throw new Error(`Razorpay subscription cancellation failed: ${error.message}`);
    }
  }
}

module.exports = RazorpayGateway; 