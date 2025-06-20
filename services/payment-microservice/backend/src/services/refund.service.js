const gatewayFactory = require('./gateway.factory');
const refundModel = require('../models/refund.model');
const paymentModel = require('../models/payment.model');
const logger = require('../utils/logger');
const firebase = require('../utils/firebase');

class RefundService {
  /**
   * Initiate a refund
   * @param {Object} refundData - Refund information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Refund details
   */
  async initiateRefund(refundData, userId) {
    try {
      logger.info('Initiating refund', { refundData, userId });

      // Get payment record
      const payment = await paymentModel.getPaymentById(refundData.payment_id);

      // Verify user has permission
      if (payment.user_id !== userId) {
        throw new Error('You do not have permission to refund this payment');
      }

      // Verify payment is eligible for refund
      if (payment.status !== 'success') {
        throw new Error('Only successful payments can be refunded');
      }

      // Get gateway instance
      const gatewayInstance = gatewayFactory.getGateway(payment.gateway);

      // Initiate refund with gateway
      const refundResult = await gatewayInstance.initiateRefund({
        payment_id: payment.transaction_id,
        amount: refundData.amount,
        reason: refundData.reason
      });

      // Create refund record
      const refund = await refundModel.createRefund({
        payment_id: payment.id,
        amount: refundData.amount,
        reason: refundData.reason,
        user_id: userId,
        gateway: payment.gateway,
        status: 'initiated',
        metadata: {
          gateway_response: refundResult
        }
      });

      // Update payment refund status
      await paymentModel.updatePaymentStatus(payment.id, 'refund_initiated', {
        refund_id: refund.id
      });

      // Broadcast refund event
      await this.broadcastRefundEvent(refund);

      return {
        status: 'success',
        refund: {
          id: refund.id,
          payment_id: refund.payment_id,
          amount: refund.amount,
          status: refund.status,
          created_at: refund.created_at
        }
      };
    } catch (error) {
      logger.error('Error initiating refund:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Get refund details
   * @param {number} refundId - Refund ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Refund details
   */
  async getRefundDetails(refundId, userId) {
    try {
      const refund = await refundModel.getRefundById(refundId);

      // Verify user has permission
      if (refund.user_id !== userId) {
        throw new Error('You do not have permission to view this refund');
      }

      return {
        status: 'success',
        refund: {
          id: refund.id,
          payment_id: refund.payment_id,
          amount: refund.amount,
          reason: refund.reason,
          status: refund.status,
          created_at: refund.created_at,
          updated_at: refund.updated_at,
          metadata: refund.metadata
        }
      };
    } catch (error) {
      logger.error('Error getting refund details:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Get refunds for a payment
   * @param {number} paymentId - Payment ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - List of refunds
   */
  async getPaymentRefunds(paymentId, userId) {
    try {
      const payment = await paymentModel.getPaymentById(paymentId);

      // Verify user has permission
      if (payment.user_id !== userId) {
        throw new Error('You do not have permission to view these refunds');
      }

      const refunds = await refundModel.getRefundsByPaymentId(paymentId);

      return {
        status: 'success',
        refunds: refunds.map(refund => ({
          id: refund.id,
          amount: refund.amount,
          reason: refund.reason,
          status: refund.status,
          created_at: refund.created_at,
          updated_at: refund.updated_at
        }))
      };
    } catch (error) {
      logger.error('Error getting payment refunds:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Process refund webhook
   * @param {string} event - Event type
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async processRefundWebhook(event, payload) {
    try {
      logger.info('Processing refund webhook', { event, payload });

      const refund = payload.refund.entity;
      
      // Update refund status
      await refundModel.updateRefundStatus(
        refund.id,
        this.mapRefundStatus(refund.status),
        {
          gateway_refund_id: refund.id,
          gateway_response: refund
        }
      );

      // Update payment status if refund is completed
      if (refund.status === 'processed') {
        const payment = await paymentModel.getPaymentByTransactionId(refund.payment_id);
        await paymentModel.updatePaymentStatus(payment.id, 'refunded');
      }

      // Broadcast refund event
      await this.broadcastRefundEvent(refund);

      return {
        status: 'success',
        message: 'Refund webhook processed successfully'
      };
    } catch (error) {
      logger.error('Error processing refund webhook:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Broadcast refund event through Firebase
   * @param {Object} refund - Refund record
   */
  async broadcastRefundEvent(refund) {
    try {
      await firebase.database().ref(`refunds/${refund.id}`).update({
        ...refund,
        updated_at: new Date().toISOString()
      });

      // Add to refund history
      await firebase.database().ref(`refunds/${refund.id}/history`).push({
        ...refund,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Broadcasted refund event for refund ${refund.id}`);
    } catch (error) {
      logger.error(`Error broadcasting refund event for refund ${refund.id}:`, error);
    }
  }

  /**
   * Map gateway refund status to internal status
   * @param {string} status - Gateway status
   * @returns {string} - Internal status
   */
  mapRefundStatus(status) {
    const statusMap = {
      'initiated': 'initiated',
      'processed': 'completed',
      'failed': 'failed'
    };
    return statusMap[status] || status;
  }
}

module.exports = new RefundService(); 