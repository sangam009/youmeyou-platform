const webhookService = require('../services/webhook.service');
const logger = require('../utils/logger');

/**
 * Handle Razorpay payment webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = req.body;

    // Verify webhook signature
    if (!webhookService.verifyWebhook(payload, signature)) {
      logger.warn('Invalid webhook signature', {
        signature,
        payload
      });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook signature'
      });
    }

    // Process webhook based on event type
    const event = payload.event;
    let result;

    if (event.startsWith('payment.')) {
      result = await webhookService.processPaymentWebhook(event, payload);
    } else if (event.startsWith('subscription.')) {
      result = await webhookService.processSubscriptionWebhook(event, payload);
    } else {
      logger.warn('Unsupported webhook event', { event });
      return res.status(400).json({
        status: 'error',
        message: 'Unsupported webhook event'
      });
    }

    // Return appropriate response
    if (result.status === 'success') {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error('Error handling webhook', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      headers: req.headers
    });

    // Always return 200 to avoid re-delivery attempts
    res.status(200).json({
      status: 'error',
      message: 'Error processing webhook, but acknowledged'
    });
  }
};

/**
 * Handle Razorpay subscription webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleRazorpaySubscriptionWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = req.body;

    // Verify webhook signature
    if (!webhookService.verifyWebhook(payload, signature)) {
      logger.warn('Invalid webhook signature', {
        signature,
        payload
      });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook signature'
      });
    }

    // Process subscription webhook
    const event = payload.event;
    if (!event.startsWith('subscription.')) {
      logger.warn('Invalid subscription webhook event', { event });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid subscription webhook event'
      });
    }

    const result = await webhookService.processSubscriptionWebhook(event, payload);

    // Return appropriate response
    if (result.status === 'success') {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error('Error handling subscription webhook', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      headers: req.headers
    });

    // Always return 200 to avoid re-delivery attempts
    res.status(200).json({
      status: 'error',
      message: 'Error processing webhook, but acknowledged'
    });
  }
};

module.exports = {
  handleRazorpayWebhook,
  handleRazorpaySubscriptionWebhook
}; 