/**
 * API Routes for Payment Microservice
 */
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

// Apply authentication middleware to all API routes
router.use(requireAuth);

// Log API requests
router.use((req, res, next) => {
  logger.info(`API Request: ${req.method} ${req.originalUrl}`, {
    userId: req.user?.uuid,
    method: req.method
  });
  next();
});

// Payment endpoints
router.post('/payment/create-order', paymentController.createOrder);
router.post('/payment/verify-payment', paymentController.verifyPayment);
router.get('/payment/status/:order_id', paymentController.getPaymentStatus);
router.get('/payment/details/:payment_id', paymentController.getPaymentDetails);
router.get('/payment/user-payments', paymentController.getUserPayments);

// Order endpoints
router.get('/order/:order_id', paymentController.getOrderDetails);
router.get('/orders', paymentController.getUserOrders);

// Plan endpoints
router.post('/payment/create-plan', paymentController.createPlan);
router.get('/payment/plans', paymentController.getAllPlans);
router.get('/payment/plan/:plan_id', paymentController.getPlanDetails);

// Subscription endpoints
router.post('/payment/subscribe', paymentController.subscribe);
router.post('/payment/create-subscription-order', paymentController.createSubscriptionOrder);
router.post('/payment/verify-subscription-payment', paymentController.verifySubscriptionPayment);
router.get('/payment/subscriptions', paymentController.getUserSubscriptions);
router.post('/payment/cancel-subscription', paymentController.cancelSubscription);

// Webhook endpoint (no auth required)
router.post('/payment/webhook/:gateway', (req, res, next) => {
  // Webhooks bypass the auth middleware
  next();
}, paymentController.handleWebhook);

module.exports = router; 