/**
 * Subscription Renewal Job
 * Handles periodic checking and processing of subscription renewals
 */
const cron = require('node-cron');
const subscriptionModel = require('../models/subscription.model');
const paymentService = require('../services/payment.service');
const logger = require('../utils/logger');

// Track active jobs
let renewalJob = null;

/**
 * Process subscription renewals
 * Finds subscriptions due for renewal and attempts to process them
 */
async function processRenewals() {
  try {
    logger.info('Starting subscription renewal job');
    
    // Get subscriptions due for renewal
    const dueSubscriptions = await subscriptionModel.findDueForRenewal();
    
    if (dueSubscriptions.length === 0) {
      logger.info('No subscriptions due for renewal');
      return;
    }
    
    logger.info(`Found ${dueSubscriptions.length} subscriptions due for renewal`);
    
    // Process each subscription
    for (const subscription of dueSubscriptions) {
      try {
        logger.debug(`Processing renewal for subscription ${subscription.id}`);
        
        // Attempt to process the renewal payment
        const renewalResult = await paymentService.processSubscriptionRenewal(subscription);
        
        if (renewalResult.success) {
          logger.info(`Successfully renewed subscription ${subscription.id}`);
        } else {
          logger.warn(`Failed to renew subscription ${subscription.id}: ${renewalResult.message}`);
          
          // Update the subscription with failed renewal attempt
          await subscriptionModel.recordFailedRenewal(subscription.id, renewalResult.message);
        }
      } catch (error) {
        logger.error(`Error processing renewal for subscription ${subscription.id}`, error);
        
        // Record the error
        await subscriptionModel.recordFailedRenewal(
          subscription.id, 
          `Error processing renewal: ${error.message || 'Unknown error'}`
        );
      }
    }
    
    logger.info('Completed subscription renewal job');
  } catch (error) {
    logger.error('Error in subscription renewal job', error);
  }
}

/**
 * Initialize subscription renewal job
 * Sets up a daily job to check and process subscription renewals
 */
function initSubscriptionRenewalJob() {
  try {
    // Run job daily at 2 AM
    renewalJob = cron.schedule('0 2 * * *', processRenewals);
    
    logger.info('Subscription renewal job scheduled (daily at 2 AM)');
    
    // Also run once at startup (after a short delay to let the system initialize)
    setTimeout(() => {
      processRenewals()
        .then(() => logger.info('Initial subscription renewal check completed'))
        .catch(error => logger.error('Error in initial subscription renewal check', error));
    }, 5000);
    
    return renewalJob;
  } catch (error) {
    logger.error('Failed to initialize subscription renewal job', error);
    throw error;
  }
}

/**
 * Stop the subscription renewal job
 */
function stopSubscriptionRenewalJob() {
  if (renewalJob) {
    renewalJob.stop();
    renewalJob = null;
    logger.info('Subscription renewal job stopped');
  }
}

module.exports = {
  processRenewals,
  initSubscriptionRenewalJob,
  stopSubscriptionRenewalJob
}; 