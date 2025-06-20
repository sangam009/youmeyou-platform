const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Subscription Model
 * Handles database operations for user subscriptions
 */
class SubscriptionModel {
  /**
   * Create a new subscription
   * @param {Object} subscriptionData - Subscription information
   * @returns {Promise<Object>} - Created subscription record
   */
  async createSubscription(subscriptionData) {
    const {
      user_id,
      plan_id,
      subscription_id,
      status,
      gateway,
      start_date,
      next_billing_date
    } = subscriptionData;

    const query = `
      INSERT INTO subscriptions (
        user_id, plan_id, subscription_id, status, 
        gateway, start_date, next_billing_date
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      user_id,
      plan_id,
      subscription_id,
      status,
      gateway,
      start_date,
      next_billing_date
    ];

    try {
      const result = await db.query(query, params);
      return this.getSubscriptionById(result.insertId);
    } catch (error) {
      console.error('Error creating subscription record:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Get a subscription by its ID
   * @param {number} id - Internal subscription ID
   * @returns {Promise<Object>} - Subscription record
   */
  async getSubscriptionById(id) {
    const query = 'SELECT * FROM subscriptions WHERE id = ?';
    try {
      const subscriptions = await db.query(query, [id]);
      
      if (subscriptions.length === 0) {
        throw new Error('Subscription not found');
      }
      
      return subscriptions[0];
    } catch (error) {
      console.error('Error fetching subscription by ID:', error);
      throw error;
    }
  }

  /**
   * Get a subscription by its external subscription ID
   * @param {string} subscriptionId - Subscription ID from payment gateway
   * @returns {Promise<Object>} - Subscription record with plan details
   */
  async getSubscriptionBySubscriptionId(subscriptionId) {
    const query = `
      SELECT s.*, p.name as plan_name, p.amount as plan_amount, p.period as plan_period, p.billing_interval as plan_interval 
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.subscription_id = ?
    `;
    try {
      const subscriptions = await db.query(query, [subscriptionId]);
      
      if (subscriptions.length === 0) {
        throw new Error('Subscription not found');
      }
      
      return subscriptions[0];
    } catch (error) {
      console.error('Error fetching subscription by subscription ID:', error);
      throw error;
    }
  }

  /**
   * Get subscriptions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of subscription records
   */
  async getUserSubscriptions(userId) {
    const query = `
      SELECT s.*, p.name as plan_name, p.amount as plan_amount, p.period as plan_period, p.billing_interval as plan_interval 
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `;
    try {
      return await db.query(query, [userId]);
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      throw error;
    }
  }

  /**
   * Update a subscription's status
   * @param {number} id - Subscription ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional fields to update
   * @returns {Promise<Object>} - Updated subscription record
   */
  async updateSubscriptionStatus(id, status, additionalData = {}) {
    const fields = {
      status,
      updated_at: new Date(),
      ...additionalData
    };

    // Build the SET clause dynamically
    const setClause = Object.keys(fields)
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.values(fields);
    values.push(id); // Add id for the WHERE clause

    const query = `UPDATE subscriptions SET ${setClause} WHERE id = ?`;

    try {
      await db.query(query, values);
      return this.getSubscriptionById(id);
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw new Error('Failed to update subscription status');
    }
  }

  /**
   * Cancel a subscription
   * @param {number} id - Subscription ID
   * @returns {Promise<Object>} - Updated subscription record
   */
  async cancelSubscription(id) {
    return this.updateSubscriptionStatus(id, 'cancelled', {
      next_billing_date: null
    });
  }

  /**
   * Check if a subscription needs renewal
   * @returns {Promise<Array>} - Array of subscriptions due for renewal
   */
  async getSubscriptionsDueForRenewal() {
    const query = `
      SELECT * FROM subscriptions 
      WHERE status = 'active' 
        AND next_billing_date IS NOT NULL 
        AND next_billing_date <= NOW()
    `;
    try {
      return await db.query(query);
    } catch (error) {
      console.error('Error fetching subscriptions due for renewal:', error);
      throw error;
    }
  }

  /**
   * Find subscriptions due for renewal
   * Enhanced version that joins with plan data
   * @returns {Promise<Array>} - Array of subscriptions due for renewal with additional data
   */
  async findDueForRenewal() {
    const query = `
      SELECT s.*, 
             p.id as plan_id, p.name as plan_name, p.amount as plan_amount,
             p.billing_interval as plan_interval, p.period as plan_period, 
             p.gateway as plan_gateway
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active' 
        AND s.next_billing_date IS NOT NULL 
        AND s.next_billing_date <= NOW()
    `;
    
    try {
      logger.debug('Finding subscriptions due for renewal');
      const subscriptions = await db.query(query);
      logger.debug(`Found ${subscriptions.length} subscriptions due for renewal`);
      return subscriptions;
    } catch (error) {
      logger.error('Error finding subscriptions due for renewal:', error);
      throw error;
    }
  }

  /**
   * Record a failed renewal attempt
   * @param {number} id - Subscription ID
   * @param {string} failureReason - Reason for the failure
   * @returns {Promise<Object>} - Updated subscription record
   */
  async recordFailedRenewal(id, failureReason) {
    try {
      // Update subscription status to payment_failed
      const status = 'payment_failed';
      logger.warn(`Subscription ${id} marked as payment_failed after renewal attempt`);
      
      const query = `
        UPDATE subscriptions 
        SET status = ?
        WHERE id = ?
      `;
      
      await db.query(query, [status, id]);
      return this.getSubscriptionById(id);
    } catch (error) {
      logger.error(`Error recording failed renewal for subscription ${id}:`, error);
      throw error;
    }
  }

  /**
   * Record a successful renewal
   * @param {number} id - Subscription ID
   * @param {Date} nextBillingDate - Next billing date
   * @param {string} transactionId - ID of the successful transaction
   * @returns {Promise<Object>} - Updated subscription record
   */
  async recordSuccessfulRenewal(id, nextBillingDate, transactionId) {
    try {
      const query = `
        UPDATE subscriptions 
        SET next_billing_date = ?
        WHERE id = ?
      `;
      
      await db.query(query, [nextBillingDate, id]);
      return this.getSubscriptionById(id);
    } catch (error) {
      logger.error(`Error recording successful renewal for subscription ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a subscription's next billing date
   * @param {number} id - Subscription ID
   * @param {Date} nextBillingDate - Next billing date
   * @returns {Promise<Object>} - Updated subscription record
   */
  async updateNextBillingDate(id, nextBillingDate) {
    return this.updateSubscriptionStatus(id, 'active', {
      next_billing_date: nextBillingDate
    });
  }
}

module.exports = new SubscriptionModel(); 