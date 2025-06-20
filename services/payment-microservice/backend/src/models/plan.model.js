const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Plan Model
 * Handles database operations for subscription plans
 */
class PlanModel {
  /**
   * Create a new subscription plan
   * @param {Object} planData - Plan information
   * @returns {Promise<Object>} - Created plan record
   */
  async createPlan(planData) {
    try {
      logger.info('Creating new plan with data', { planData });
      
      const {
        plan_id,
        name,
        amount,
        interval,
        period,
        gateway,
        metadata = {}
      } = planData;

      const query = `
        INSERT INTO plans (
          plan_id, name, amount, billing_interval, period, 
          gateway, metadata
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        plan_id,
        name,
        amount,
        interval,
        period,
        gateway,
        JSON.stringify(metadata)
      ];

      logger.info('Executing createPlan query', { query, params });
      
      const result = await db.query(query, params);
      logger.info('Raw database response from createPlan insert', { 
        response: result,
        responseType: typeof result,
        insertId: result?.insertId
      });

      const createdPlan = await this.getPlanById(result.insertId);
      logger.info('Successfully created and retrieved plan', { createdPlan });
      
      return createdPlan;
    } catch (error) {
      logger.error('Error creating plan', { 
        error: error.message, 
        stack: error.stack,
        planData 
      });
      throw new Error('Failed to create subscription plan');
    }
  }

  /**
   * Get a plan by its ID
   * @param {number} id - Internal plan ID
   * @returns {Promise<Object>} - Plan record
   */
  async getPlanById(id) {
    const query = 'SELECT * FROM plans WHERE id = ?';
    try {
      const plans = await db.query(query, [id]);
      
      if (plans.length === 0) {
        throw new Error('Plan not found');
      }
      
      const plan = plans[0];
      
      // Parse JSON fields safely
      try {
        if (plan.metadata && typeof plan.metadata === 'string') {
          plan.metadata = JSON.parse(plan.metadata);
        } else if (plan.metadata === null) {
          plan.metadata = {};
        }
      } catch (jsonError) {
        console.error('Error parsing plan metadata JSON:', jsonError);
        plan.metadata = {};
      }
      
      return plan;
    } catch (error) {
      console.error('Error fetching plan by ID:', error);
      throw error;
    }
  }

  /**
   * Get plan by ID
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} - Plan details
   */
  async getPlanByPlanId(planId) {
    try {
      const query = 'SELECT * FROM plans WHERE plan_id = ?';
      logger.info('Executing getPlanByPlanId query', { query, planId });
      
      const rows = await db.query(query, [planId]);
      logger.info('Raw database response from getPlanByPlanId', { 
        response: rows,
        responseType: typeof rows,
        isArray: Array.isArray(rows),
        length: rows?.length
      });
      
      if (!rows || rows.length === 0) {
        logger.error('Plan not found', { planId });
        throw new Error('Plan not found');
      }
      
      const plan = rows[0];
      logger.info('Selected plan data', { plan });
      
      let metadata = plan.metadata;
      try {
        if (plan.metadata) {
          metadata = JSON.parse(plan.metadata);
          logger.info('Successfully parsed plan metadata', { metadata });
        }
      } catch (jsonError) {
        logger.error('Error parsing plan metadata', { 
          error: jsonError.message,
          rawMetadata: plan.metadata 
        });
      }
      
      const formattedPlan = {
        id: plan.id,
        plan_id: plan.plan_id,
        name: plan.name,
        description: plan.description,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval_type,
        interval_count: plan.interval_count,
        status: plan.status,
        metadata
      };
      
      logger.info('Returning formatted plan', { formattedPlan });
      return formattedPlan;
    } catch (error) {
      logger.error('Error fetching plan by plan ID', { 
        error: error.message, 
        stack: error.stack,
        planId 
      });
      throw error;
    }
  }

  /**
   * Get all available plans
   * @returns {Promise<Array>} - Array of plan records
   */
  async getAllPlans() {
    const query = 'SELECT * FROM plans ORDER BY amount ASC';
    try {
      logger.info('Executing getAllPlans query', { query });
      
      const plans = await db.query(query);
      logger.info('Raw database response from getAllPlans', {
        response: plans,
        responseType: typeof plans,
        isArray: Array.isArray(plans),
        length: plans?.length
      });
      
      // Parse JSON fields safely for each plan
      const formattedPlans = plans.map(plan => {
        let metadata = plan.metadata;
        try {
          if (plan.metadata && typeof plan.metadata === 'string') {
            metadata = JSON.parse(plan.metadata);
            logger.debug('Successfully parsed plan metadata', { 
              planId: plan.id, 
              metadata 
            });
          }
        } catch (jsonError) {
          logger.error('Error parsing plan metadata', { 
            error: jsonError.message,
            planId: plan.id,
            rawMetadata: plan.metadata 
          });
        }
        
        return {
          ...plan,
          metadata
        };
      });
      
      logger.info('Returning formatted plans', { 
        count: formattedPlans.length,
        planIds: formattedPlans.map(p => p.id)
      });
      return formattedPlans;
    } catch (error) {
      logger.error('Error fetching all plans', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Update an existing plan
   * @param {number} id - Plan ID
   * @param {Object} planData - Updated plan data
   * @returns {Promise<Object>} - Updated plan record
   */
  async updatePlan(id, planData) {
    // Extract only allowed fields to update
    const allowedFields = ['name', 'amount', 'interval', 'period', 'metadata'];
    const fields = {};
    
    allowedFields.forEach(field => {
      if (planData[field] !== undefined) {
        fields[field] = planData[field];
      }
    });

    // Add updated_at timestamp
    fields.updated_at = new Date();

    // Handle metadata specially
    if (fields.metadata) {
      fields.metadata = JSON.stringify(fields.metadata);
    }

    // Build the SET clause dynamically
    const setClause = Object.keys(fields)
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.values(fields);
    values.push(id); // Add id for the WHERE clause

    const query = `UPDATE plans SET ${setClause} WHERE id = ?`;

    try {
      await db.query(query, values);
      return this.getPlanById(id);
    } catch (error) {
      console.error('Error updating plan:', error);
      throw new Error('Failed to update subscription plan');
    }
  }

  /**
   * Delete a plan
   * @param {number} id - Plan ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async deletePlan(id) {
    const query = 'DELETE FROM plans WHERE id = ?';
    try {
      const result = await db.query(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw new Error('Failed to delete subscription plan');
    }
  }

  /**
   * Create default subscription plans if they don't exist
   * @returns {Promise<void>}
   */
  async createDefaultPlans() {
    try {
      const plans = [
        {
          id: 1,
          name: 'Monthly Plan',
          description: 'Monthly subscription plan',
          amount: 299,
          currency: 'INR',
          interval: 'monthly',
          interval_count: 1,
          status: 'active',
          metadata: {
            features: ['Basic features', 'Monthly billing']
          }
        },
        {
          id: 2,
          name: 'Yearly Plan',
          description: 'Yearly subscription plan',
          amount: 2999,
          currency: 'INR',
          interval: 'yearly',
          interval_count: 1,
          status: 'active',
          metadata: {
            features: ['All features', 'Yearly billing', '2 months free']
          }
        }
      ];
      
      for (const plan of plans) {
        const existingPlan = await this.getPlanByPlanId(plan.plan_id);
        if (!existingPlan) {
          await this.createPlan(plan);
          logger.info('Created default plan', { plan_id: plan.plan_id, name: plan.name });
        }
      }
    } catch (error) {
      logger.error('Error creating default plans', { error });
      throw error;
    }
  }
}

module.exports = new PlanModel(); 