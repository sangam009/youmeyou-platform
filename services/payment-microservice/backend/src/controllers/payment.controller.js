const paymentService = require('../services/payment.service');
const subscriptionService = require('../services/subscription.service');
const { body, param, validationResult } = require('express-validator');
const paymentConfig = require('../config/payment-config');
const orderModel = require('../models/order.model');
const logger = require('../utils/logger');

/**
 * Payment Controller
 * Handles payment-related endpoints
 */

// Validation middleware
const createOrderValidation = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').optional().isString().withMessage('Currency must be a string'),
  body('gateway').optional().isString().withMessage('Gateway must be a string'),
  body('method').optional().isString().withMessage('Method must be a string'),
  body('flow').optional().isString().withMessage('Flow must be a string'),
  body('notes').optional().isObject().withMessage('Notes must be an object')
];

const verifyPaymentValidation = [
  body('order_id').isString().withMessage('Order ID is required'),
  body('razorpay_order_id').optional().isString(),
  body('razorpay_payment_id').optional().isString(),
  body('razorpay_signature').optional().isString()
];

// One-time payment endpoints
const createOrder = [
  ...createOrderValidation,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in create order request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      // Validate currency if provided
      if (req.body.currency && !paymentConfig.isCurrencySupported(req.body.currency)) {
        logger.warn('Unsupported currency', { currency: req.body.currency });
        return res.status(400).json({
          status: 'error',
          message: `Currency '${req.body.currency}' is not supported. Supported currencies: ${paymentConfig.supportedCurrencies.join(', ')}`
        });
      }

      // Validate method if provided
      if (req.body.method && !paymentConfig.isMethodSupported(req.body.method)) {
        logger.warn('Unsupported payment method', { method: req.body.method });
        return res.status(400).json({
          status: 'error',
          message: `Payment method '${req.body.method}' is not supported. Supported methods: ${paymentConfig.supportedMethods.join(', ')}`
        });
      }

      // If gateway is provided, check if it's enabled
      if (req.body.gateway && !paymentConfig.isGatewayEnabled(req.body.gateway)) {
        logger.warn('Payment gateway not enabled', { gateway: req.body.gateway });
        return res.status(400).json({
          status: 'error',
          message: `Payment gateway '${req.body.gateway}' is not enabled or does not exist`
        });
      }

      const orderData = {
        amount: req.body.amount,
        currency: req.body.currency || 'INR',
        // gateway parameter is now optional - if not provided, the default will be used in the service
        gateway: req.body.gateway,
        method: req.body.method,
        flow: req.body.flow,
        notes: req.body.notes || {}
      };

      logger.info('Creating order', { userId: req.user?.uuid, amount: orderData.amount });
      const result = await paymentService.createOrder(orderData, req.user?.uuid);
      
      if (result.status === 'error') {
        logger.error('Error creating order', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('Order created successfully', { 
        orderId: result.order_id,
      });
      res.status(201).json(result);
    } catch (error) {
      logger.error('Unexpected error in createOrder', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const verifyPayment = [
  ...verifyPaymentValidation,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in verify payment request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      // Make sure we have the order_id
      if (!req.body.order_id) {
        logger.warn('Missing order_id in verify payment request');
        return res.status(400).json({
          status: 'error',
          message: 'order_id is required'
        });
      }

      const paymentData = req.body;
      logger.info('Verifying payment', { 
        orderId: paymentData.order_id, 
        userId: req.user.uuid,
        paymentId: paymentData.razorpay_payment_id 
      });
      
      const result = await paymentService.verifyPayment(paymentData, req.user.uuid);
      
      if (result.status === 'error') {
        logger.error('Payment verification failed', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('Payment verified successfully', { 
        orderId: paymentData.order_id,
        paymentId: result.payment.id
      });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in verifyPayment', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const getPaymentStatus = [
  param('order_id').isString().withMessage('Order ID is required'),
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in get payment status request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      // Add deprecation warning header
      res.set('X-Deprecated', 'This endpoint is deprecated. Use /details/:payment_id instead.');

      const orderId = req.params.order_id;
      logger.info('Getting payment status', { orderId, userId: req.user.uuid });
      
      const result = await paymentService.getPaymentStatus(orderId, req.user.uuid);
      
      if (result.status === 'error') {
        logger.error('Error getting payment status', { error: result.message });
        return res.status(404).json(result);
      }
      
      logger.info('Payment status retrieved', { 
        orderId, 
        status: result.payment.status 
      });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in getPaymentStatus', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const getPaymentDetails = [
  param('payment_id').isNumeric().withMessage('Payment ID must be numeric'),
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in get payment details request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const paymentId = req.params.payment_id;
      logger.info('Getting payment details', { paymentId, userId: req.user.uuid });
      
      const result = await paymentService.getPaymentDetails(paymentId, req.user.uuid);
      
      if (result.status === 'error') {
        logger.error('Error getting payment details', { error: result.message });
        return res.status(404).json(result);
      }
      
      logger.info('Payment details retrieved', { paymentId });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in getPaymentDetails', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

// Get user's payment history
const getUserPayments = [
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      
      logger.info('Getting user payments', { 
        userId: req.user.uuid, 
        limit, 
        offset 
      });
      
      const result = await paymentService.getUserPayments(req.user.uuid, limit, offset);
      
      if (result.status === 'error') {
        logger.error('Error getting user payments', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('User payments retrieved', { 
        userId: req.user.uuid, 
        count: result.payments.length 
      });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in getUserPayments', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

// Order endpoints
const getOrderDetails = [
  param('order_id').isString().withMessage('Order ID is required'),
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in get order details request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const orderId = req.params.order_id;
      logger.info('Getting order details', { orderId, userId: req.user.uuid });
      
      // Get order record from database
      const order = await orderModel.getOrderByOrderId(orderId);
      
      if (!order) {
        logger.warn('Order not found', { orderId });
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }
      
      // Check if user has access to this order
      if (order.user_id !== req.user.uuid) {
        logger.warn('Unauthorized access to order', { 
          orderId,
          orderUserId: order.user_id,
          requestingUserId: req.user.uuid
        });
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to view this order'
        });
      }
      
      logger.info('Order details retrieved', { orderId });
      res.status(200).json({
        status: 'success',
        order: {
          id: order.id,
          order_id: order.order_id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          gateway: order.gateway,
          created_at: order.created_at,
          updated_at: order.updated_at,
          metadata: order.metadata
        }
      });
    } catch (error) {
      logger.error('Unexpected error in getOrderDetails', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const getUserOrders = [
  async (req, res) => {
    try {
      const userId = req.user.uuid;
      logger.info('Getting user orders', { userId });
      
      // Get all orders for the user
      const orders = await orderModel.getOrdersByUserId(userId);
      
      logger.info('User orders retrieved', { userId, count: orders.length });
      res.status(200).json({
        status: 'success',
        orders: orders.map(order => ({
          id: order.id,
          order_id: order.order_id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          gateway: order.gateway,
          created_at: order.created_at,
          metadata: order.metadata
        }))
      });
    } catch (error) {
      logger.error('Unexpected error in getUserOrders', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

// Subscription endpoints
const createPlanValidation = [
  body('name').isString().withMessage('Plan name is required'),
  body('amount').isNumeric().withMessage('Plan amount must be a number'),
  body('billing_interval').isInt({ min: 1 }).withMessage('Billing interval must be a positive integer'),
  body('period').isIn(['monthly', 'yearly']).withMessage('Period must be monthly or yearly'),
  body('gateway').isString().withMessage('Gateway is required'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
];

const createPlan = [
  ...createPlanValidation,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in create plan request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      // Check if user has admin role
      if (req.user.role.name !== 'admin') {
        logger.warn('Non-admin user attempted to create plan', { 
          userId: req.user.uuid,
          userRole: req.user.role.name
        });
        return res.status(403).json({
          status: 'error',
          message: 'This action requires admin privileges'
        });
      }

      // Validate gateway
      if (!paymentConfig.isGatewayEnabled(req.body.gateway)) {
        logger.warn('Unsupported gateway in create plan request', { gateway: req.body.gateway });
        return res.status(400).json({
          status: 'error',
          message: `Payment gateway '${req.body.gateway}' is not enabled or does not exist`
        });
      }

      const planData = {
        name: req.body.name,
        amount: req.body.amount,
        interval: req.body.billing_interval,
        period: req.body.period,
        gateway: req.body.gateway,
        metadata: req.body.metadata || {}
      };

      logger.info('Creating subscription plan', { 
        name: planData.name,
        amount: planData.amount,
        adminUserId: req.user.uuid
      });
      
      const result = await subscriptionService.createPlan(planData);
      
      if (result.status === 'error') {
        logger.error('Error creating subscription plan', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('Subscription plan created successfully', { planId: result.plan.plan_id });
      res.status(201).json(result);
    } catch (error) {
      logger.error('Unexpected error in createPlan', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const subscribeValidation = [
  body('planId').isString().withMessage('Plan ID is required'),
  body('gateway').optional().isString().withMessage('Gateway must be a string'),
  body('customer').isObject().withMessage('Customer information is required'),
  body('customer.name').optional().isString().withMessage('Customer name must be a string'),
  body('customer.email').optional().isEmail().withMessage('Valid email is required'),
  body('customer.contact').optional().isString().withMessage('Contact must be a string')
];

const subscribe = [
  ...subscribeValidation,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in subscribe request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const subscriptionData = {
        planId: req.body.planId,
        gateway: req.body.gateway || paymentConfig.defaultGateway,
        customer: req.body.customer
      };

      logger.info('Creating subscription', { 
        planId: subscriptionData.planId,
        userId: req.user.uuid
      });
      
      const result = await subscriptionService.subscribe(subscriptionData, req.user.uuid);
      
      if (result.status === 'error') {
        logger.error('Error creating subscription', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('Subscription created successfully', { 
        subscriptionId: result.subscription.subscription_id,
        status: result.subscription.status
      });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in subscribe', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const createSubscriptionOrderValidation = [
  body('subscription_id').isString().withMessage('Subscription ID is required')
];

const createSubscriptionOrder = [
  ...createSubscriptionOrderValidation,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in create subscription order request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const subscriptionId = req.body.subscription_id;
      logger.info('Creating subscription order', { 
        subscriptionId,
        userId: req.user.uuid
      });
      
      const result = await subscriptionService.createSubscriptionOrder(subscriptionId, req.user.uuid);
      
      if (result.status === 'error') {
        logger.error('Error creating subscription order', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('Subscription order created successfully', { 
        orderId: result.payment.order_id,
        paymentId: result.payment.id,
        subscriptionId
      });
      res.status(201).json(result);
    } catch (error) {
      logger.error('Unexpected error in createSubscriptionOrder', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const getAllPlans = [
  async (req, res) => {
    try {
      logger.info('Getting all subscription plans');
      const result = await subscriptionService.getAllPlans();
      
      if (result.status === 'error') {
        logger.error('Error getting subscription plans', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('Subscription plans retrieved', { count: result.plans.length });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in getAllPlans', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const getPlanDetails = [
  param('plan_id').isString().withMessage('Plan ID is required'),
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in get plan details request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const planId = req.params.plan_id;
      logger.info('Getting plan details', { planId });
      
      const result = await subscriptionService.getPlan(planId);
      
      if (result.status === 'error') {
        logger.error('Error getting plan details', { error: result.message });
        return res.status(404).json(result);
      }
      
      logger.info('Plan details retrieved', { planId });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in getPlanDetails', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const getUserSubscriptions = [
  async (req, res) => {
    try {
      logger.info('Getting user subscriptions', { userId: req.user.uuid });
      const result = await subscriptionService.getUserSubscriptions(req.user.uuid);
      
      if (result.status === 'error') {
        logger.error('Error getting user subscriptions', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('User subscriptions retrieved', { 
        userId: req.user.uuid,
        count: result.subscriptions.length
      });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in getUserSubscriptions', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const cancelSubscriptionValidation = [
  body('subscription_id').isString().withMessage('Subscription ID is required')
];

const cancelSubscription = [
  ...cancelSubscriptionValidation,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in cancel subscription request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const subscriptionId = req.body.subscription_id;
      logger.info('Cancelling subscription', { 
        subscriptionId,
        userId: req.user.uuid
      });
      
      const result = await subscriptionService.cancelSubscription(subscriptionId, req.user.uuid);
      
      if (result.status === 'error') {
        logger.error('Error cancelling subscription', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('Subscription cancelled successfully', { 
        subscriptionId,
        status: result.subscription.status
      });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in cancelSubscription', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

const verifySubscriptionPaymentValidation = [
  body('subscription_id').isString().withMessage('Subscription ID is required'),
  body('order_id').isString().withMessage('Order ID is required'),
  body('razorpay_order_id').optional().isString(),
  body('razorpay_payment_id').optional().isString(),
  body('razorpay_signature').optional().isString()
];

const verifySubscriptionPayment = [
  ...verifySubscriptionPaymentValidation,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in verify subscription payment request', { errors: errors.array() });
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const { subscription_id, ...paymentData } = req.body;
      logger.info('Verifying subscription payment', { 
        subscriptionId: subscription_id,
        orderId: paymentData.order_id,
        userId: req.user.uuid
      });
      
      // Verify the subscription payment
      const result = await subscriptionService.verifySubscriptionPayment(
        paymentData, 
        subscription_id, 
        req.user.uuid
      );
      
      if (result.status === 'error') {
        logger.error('Subscription payment verification failed', { error: result.message });
        return res.status(400).json(result);
      }
      
      logger.info('Subscription payment verified successfully', { 
        subscriptionId: subscription_id,
        status: result.subscription.status
      });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Unexpected error in verifySubscriptionPayment', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'An unexpected error occurred',
        error: error.message
      });
    }
  }
];

// Webhook handler
const handleWebhook = (req, res) => {
  try {
    const gateway = req.params.gateway;
    logger.info('Received webhook from gateway', { gateway });
    
    // This will be implemented in Milestone 4
    logger.warn('Webhook handling not implemented yet');
    res.status(501).json({
      status: 'error',
      message: 'Webhook handling not implemented yet'
    });
  } catch (error) {
    logger.error('Unexpected error in handleWebhook', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getPaymentDetails,
  getUserPayments,
  getOrderDetails,
  getUserOrders,
  createPlan,
  subscribe,
  createSubscriptionOrder,
  getAllPlans,
  getPlanDetails,
  getUserSubscriptions,
  cancelSubscription,
  verifySubscriptionPayment,
  handleWebhook
}; 