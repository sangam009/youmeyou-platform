const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

/**
 * Payment Model
 * Handles database operations for payments
 */
class PaymentModel {
  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} - Created payment record
   */
  async createPayment(paymentData) {
    const {
      order_id,
      amount,
      user_id,
      gateway,
      type = 'one-time',
      subscription_id = null,
      status = 'created',
      metadata = {}
    } = paymentData;

    // Calculate expiry time
    const expiryMinutes = process.env.ORDER_EXPIRY_MINUTES || 60;
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + parseInt(expiryMinutes));

    // Generate a unique transaction ID
    const transaction_id = uuidv4();

    const query = `
      INSERT INTO payments (
        order_id, amount, user_id, gateway, type, 
        subscription_id, status, expires_at, transaction_id, metadata
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      order_id,
      amount,
      user_id,
      gateway,
      type,
      subscription_id,
      status,
      expiryDate,
      transaction_id,
      JSON.stringify(metadata)
    ];

    try {
      const result = await db.query(query, params);
      return this.getPaymentById(result.insertId);
    } catch (error) {
      console.error('Error creating payment record:', error);
      throw new Error('Failed to create payment record');
    }
  }

  /**
   * Get a payment by its ID
   * @param {number} id - Internal payment ID
   * @returns {Promise<Object>} - Payment record
   */
  async getPaymentById(id) {
    const query = 'SELECT * FROM payments WHERE id = ?';
    try {
      const payments = await db.query(query, [id]);
      
      if (payments.length === 0) {
        throw new Error('Payment not found');
      }
      
      const payment = payments[0];
      
      // Parse JSON fields safely
      try {
        if (payment.metadata && typeof payment.metadata === 'string') {
          payment.metadata = JSON.parse(payment.metadata);
        } else if (payment.metadata === null) {
          payment.metadata = {};
        }
      } catch (jsonError) {
        console.error('Error parsing payment metadata JSON:', jsonError);
        payment.metadata = {};
      }
      
      return payment;
    } catch (error) {
      console.error('Error fetching payment by ID:', error);
      throw error;
    }
  }

  /**
   * Get a payment by its order ID
   * @param {string} orderId - Order ID from payment gateway
   * @returns {Promise<Object>} - Payment record
   */
  async getPaymentByOrderId(orderId) {
    const query = 'SELECT * FROM payments WHERE order_id = ?';
    try {
      const payments = await db.query(query, [orderId]);
      
      if (payments.length === 0) {
        throw new Error('Payment not found');
      }
      
      const payment = payments[0];
      
      // Parse JSON fields safely
      try {
        if (payment.metadata && typeof payment.metadata === 'string') {
          payment.metadata = JSON.parse(payment.metadata);
        } else if (payment.metadata === null) {
          payment.metadata = {};
        }
      } catch (jsonError) {
        console.error('Error parsing payment metadata JSON:', jsonError);
        payment.metadata = {};
      }
      
      return payment;
    } catch (error) {
      console.error('Error fetching payment by order ID:', error);
      throw error;
    }
  }

  /**
   * Get a payment by its transaction ID
   * @param {string} transactionId - Internal transaction ID
   * @returns {Promise<Object>} - Payment record
   */
  async getPaymentByTransactionId(transactionId) {
    const query = 'SELECT * FROM payments WHERE transaction_id = ?';
    try {
      const payments = await db.query(query, [transactionId]);
      
      if (payments.length === 0) {
        throw new Error('Payment not found');
      }
      
      const payment = payments[0];
      
      // Parse JSON fields safely
      try {
        if (payment.metadata && typeof payment.metadata === 'string') {
          payment.metadata = JSON.parse(payment.metadata);
        } else if (payment.metadata === null) {
          payment.metadata = {};
        }
      } catch (jsonError) {
        console.error('Error parsing payment metadata JSON:', jsonError);
        payment.metadata = {};
      }
      
      return payment;
    } catch (error) {
      console.error('Error fetching payment by transaction ID:', error);
      throw error;
    }
  }

  /**
   * Update a payment's status
   * @param {number} id - Payment ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional fields to update
   * @returns {Promise<Object>} - Updated payment record
   */
  async updatePaymentStatus(id, status, additionalData = {}) {
    try {
      // Prepare update data
      const updateData = {
        status,
        updated_at: new Date()
      };

      // Add transaction_id if provided (this is our column name for gateway_payment_id)
      if (additionalData.gateway_payment_id) {
        updateData.transaction_id = additionalData.gateway_payment_id;
      }

      // Add metadata for gateway_response
      if (additionalData.gateway_response) {
        updateData.metadata = {
          ...additionalData,
          gateway_response: additionalData.gateway_response
        };
      }

      // Build dynamic update query
      const updateFields = [];
      const params = [];
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (key === 'metadata' && value !== null) {
          updateFields.push(`${key} = ?`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      });
      
      params.push(id); // Add id for WHERE clause
      
      const query = `
        UPDATE payments 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await db.query(query, params);
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new Error('Failed to update payment status');
    }
  }

  /**
   * Get all payments for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - List of payment records
   */
  async getUserPayments(userId, limit = 10, offset = 0) {
    const query = `
      SELECT * FROM payments 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    try {
      const payments = await db.query(query, [userId, limit, offset]);
      
      // Parse JSON fields
      return payments.map(payment => {
        if (payment.metadata) {
          payment.metadata = JSON.parse(payment.metadata);
        }
        return payment;
      });
    } catch (error) {
      console.error('Error fetching user payments:', error);
      throw new Error('Failed to fetch user payments');
    }
  }

  /**
   * Find payments that have expired but are still in created/pending status
   * @returns {Promise<Array>} - List of expired payment records
   */
  async findExpiredPayments() {
    const query = `
      SELECT * FROM payments 
      WHERE (status = 'created' OR status = 'pending') 
      AND expires_at < NOW()
    `;

    try {
      const payments = await db.query(query);
      
      // Parse JSON fields
      return payments.map(payment => {
        if (payment.metadata) {
          payment.metadata = JSON.parse(payment.metadata);
        }
        return payment;
      });
    } catch (error) {
      console.error('Error finding expired payments:', error);
      throw new Error('Failed to find expired payments');
    }
  }

  /**
   * Mark expired payments as expired
   * @returns {Promise<number>} - Number of payments updated
   */
  async markExpiredPayments() {
    const query = `
      UPDATE payments 
      SET status = 'expired', updated_at = NOW() 
      WHERE (status = 'created' OR status = 'pending') 
      AND expires_at < NOW()
    `;

    try {
      const result = await db.query(query);
      return result.affectedRows;
    } catch (error) {
      console.error('Error marking expired payments:', error);
      throw new Error('Failed to mark expired payments');
    }
  }

  /**
   * Get payment with computed status (checks expiry)
   * @param {number} id - Payment ID
   * @returns {Promise<Object>} - Payment record with computed status
   */
  async getPaymentWithComputedStatus(id) {
    try {
      const payment = await this.getPaymentById(id);
      
      // Check if payment is expired
      if (
        (payment.status === 'created' || payment.status === 'pending') &&
        new Date(payment.expires_at) < new Date()
      ) {
        // Update status to expired
        await this.updatePaymentStatus(id, 'expired');
        payment.status = 'expired';
      }
      
      return payment;
    } catch (error) {
      console.error('Error getting payment with computed status:', error);
      throw error;
    }
  }

  /**
   * Get all payments for a subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Array>} - List of payment records for the subscription
   */
  async getPaymentsBySubscriptionId(subscriptionId) {
    const query = `
      SELECT * FROM payments 
      WHERE subscription_id = ? 
      ORDER BY created_at DESC
    `;

    try {
      const payments = await db.query(query, [subscriptionId]);
      
      // Parse JSON fields
      return payments.map(payment => {
        try {
          if (payment.metadata && typeof payment.metadata === 'string') {
            payment.metadata = JSON.parse(payment.metadata);
          } else if (payment.metadata === null) {
            payment.metadata = {};
          }
        } catch (jsonError) {
          console.error('Error parsing payment metadata JSON:', jsonError);
          payment.metadata = {};
        }
        return payment;
      });
    } catch (error) {
      console.error(`Error fetching payments for subscription ${subscriptionId}:`, error);
      throw new Error('Failed to fetch subscription payments');
    }
  }

  /**
   * Get pending payments for verification
   * @param {number} limit - Maximum number of payments to return
   * @returns {Promise<Array>} - Array of pending payments
   */
  async getPendingPayments(limit = 50) {
    const query = `
      SELECT * FROM payments 
      WHERE status IN ('created', 'pending')
      AND expires_at > NOW()
      ORDER BY created_at ASC
      LIMIT ?
    `;

    try {
      const [rows] = await db.query(query, [limit]);
      return rows;
    } catch (error) {
      console.error('Error getting pending payments:', error);
      throw new Error('Failed to get pending payments');
    }
  }

  /**
   * Get failed payments eligible for retry
   * @param {number} maxRetries - Maximum number of retries allowed
   * @param {number} limit - Maximum number of payments to return
   * @returns {Promise<Array>} - Array of failed payments
   */
  async getFailedPaymentsForRetry(maxRetries = 3, limit = 50) {
    const query = `
      SELECT * FROM payments 
      WHERE status = 'failed'
      AND retry_count < ?
      AND (last_retry_at IS NULL OR last_retry_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE))
      ORDER BY created_at ASC
      LIMIT ?
    `;

    try {
      const [rows] = await db.query(query, [maxRetries, limit]);
      return rows;
    } catch (error) {
      console.error('Error getting failed payments for retry:', error);
      throw new Error('Failed to get failed payments for retry');
    }
  }

  /**
   * Get payments with recent status changes
   * @param {number} minutes - Number of minutes to look back
   * @returns {Promise<Array>} - List of payment records
   */
  async getRecentStatusChanges(minutes = 5) {
    // Validate input
    if (typeof minutes !== 'number' || minutes <= 0) {
      console.warn('Invalid minutes parameter:', minutes, 'using default value of 5');
      minutes = 5;
    }

    const query = `
      SELECT 
        p.*,
        TIMESTAMPDIFF(MINUTE, p.updated_at, NOW()) as minutes_ago
      FROM payments p
      WHERE p.updated_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
      AND p.status IS NOT NULL
      ORDER BY p.updated_at DESC
    `;

    try {
      console.log(`Fetching payments updated in the last ${minutes} minutes`);
      const payments = await db.query(query, [minutes]);
      
      if (!Array.isArray(payments)) {
        console.error('Database query did not return an array:', payments);
        return [];
      }

      console.log(`Found ${payments.length} payments with recent status changes`);
      
      // Parse JSON fields and return empty array if no payments found
      return payments.map(payment => {
        try {
          // Ensure all required fields are present
          if (!payment.id || !payment.order_id || !payment.status) {
            console.warn('Payment record missing required fields:', payment);
            return null;
          }

          // Parse metadata safely
          if (payment.metadata) {
            try {
              payment.metadata = JSON.parse(payment.metadata);
            } catch (error) {
              console.error('Error parsing payment metadata:', error, 'for payment:', payment.id);
              payment.metadata = {};
            }
          } else {
            payment.metadata = {};
          }

          // Add computed fields
          payment.minutes_since_update = payment.minutes_ago;
          delete payment.minutes_ago; // Remove the raw field

          return payment;
        } catch (error) {
          console.error('Error processing payment record:', error, 'for payment:', payment?.id);
          return null;
        }
      }).filter(Boolean); // Remove any null entries from failed processing
    } catch (error) {
      console.error('Error fetching recent status changes:', error);
      // Log additional context
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState
      });
      return []; // Return empty array on error
    }
  }

  /**
   * Update payment retry information
   * @param {number} paymentId - Payment ID
   * @param {boolean} success - Whether retry was successful
   * @param {string} errorMessage - Error message if retry failed
   * @returns {Promise<void>}
   */
  async updatePaymentRetry(paymentId, success, errorMessage = null) {
    const query = `
      UPDATE payments 
      SET 
        retry_count = retry_count + 1,
        last_retry_at = NOW(),
        status = ?,
        error_message = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    try {
      await db.query(query, [
        success ? 'pending' : 'failed',
        errorMessage,
        paymentId
      ]);
    } catch (error) {
      console.error('Error updating payment retry:', error);
      throw new Error('Failed to update payment retry');
    }
  }

  /**
   * Get user details for a payment
   * @param {number} paymentId - Payment ID
   * @returns {Promise<Object>} - User details
   */
  async getPaymentUser(paymentId) {
    const query = `
      SELECT u.* 
      FROM users u
      JOIN payments p ON p.user_id = u.id
      WHERE p.id = ?
    `;

    try {
      const [rows] = await db.query(query, [paymentId]);
      return rows[0];
    } catch (error) {
      console.error('Error getting payment user:', error);
      throw new Error('Failed to get payment user');
    }
  }
}

module.exports = new PaymentModel(); 