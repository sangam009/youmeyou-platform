const cron = require('node-cron');
const paymentModel = require('../models/payment.model');
const paymentService = require('./payment.service');
const logger = require('../utils/logger');
const firebase = require('../utils/firebase');

class ReconciliationService {
  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      retryIntervals: [5, 15, 30], // minutes
      batchSize: 50
    };
  }

  /**
   * Initialize reconciliation jobs
   */
  init() {
    logger.info('Initializing reconciliation jobs');

    // Payment verification job (runs every hour)
    this.verificationJob = cron.schedule('0 * * * *', () => {
      this.verifyPendingPayments()
        .catch(error => logger.error('Error in payment verification job:', error));
    });

    // Failed payment retry job (runs every 15 minutes)
    this.retryJob = cron.schedule('*/15 * * * *', () => {
      this.processFailedPayments()
        .catch(error => logger.error('Error in failed payment retry job:', error));
    });

    // Status tracking job (runs every 5 minutes)
    this.trackingJob = cron.schedule('*/5 * * * *', () => {
      this.trackPaymentStatuses()
        .catch(error => logger.error('Error in payment status tracking job:', error));
    });

    logger.info('Reconciliation jobs initialized');
  }

  /**
   * Stop all reconciliation jobs
   */
  stop() {
    if (this.verificationJob) this.verificationJob.stop();
    if (this.retryJob) this.retryJob.stop();
    if (this.trackingJob) this.trackingJob.stop();
    logger.info('Reconciliation jobs stopped');
  }

  /**
   * Verify pending payments with payment gateway
   */
  async verifyPendingPayments() {
    try {
      logger.info('Starting payment verification job');

      // Get pending payments
      const pendingPayments = await paymentModel.getPendingPayments(this.retryConfig.batchSize);

      for (const payment of pendingPayments) {
        try {
          // Verify payment with gateway
          const verificationResult = await paymentService.verifyPayment({
            order_id: payment.order_id,
            payment_id: payment.transaction_id
          });

          // Update payment status
          await paymentModel.updatePaymentStatus(
            payment.id,
            verificationResult.status,
            verificationResult.error_message
          );

          // Broadcast status update
          await this.broadcastStatusUpdate(payment.id, verificationResult);

          logger.info(`Verified payment ${payment.id}: ${verificationResult.status}`);
        } catch (error) {
          logger.error(`Error verifying payment ${payment.id}:`, error);
        }
      }

      logger.info('Payment verification job completed');
    } catch (error) {
      logger.error('Error in payment verification job:', error);
      throw error;
    }
  }

  /**
   * Process failed payments for retry
   */
  async processFailedPayments() {
    try {
      logger.info('Starting failed payment retry job');

      // Get failed payments eligible for retry
      const failedPayments = await paymentModel.getFailedPaymentsForRetry(
        this.retryConfig.maxRetries,
        this.retryConfig.batchSize
      );

      for (const payment of failedPayments) {
        try {
          // Check if enough time has passed since last retry
          const retryInterval = this.retryConfig.retryIntervals[payment.retry_count] || 30;
          const lastRetryTime = new Date(payment.last_retry_at);
          const timeSinceLastRetry = (Date.now() - lastRetryTime.getTime()) / (1000 * 60); // minutes

          if (timeSinceLastRetry < retryInterval) {
            continue;
          }

          // Attempt to retry payment
          const retryResult = await paymentService.retryPayment(payment);

          // Update retry count and status
          await paymentModel.updatePaymentRetry(
            payment.id,
            retryResult.success,
            retryResult.error_message
          );

          // Broadcast status update
          await this.broadcastStatusUpdate(payment.id, retryResult);

          logger.info(`Retried payment ${payment.id}: ${retryResult.status}`);
        } catch (error) {
          logger.error(`Error retrying payment ${payment.id}:`, error);
        }
      }

      logger.info('Failed payment retry job completed');
    } catch (error) {
      logger.error('Error in failed payment retry job:', error);
      throw error;
    }
  }

  /**
   * Track payment statuses and send notifications
   */
  async trackPaymentStatuses() {
    try {
      logger.info('Starting payment status tracking job');

      // Get payments with recent status changes
      const recentPayments = await paymentModel.getRecentStatusChanges(5); // last 5 minutes

      for (const payment of recentPayments) {
        try {
          // Prepare status update
          const statusUpdate = {
            payment_id: payment.id,
            order_id: payment.order_id,
            status: payment.status,
            updated_at: payment.updated_at,
            error_message: payment.error_message
          };

          // Broadcast status update
          await this.broadcastStatusUpdate(payment.id, statusUpdate);

          // Send notification if needed
          if (this.shouldSendNotification(payment)) {
            await this.sendStatusNotification(payment);
          }

          logger.info(`Tracked payment ${payment.id}: ${payment.status}`);
        } catch (error) {
          logger.error(`Error tracking payment ${payment.id}:`, error);
        }
      }

      logger.info('Payment status tracking job completed');
    } catch (error) {
      logger.error('Error in payment status tracking job:', error);
      throw error;
    }
  }

  /**
   * Broadcast payment status update through Firebase
   */
  async broadcastStatusUpdate(paymentId, statusUpdate) {
    try {
      await firebase.database().ref(`payments/${paymentId}/status`).update({
        ...statusUpdate,
        updated_at: new Date().toISOString()
      });

      // Add to status history
      await firebase.database().ref(`payments/${paymentId}/status_history`).push({
        ...statusUpdate,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Broadcasted status update for payment ${paymentId}`);
    } catch (error) {
      logger.error(`Error broadcasting status update for payment ${paymentId}:`, error);
    }
  }

  /**
   * Determine if notification should be sent for payment status
   */
  shouldSendNotification(payment) {
    // Send notification for important status changes
    const notifyStatuses = ['failed', 'expired', 'refunded'];
    return notifyStatuses.includes(payment.status);
  }

  /**
   * Send status notification for payment
   */
  async sendStatusNotification(payment) {
    try {
      // Get user details
      const user = await paymentModel.getPaymentUser(payment.id);

      // Prepare notification data
      const notification = {
        user_id: user.id,
        type: 'payment_status',
        title: `Payment ${payment.status}`,
        message: this.getStatusMessage(payment),
        data: {
          payment_id: payment.id,
          order_id: payment.order_id,
          status: payment.status,
          amount: payment.amount
        },
        created_at: new Date().toISOString()
      };

      // Store notification in Firebase
      await firebase.database().ref(`notifications/${user.id}`).push(notification);

      logger.info(`Sent status notification for payment ${payment.id}`);
    } catch (error) {
      logger.error(`Error sending status notification for payment ${payment.id}:`, error);
    }
  }

  /**
   * Get human-readable status message
   */
  getStatusMessage(payment) {
    const messages = {
      failed: 'Your payment has failed. Please try again.',
      expired: 'Your payment has expired. Please initiate a new payment.',
      refunded: 'Your payment has been refunded successfully.'
    };
    return messages[payment.status] || `Payment status: ${payment.status}`;
  }
}

module.exports = new ReconciliationService(); 