/**
 * Webhook Routes
 * Handles incoming webhooks from payment providers
 */
const express = require('express');
const router = express.Router();
const gatewayFactory = require('../services/gateway.factory');
const paymentModel = require('../models/payment.model');
const logger = require('../utils/logger');
const webhookController = require('../controllers/webhook.controller');

/**
 * @route POST /api/webhook/:gateway
 * @description Handle webhooks from a specific payment gateway
 * @access Public (needs signature verification)
 */
router.post('/:gateway', async (req, res) => {
  try {
    const { gateway } = req.params;
    
    // Check if gateway is supported
    if (!gatewayFactory.isSupported(gateway)) {
      logger.warn(`Webhook received for unsupported gateway: ${gateway}`);
      return res.status(400).json({
        status: 'error',
        message: `Unsupported payment gateway: ${gateway}`
      });
    }
    
    logger.info(`Received webhook from ${gateway}`);
    
    // Get gateway instance
    const gatewayInstance = gatewayFactory.getGateway(gateway);
    
    // Process webhook
    const result = await gatewayInstance.processWebhook(req.body);
    
    // Return success
    res.status(200).json({
      status: 'success',
      message: 'Webhook processed'
    });
    
    // Update payment status if applicable (asynchronously)
    if (result && result.order_id && result.status) {
      try {
        const payment = await paymentModel.getPaymentByOrderId(result.order_id);
        await paymentModel.updatePaymentStatus(payment.id, result.status, {
          error_message: result.message || null
        });
        logger.info(`Updated payment status for order ${result.order_id} to ${result.status}`);
      } catch (error) {
        logger.error(`Error updating payment from webhook: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error('Error processing webhook:', error);
    
    // Always return 200 to avoid re-delivery attempts
    res.status(200).json({
      status: 'error',
      message: 'Error processing webhook, but acknowledged'
    });
  }
});

/**
 * @route POST /api/payment/webhook/razorpay
 * @description Handle Razorpay payment webhooks
 * @access Public (needs signature verification)
 */
router.post('/razorpay', webhookController.handleRazorpayWebhook);

/**
 * @route POST /api/payment/webhook/razorpay/subscription
 * @description Handle Razorpay subscription webhooks
 * @access Public (needs signature verification)
 */
router.post('/razorpay/subscription', webhookController.handleRazorpaySubscriptionWebhook);

module.exports = router; 