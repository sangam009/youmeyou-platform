/**
 * Admin Routes
 * Secure routes for administrative functions
 */
const express = require('express');
const router = express.Router();
const subscriptionModel = require('../models/subscription.model');
const paymentModel = require('../models/payment.model');
const authMiddleware = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

// Protect all admin routes
router.use(authMiddleware.authenticate);
router.use(authMiddleware.requireRole('admin'));

/**
 * @route GET /api/admin/subscription-metrics
 * @description Get subscription metrics and analytics
 * @access Admin only
 */
router.get('/subscription-metrics', async (req, res) => {
  try {
    logger.info('Fetching subscription metrics');
    
    // Query for subscription metrics
    const metrics = await getSubscriptionMetrics();
    
    // Return the metrics
    res.json({
      status: 'success',
      metrics
    });
  } catch (error) {
    logger.error('Error fetching subscription metrics:', error);
    res.status(500).json({
      status: 'error',
      message: `Error fetching subscription metrics: ${error.message}`
    });
  }
});

/**
 * @route GET /api/admin/subscription-renewals
 * @description Get recent subscription renewal results
 * @access Admin only
 */
router.get('/subscription-renewals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    logger.info(`Fetching recent subscription renewals (page ${page}, limit ${limit})`);
    
    // Query for recent subscription renewals from payments table
    const query = `
      SELECT p.*, s.subscription_id, s.status as subscription_status, 
             u.email as user_email, u.name as user_name
      FROM payments p
      JOIN subscriptions s ON p.metadata->>'subscription_id' = s.id
      JOIN users u ON p.user_id = u.id
      WHERE p.metadata->>'method' = 'subscription_renewal'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const db = require('../config/database');
    const renewals = await db.query(query, [limit, offset]);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments
      WHERE metadata->>'method' = 'subscription_renewal'
    `;
    
    const countResult = await db.query(countQuery);
    const total = countResult[0].total || 0;
    
    // Return the renewals with pagination info
    res.json({
      status: 'success',
      renewals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching subscription renewals:', error);
    res.status(500).json({
      status: 'error',
      message: `Error fetching subscription renewals: ${error.message}`
    });
  }
});

/**
 * Get comprehensive subscription metrics
 * @returns {Promise<Object>} Subscription metrics
 */
async function getSubscriptionMetrics() {
  const db = require('../config/database');
  
  // Query for active subscriptions count
  const activeCountQuery = `
    SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'
  `;
  const activeCount = await db.query(activeCountQuery);
  
  // Query for subscription counts by status
  const statusCountsQuery = `
    SELECT status, COUNT(*) as count FROM subscriptions GROUP BY status
  `;
  const statusCounts = await db.query(statusCountsQuery);
  
  // Query for subscription counts by plan
  const planCountsQuery = `
    SELECT p.name as plan_name, COUNT(*) as count
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'active'
    GROUP BY p.name
  `;
  const planCounts = await db.query(planCountsQuery);
  
  // Query for monthly revenue from subscriptions
  const monthlyRevenueQuery = `
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m') as month,
      SUM(amount) as revenue
    FROM payments
    WHERE metadata->>'method' = 'subscription_renewal'
      AND status = 'completed'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month
  `;
  const monthlyRevenue = await db.query(monthlyRevenueQuery);
  
  // Query for renewal success rate
  const renewalRateQuery = `
    SELECT 
      status,
      COUNT(*) as count
    FROM payments
    WHERE metadata->>'method' = 'subscription_renewal'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY status
  `;
  const renewalRateData = await db.query(renewalRateQuery);
  
  // Calculate renewal success rate
  let successCount = 0;
  let totalCount = 0;
  
  renewalRateData.forEach(item => {
    if (item.status === 'completed') {
      successCount = item.count;
    }
    totalCount += item.count;
  });
  
  const renewalSuccessRate = totalCount > 0 ? (successCount / totalCount * 100).toFixed(2) : 100;
  
  // Return all metrics
  return {
    activeSubscriptions: activeCount[0].count,
    statusCounts: statusCounts.reduce((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {}),
    planDistribution: planCounts,
    monthlyRevenue,
    renewalSuccessRate: parseFloat(renewalSuccessRate),
    renewalStats: {
      success: successCount,
      total: totalCount
    }
  };
}

module.exports = router; 