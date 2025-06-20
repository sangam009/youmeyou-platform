/**
 * Payment Routes
 */
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const refundService = require('../services/refund.service');
const authMiddleware = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

// All payment routes require authentication
router.use(authMiddleware.authenticate);

// Payment endpoints
router.post('/orders', paymentController.createOrder);
router.get('/orders/:order_id/status', paymentController.getPaymentStatus);
router.get('/orders/:order_id/details', paymentController.getPaymentDetails);
router.get('/orders', paymentController.getUserPayments);
router.post('/orders/:order_id/verify', paymentController.verifyPayment);

// Subscription endpoints
router.post('/plans', authMiddleware.requireRole('admin'), paymentController.createPlan);
router.get('/plans', paymentController.getAllPlans);
router.get('/plans/:plan_id', paymentController.getPlanDetails);
router.post('/subscriptions', paymentController.subscribe);
router.get('/subscriptions', paymentController.getUserSubscriptions);
router.post('/subscriptions/:subscription_id/cancel', paymentController.cancelSubscription);
router.post('/subscriptions/verify', paymentController.verifySubscriptionPayment);

// Refund endpoints
router.post('/refunds', authMiddleware.requireRole('user'), async (req, res) => {
  try {
    const result = await refundService.initiateRefund(req.body, req.user.id);
    res.json(result);
  } catch (error) {
    logger.error('Error in refund initiation route:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

router.get('/refunds/:refund_id', authMiddleware.requireRole('user'), async (req, res) => {
  try {
    const result = await refundService.getRefundDetails(req.params.refund_id, req.user.id);
    res.json(result);
  } catch (error) {
    logger.error('Error in refund details route:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

router.get('/orders/:order_id/refunds', authMiddleware.requireRole('user'), async (req, res) => {
  try {
    const result = await refundService.getPaymentRefunds(req.params.order_id, req.user.id);
    res.json(result);
  } catch (error) {
    logger.error('Error in payment refunds route:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Webhook handler (no authentication)
router.post('/webhook', authMiddleware.bypassAuth, paymentController.handleWebhook);

module.exports = router; 