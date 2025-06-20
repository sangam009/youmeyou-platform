const express = require('express');
const router = express.Router();
const refundService = require('../services/refund.service');
const authMiddleware = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

/**
 * @route POST /api/payment/refund
 * @description Initiate a refund for a payment
 * @access Private (requires user authentication)
 */
router.post('/', authMiddleware.requireRole('user'), async (req, res) => {
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

/**
 * @route GET /api/payment/refund/:refundId
 * @description Get details of a specific refund
 * @access Private (requires user authentication)
 */
router.get('/:refundId', authMiddleware.requireRole('user'), async (req, res) => {
  try {
    const result = await refundService.getRefundDetails(req.params.refundId, req.user.id);
    res.json(result);
  } catch (error) {
    logger.error('Error in refund details route:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route GET /api/payment/refund/payment/:paymentId
 * @description Get all refunds for a payment
 * @access Private (requires user authentication)
 */
router.get('/payment/:paymentId', authMiddleware.requireRole('user'), async (req, res) => {
  try {
    const result = await refundService.getPaymentRefunds(req.params.paymentId, req.user.id);
    res.json(result);
  } catch (error) {
    logger.error('Error in payment refunds route:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router; 