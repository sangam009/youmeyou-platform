const cron = require('node-cron');
const paymentService = require('./payment.service');
const paymentModel = require('../models/payment.model');
const logger = require('../utils/logger');
const { initSubscriptionRenewalJob } = require('../jobs/subscription-renewal.job');

// Track active cron jobs and intervals
let cronJobs = [];
let intervalJobs = [];

/**
 * Cron Service
 * Manages scheduled jobs for the application
 */
const cronService = {
  init() {
    logger.info('Initializing cron jobs');
    
    try {
      // Mark expired payments job (runs every 15 minutes)
      const expiryCheckJob = cron.schedule('*/15 * * * *', async () => {
        try {
          logger.debug('Running mark expired payments job');
          await paymentModel.markExpiredPayments();
        } catch (error) {
          logger.error('Error in mark expired payments job', error);
        }
      });
      
      // Run mark expired payments once at startup
      paymentModel.markExpiredPayments()
        .then(() => logger.debug('Initial expired payments check completed'))
        .catch(error => logger.error('Error in initial expired payments check', error));
      
      // Add to active jobs
      cronJobs.push(expiryCheckJob);
      
      // Initialize subscription renewal job
      initSubscriptionRenewalJob();
      
      logger.info('Cron jobs initialized successfully');
    } catch (error) {
      logger.error('Error initializing cron jobs', error);
    }
  },
  
  /**
   * Schedule payment expiry check
   * Runs every 15 minutes to check for expired payments
   */
  scheduleExpiryCheck() {
    // Get configured expiry frequency or default to 15 minutes
    const expiryCheckFrequency = process.env.EXPIRY_CHECK_FREQUENCY || '*/15 * * * *';
    
    // Schedule to run according to configured frequency
    const task = cron.schedule(expiryCheckFrequency, async () => {
      const timestamp = new Date().toISOString();
      console.log(`[INFO] ${timestamp} - Running payment expiry check...`);
      
      try {
        const count = await paymentService.markExpiredPayments();
        console.log(`[INFO] ${timestamp} - Marked ${count} payments as expired`);
      } catch (error) {
        console.error(`[ERROR] ${timestamp} - Error in payment expiry cron job:`, error);
      }
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'UTC'
    });
    
    this.tasks.push(task);
    console.log(`[INFO] Scheduled payment expiry check: ${expiryCheckFrequency}`);
  },
  
  /**
   * Stop all cron jobs and intervals
   */
  stop() {
    logger.info('Stopping all cron jobs');
    
    // Stop all cron jobs
    cronJobs.forEach((job, index) => {
      try {
        job.stop();
        logger.debug(`Stopped cron job #${index + 1}`);
      } catch (error) {
        logger.error(`Failed to stop cron job #${index + 1}`, error);
      }
    });
    
    // Clear all intervals
    intervalJobs.forEach((job, index) => {
      try {
        clearInterval(job);
        logger.debug(`Cleared interval job #${index + 1}`);
      } catch (error) {
        logger.error(`Failed to clear interval job #${index + 1}`, error);
      }
    });
    
    // Reset job arrays
    cronJobs = [];
    intervalJobs = [];
    
    logger.info('All cron jobs stopped');
  },

  /**
   * Schedule an interval job
   * @param {Function} callback - Function to execute
   * @param {number} interval - Interval in milliseconds
   * @returns {number} - Interval ID
   */
  scheduleInterval(callback, interval) {
    const jobId = setInterval(callback, interval);
    intervalJobs.push(jobId);
    return jobId;
  },

  /**
   * Schedule a cron job
   * @param {string} schedule - Cron schedule expression
   * @param {Function} callback - Function to execute
   * @returns {object} - Cron job instance
   */
  scheduleCron(schedule, callback) {
    const job = cron.schedule(schedule, callback);
    cronJobs.push(job);
    return job;
  }
};

module.exports = cronService; 