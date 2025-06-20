const db = require('../config/database');
const logger = require('../utils/logger');

class RefundModel {
  /**
   * Create a new refund record
   * @param {Object} refundData - Refund information
   * @returns {Promise<Object>} - Created refund record
   */
  async createRefund(refundData) {
    const {
      payment_id,
      amount,
      reason,
      user_id,
      gateway,
      status = 'initiated',
      metadata = {}
    } = refundData;

    const query = `
      INSERT INTO refunds (
        payment_id, amount, reason, user_id, gateway,
        status, metadata, created_at, updated_at
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      payment_id,
      amount,
      reason,
      user_id,
      gateway,
      status,
      JSON.stringify(metadata)
    ];

    try {
      const result = await db.query(query, params);
      return this.getRefundById(result.insertId);
    } catch (error) {
      logger.error('Error creating refund record:', error);
      throw new Error('Failed to create refund record');
    }
  }

  /**
   * Get a refund by its ID
   * @param {number} id - Refund ID
   * @returns {Promise<Object>} - Refund record
   */
  async getRefundById(id) {
    const query = `
      SELECT r.*, p.order_id, p.transaction_id 
      FROM refunds r
      JOIN payments p ON r.payment_id = p.id
      WHERE r.id = ?
    `;

    try {
      const [refund] = await db.query(query, [id]);
      
      if (!refund) {
        throw new Error('Refund not found');
      }

      // Parse JSON fields
      if (refund.metadata) {
        refund.metadata = JSON.parse(refund.metadata);
      }

      return refund;
    } catch (error) {
      logger.error('Error fetching refund by ID:', error);
      throw error;
    }
  }

  /**
   * Update refund status
   * @param {number} id - Refund ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional fields to update
   * @returns {Promise<Object>} - Updated refund record
   */
  async updateRefundStatus(id, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        updated_at: new Date()
      };

      if (additionalData.gateway_refund_id) {
        updateData.gateway_refund_id = additionalData.gateway_refund_id;
      }

      if (additionalData.gateway_response) {
        updateData.metadata = {
          ...additionalData,
          gateway_response: additionalData.gateway_response
        };
      }

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
      
      params.push(id);
      
      const query = `
        UPDATE refunds 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await db.query(query, params);
      return this.getRefundById(id);
    } catch (error) {
      logger.error('Error updating refund status:', error);
      throw new Error('Failed to update refund status');
    }
  }

  /**
   * Get refunds for a payment
   * @param {number} paymentId - Payment ID
   * @returns {Promise<Array>} - List of refund records
   */
  async getRefundsByPaymentId(paymentId) {
    const query = `
      SELECT * FROM refunds 
      WHERE payment_id = ? 
      ORDER BY created_at DESC
    `;

    try {
      const refunds = await db.query(query, [paymentId]);
      
      return refunds.map(refund => {
        if (refund.metadata) {
          refund.metadata = JSON.parse(refund.metadata);
        }
        return refund;
      });
    } catch (error) {
      logger.error('Error fetching refunds for payment:', error);
      throw new Error('Failed to fetch refunds for payment');
    }
  }

  /**
   * Get refunds for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} - List of refund records
   */
  async getUserRefunds(userId, limit = 10, offset = 0) {
    const query = `
      SELECT r.*, p.order_id, p.transaction_id 
      FROM refunds r
      JOIN payments p ON r.payment_id = p.id
      WHERE r.user_id = ? 
      ORDER BY r.created_at DESC 
      LIMIT ? OFFSET ?
    `;

    try {
      const refunds = await db.query(query, [userId, limit, offset]);
      
      return refunds.map(refund => {
        if (refund.metadata) {
          refund.metadata = JSON.parse(refund.metadata);
        }
        return refund;
      });
    } catch (error) {
      logger.error('Error fetching user refunds:', error);
      throw new Error('Failed to fetch user refunds');
    }
  }
}

module.exports = new RefundModel(); 