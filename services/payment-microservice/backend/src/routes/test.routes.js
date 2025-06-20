/**
 * Test Routes for Payment Microservice
 * These routes are for development/testing only and should be disabled in production
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const paymentService = require('../services/payment.service');
const subscriptionService = require('../services/subscription.service');
const subscriptionModel = require('../models/subscription.model');
const paymentModel = require('../models/payment.model');
const { generateCheckoutHTML } = require('../utils/razorpay-checkout');
const paymentConfig = require('../config/payment-config');
const { processRenewals } = require('../jobs/subscription-renewal.job');
const logger = require('../utils/logger');
const path = require('path');

// Environment check middleware - only allow in development
const devOnlyMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ 
      status: 'error', 
      message: 'This endpoint is not available in production' 
    });
  }
  next();
};

// Test session middleware - sets a test session cookie
const setTestSession = (req, res, next) => {
  // Set a test session cookie that will be recognized by auth middleware
  res.cookie('connect.sid', 'test-session-id', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  
  // Also set it in headers for API requests
  res.set('Session-ID', 'test-session-id');
  
  // Set a mock user for testing
  req.user = {
    uuid: 'test-user-uuid',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'user'
  };
  
  // Continue to the route handler
  next();
};

// Apply middleware to all routes
router.use(devOnlyMiddleware);

/**
 * Development/test routes - these should be disabled in production
 */

// Middleware to restrict access to test routes in production
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_TEST_ROUTES) {
    return res.status(404).send({ 
      status: 'error', 
      message: 'Test routes are disabled in production' 
    });
  }
  next();
});

/**
 * @route GET /test
 * @description Test home page with links to testing functionality
 * @access Private (Disabled in production)
 */
router.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Service Test Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
            background: #f5f7fa;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
          }
          h2 {
            color: #3498db;
            margin-top: 25px;
          }
          .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
          }
          .card {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #3498db;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          .card h3 {
            margin-top: 0;
            color: #2c3e50;
          }
          .card p {
            color: #7f8c8d;
            font-size: 14px;
          }
          .link {
            display: inline-block;
            margin-top: 10px;
            padding: 8px 15px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
            transition: background 0.2s;
          }
          .link:hover {
            background: #2980b9;
          }
          .link.secondary {
            background: #95a5a6;
          }
          .link.secondary:hover {
            background: #7f8c8d;
          }
          .section {
            margin-bottom: 30px;
          }
          .warning {
            background: #feefef;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #e74c3c;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Payment Service Test Dashboard</h1>
          
          <div class="warning">
            <strong>Development Use Only:</strong> This dashboard is intended for testing and should not be accessible in production.
          </div>
          
          <div class="section">
            <h2>One-Time Payments</h2>
            <div class="card-grid">
              <div class="card">
                <h3>Basic Payment</h3>
                <p>Test a basic one-time payment using Razorpay.</p>
                <a href="/test/razorpay-checkout?amount=100" class="link">Pay ₹100</a>
              </div>
              
              <div class="card">
                <h3>Custom Amount</h3>
                <p>Test a payment with a custom amount.</p>
                <a href="/test/razorpay-checkout?amount=500" class="link">Pay ₹500</a>
                <a href="/test/razorpay-checkout?amount=1000" class="link secondary">Pay ₹1000</a>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Subscriptions</h2>
            <div class="card-grid">
              <div class="card">
                <h3>View Subscriptions</h3>
                <p>View existing subscriptions for a test user.</p>
                <a href="/test/subscriptions?user_id=test-user-id" class="link">View Subscriptions</a>
              </div>
              
              <div class="card">
                <h3>Monthly Plan</h3>
                <p>Subscribe to a monthly plan with automatic renewals.</p>
                <a href="/test/razorpay-checkout?amount=299&subscription=monthly" class="link">Subscribe ₹299/month</a>
              </div>
              
              <div class="card">
                <h3>Annual Plan</h3>
                <p>Subscribe to an annual plan with automatic renewals.</p>
                <a href="/test/razorpay-checkout?amount=2999&subscription=yearly" class="link">Subscribe ₹2999/year</a>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Admin & Testing Tools</h2>
            <div class="card-grid">
              <div class="card">
                <h3>Trigger Renewal Job</h3>
                <p>Manually trigger the subscription renewal job.</p>
                <a href="/test/trigger-renewal-job" class="link">Run Renewal Job</a>
              </div>
              
              <div class="card">
                <h3>Payment Configuration</h3>
                <p>View the current payment gateway configuration.</p>
                <a href="/test/config" class="link">View Config</a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  
  res.send(html);
});

/**
 * @route GET /test/razorpay-checkout
 * @description Test Razorpay checkout page
 * @access Private (Disabled in production)
 */
router.get('/razorpay-checkout', setTestSession, async (req, res) => {
  try {
    const { amount, subscription } = req.query;
    
    if (!amount) {
      return res.status(400).send('Amount is required');
    }
    
    let orderData = {
      amount: parseInt(amount),
      currency: 'INR',
      method: 'upi',
      flow: 'intent',
      notes: {
        test: 'true',
        source: 'test-page'
      }
    };
    
    // Handle subscription
    if (subscription) {
      // Create subscription first
      const subscriptionData = {
        planId: subscription === 'monthly' ? 1 : 2, // Assuming plan IDs 1 for monthly, 2 for yearly
        gateway: 'razorpay',
        customer: {
          name: 'Test User',
          email: 'test@example.com',
          contact: '9999999999'
        }
      };
      
      const subscriptionResult = await subscriptionService.subscribe(subscriptionData, req.user.uuid);
      
      if (subscriptionResult.status !== 'success') {
        return res.status(400).send(`Subscription creation failed: ${subscriptionResult.message}`);
      }
      
      // Add subscription info to order notes
      orderData.notes.subscription_id = subscriptionResult.subscription.id;
      orderData.notes.plan_id = subscriptionResult.subscription.plan_id;
      orderData.notes.source = 'subscription';
    }
    
    // Create payment order
    const result = await paymentService.createOrder(orderData, req.user.uuid);
    
    if (result.status !== 'success') {
      // If subscription was created, cancel it
      if (orderData.notes.subscription_id) {
        await subscriptionService.cancelSubscription(orderData.notes.subscription_id);
      }
      return res.status(500).send(`Order creation failed: ${result.message}`);
    }
    
    // Render checkout page
    res.render('razorpay-checkout', {
      order_id: result.order_id,
      amount: result.amount,
      currency: result.currency,
      subscription_id: orderData.notes.subscription_id,
      key_id: paymentConfig.razorpay.key_id,
      company_name: paymentConfig.company.name,
      company_description: paymentConfig.company.description,
      company_logo: paymentConfig.company.logo,
      callback_url: `${paymentConfig.app.baseUrl}/test/payment-callback`
    });
  } catch (error) {
    logger.error('Error in test checkout page', { error });
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * Successful payment page
 */
router.get('/payment-success', setTestSession, (req, res) => {
  const txnId = req.query.txn || 'unknown';
  
  res.send(`
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
          }
          .success-container {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
            margin-top: 20px;
            background-color: #f8fff8;
          }
          .success-icon {
            color: #2ecc71;
            font-size: 48px;
            margin-bottom: 20px;
          }
          .transaction-id {
            background-color: #f1f1f1;
            padding: 10px;
            border-radius: 4px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
          a.button {
            display: inline-block;
            background-color: #2d88ff;
            color: white;
            text-decoration: none;
            padding: 10px 15px;
            border-radius: 4px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">✓</div>
          <h1>Payment Successful!</h1>
          <p>Your transaction has been completed successfully.</p>
          <div class="transaction-id">
            Transaction ID: ${txnId}
          </div>
          <a href="/test/razorpay-checkout" class="button">Make another payment</a>
        </div>
      </body>
    </html>
  `);
});

/**
 * Test API to get payment configuration
 */
router.get('/config', setTestSession, (req, res) => {
  // Return a sanitized version of the config (without secrets)
  const publicConfig = {
    defaultGateway: paymentConfig.defaultGateway,
    gateways: {
      razorpay: {
        enabled: paymentConfig.gateways.razorpay.enabled,
        publicKey: paymentConfig.gateways.razorpay.credentials.key_id,
        flows: paymentConfig.gateways.razorpay.supportedFlows
      }
    },
    supportedCurrencies: paymentConfig.supportedCurrencies,
    supportedMethods: paymentConfig.supportedMethods
  };
  
  res.json({
    status: 'success',
    config: publicConfig
  });
});

// Subscription test routes
router.get('/subscription-plans', async (req, res) => {
  try {
    const result = await subscriptionService.getAllPlans();
    
    if (result.status === 'error') {
      return res.status(400).json(result);
    }
    
    // Render a simple HTML interface for viewing plans
    const plansHTML = `
      <html>
        <head>
          <title>Test Subscription Plans</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .plan { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .plan-header { display: flex; justify-content: space-between; }
            .plan-name { font-size: 18px; font-weight: bold; }
            .plan-price { font-size: 16px; color: #2a6496; }
            .plan-details { margin-top: 10px; font-size: 14px; color: #666; }
            .subscribe-btn { display: inline-block; background: #4CAF50; color: white; padding: 10px 15px; 
                          text-decoration: none; border-radius: 4px; margin-top: 10px; }
            .actions { margin-top: 20px; }
            .btn { display: inline-block; background: #2a6496; color: white; padding: 10px 15px; 
                   text-decoration: none; border-radius: 4px; margin-right: 10px; }
          </style>
        </head>
        <body>
          <h1>Test Subscription Plans</h1>
          <p>Click on a plan to test subscription flow</p>
          
          <div class="actions">
            <a href="/test/create-plan" class="btn">Create New Plan</a>
            <a href="/test/my-subscriptions" class="btn">My Subscriptions</a>
          </div>
          
          ${result.plans.map(plan => `
            <div class="plan">
              <div class="plan-header">
                <div class="plan-name">${plan.name}</div>
                <div class="plan-price">₹${plan.amount} / ${plan.period}</div>
              </div>
              <div class="plan-details">
                <p>Plan ID: ${plan.plan_id}</p>
                <p>Interval: ${plan.interval} ${plan.period}</p>
                <p>Gateway: ${plan.gateway}</p>
              </div>
              <a href="/test/subscribe?plan_id=${plan.plan_id}" class="subscribe-btn">Subscribe</a>
            </div>
          `).join('')}
          
          ${result.plans.length === 0 ? '<p>No plans found. Create a plan to get started.</p>' : ''}
        </body>
      </html>
    `;
    
    res.send(plansHTML);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.get('/create-plan', (req, res) => {
  // Render a simple HTML form for creating a plan
  const formHTML = `
    <html>
      <head>
        <title>Create Subscription Plan</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input, select { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
          .back-link { display: inline-block; margin-top: 20px; color: #2a6496; }
        </style>
      </head>
      <body>
        <h1>Create Subscription Plan</h1>
        
        <form action="/test/create-plan" method="post">
          <div class="form-group">
            <label for="name">Plan Name</label>
            <input type="text" id="name" name="name" required placeholder="e.g., Basic Plan">
          </div>
          
          <div class="form-group">
            <label for="amount">Amount (in INR)</label>
            <input type="number" id="amount" name="amount" required placeholder="e.g., 999">
          </div>
          
          <div class="form-group">
            <label for="billing_interval">Billing Interval</label>
            <input type="number" id="billing_interval" name="billing_interval" value="1" min="1" required>
          </div>
          
          <div class="form-group">
            <label for="period">Period</label>
            <select id="period" name="period" required>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="gateway">Gateway</label>
            <select id="gateway" name="gateway" required>
              <option value="razorpay">Razorpay</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="description">Description</label>
            <input type="text" id="description" name="description" placeholder="Plan description">
          </div>
          
          <button type="submit">Create Plan</button>
        </form>
        
        <a href="/test/subscription-plans" class="back-link">← Back to Plans</a>
      </body>
    </html>
  `;
  
  res.send(formHTML);
});

router.post('/create-plan', async (req, res) => {
  try {
    const { name, amount, billing_interval, period, gateway, description } = req.body;
    
    // Create metadata object
    const metadata = {
      description: description || `${name} subscription plan`
    };
    
    // Create plan data
    const planData = {
      name,
      amount: parseInt(amount),
      interval: parseInt(billing_interval),
      period,
      gateway,
      metadata
    };
    
    // Create plan
    const result = await subscriptionService.createPlan(planData);
    
    if (result.status === 'error') {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Error creating plan</h1>
            <p>${result.message}</p>
            <p><a href="/test/create-plan">Try again</a></p>
          </body>
        </html>
      `);
    }
    
    // Redirect to plans page
    res.redirect('/test/subscription-plans');
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.get('/subscribe', async (req, res) => {
  try {
    const { plan_id } = req.query;
    
    if (!plan_id) {
      return res.status(400).send('Plan ID is required');
    }
    
    // Get plan details
    const planResult = await subscriptionService.getPlan(plan_id);
    
    if (planResult.status === 'error') {
      return res.status(404).send(`Plan not found: ${planResult.message}`);
    }
    
    const plan = planResult.plan;
    
    // Render subscription form
    const formHTML = `
      <html>
        <head>
          <title>Subscribe to ${plan.name}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .plan-details { background: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
            .price { font-size: 18px; color: #2a6496; font-weight: bold; }
            .back-link { display: inline-block; margin-top: 20px; color: #2a6496; }
          </style>
        </head>
        <body>
          <h1>Subscribe to ${plan.name}</h1>
          
          <div class="plan-details">
            <p class="price">₹${plan.amount} / ${plan.period}</p>
            <p>Billing cycle: ${plan.interval} ${plan.period}</p>
            <p>Gateway: ${plan.gateway}</p>
          </div>
          
          <form action="/test/process-subscription" method="post">
            <input type="hidden" name="plan_id" value="${plan.plan_id}">
            <input type="hidden" name="gateway" value="${plan.gateway}">
            
            <div class="form-group">
              <label for="name">Your Name</label>
              <input type="text" id="name" name="name" required value="Test User">
            </div>
            
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required value="test@example.com">
            </div>
            
            <div class="form-group">
              <label for="contact">Phone Number</label>
              <input type="text" id="contact" name="contact" required value="9876543210">
            </div>
            
            <button type="submit">Subscribe Now</button>
          </form>
          
          <a href="/test/subscription-plans" class="back-link">← Back to Plans</a>
        </body>
      </html>
    `;
    
    res.send(formHTML);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.post('/process-subscription', async (req, res) => {
  try {
    const { plan_id, gateway, name, email, contact } = req.body;
    
    // Create subscription data
    const subscriptionData = {
      planId: plan_id,
      gateway,
      customer: {
        name,
        email,
        contact
      }
    };
    
    // Create subscription
    const result = await subscriptionService.subscribe(subscriptionData, req.user.uuid);
    
    if (result.status === 'error') {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Error creating subscription</h1>
            <p>${result.message}</p>
            <p><a href="/test/subscription-plans">Back to plans</a></p>
          </body>
        </html>
      `);
    }
    
    // Show success page
    res.send(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
            .success-icon { font-size: 64px; color: #4CAF50; margin-bottom: 20px; }
            .subscription-id { background: #f9f9f9; padding: 10px; border-radius: 4px; font-family: monospace; }
            .actions { margin-top: 30px; }
            .btn { display: inline-block; background: #2a6496; color: white; padding: 10px 15px; 
                   text-decoration: none; border-radius: 4px; margin: 0 10px; }
          </style>
        </head>
        <body>
          <div class="success-icon">✓</div>
          <h1>Subscription Created Successfully!</h1>
          <p>Your subscription to the plan has been activated.</p>
          <p>Subscription ID: <span class="subscription-id">${result.subscription.subscription_id}</span></p>
          
          <div class="actions">
            <a href="/test/my-subscriptions" class="btn">View My Subscriptions</a>
            <a href="/test/subscription-plans" class="btn">Back to Plans</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.get('/my-subscriptions', async (req, res) => {
  try {
    // Get user subscriptions
    const result = await subscriptionService.getUserSubscriptions(req.user.uuid);
    
    if (result.status === 'error') {
      return res.status(400).json(result);
    }
    
    // Render subscriptions page
    const subscriptionsHTML = `
      <html>
        <head>
          <title>My Subscriptions</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .subscription { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .subscription-header { display: flex; justify-content: space-between; }
            .plan-name { font-size: 18px; font-weight: bold; }
            .status-badge { padding: 5px 10px; border-radius: 12px; font-size: 12px; }
            .status-active { background: #4CAF50; color: white; }
            .status-cancelled { background: #f44336; color: white; }
            .status-pending { background: #ff9800; color: white; }
            .status-failed { background: #f44336; color: white; }
            .subscription-details { margin-top: 10px; font-size: 14px; color: #666; }
            .cancel-btn { display: inline-block; background: #f44336; color: white; padding: 8px 12px; 
                          text-decoration: none; border-radius: 4px; margin-top: 10px; font-size: 14px; }
            .back-btn { display: inline-block; background: #2a6496; color: white; padding: 10px 15px; 
                       text-decoration: none; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>My Subscriptions</h1>
          
          ${result.subscriptions.map(sub => `
            <div class="subscription">
              <div class="subscription-header">
                <div class="plan-name">${sub.plan.name}</div>
                <div class="status-badge status-${sub.status}">${sub.status}</div>
              </div>
              <div class="subscription-details">
                <p>Subscription ID: ${sub.subscription_id}</p>
                <p>Amount: ₹${sub.plan.amount} / ${sub.plan.period}</p>
                <p>Started: ${new Date(sub.start_date).toLocaleDateString()}</p>
                ${sub.next_billing_date ? `<p>Next billing: ${new Date(sub.next_billing_date).toLocaleDateString()}</p>` : ''}
              </div>
              ${sub.status === 'active' ? `
                <form action="/test/cancel-subscription" method="post" style="display: inline;">
                  <input type="hidden" name="subscription_id" value="${sub.subscription_id}">
                  <button type="submit" class="cancel-btn">Cancel Subscription</button>
                </form>
              ` : ''}
            </div>
          `).join('')}
          
          ${result.subscriptions.length === 0 ? '<p>You don\'t have any subscriptions yet.</p>' : ''}
          
          <a href="/test/subscription-plans" class="back-btn">Back to Plans</a>
        </body>
      </html>
    `;
    
    res.send(subscriptionsHTML);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscription_id } = req.body;
    
    if (!subscription_id) {
      return res.status(400).send('Subscription ID is required');
    }
    
    // Cancel subscription
    const result = await subscriptionService.cancelSubscription(subscription_id, req.user.uuid);
    
    if (result.status === 'error') {
      return res.status(400).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error cancelling subscription</h1>
            <p>${result.message}</p>
            <p><a href="/test/my-subscriptions">Back to subscriptions</a></p>
          </body>
        </html>
      `);
    }
    
    // Redirect to subscriptions page
    res.redirect('/test/my-subscriptions');
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route GET /test/trigger-renewal-job
 * @description Run the subscription renewal job manually for testing
 * @access Private (Disabled in production)
 */
router.get('/trigger-renewal-job', async (req, res) => {
  try {
    logger.info('Manually triggering subscription renewal job');
    
    // Run the renewal job
    const result = await processRenewals();
    
    // Send response
    res.json({
      status: 'success',
      message: 'Subscription renewal job triggered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error triggering renewal job:', error);
    res.status(500).json({
      status: 'error',
      message: `Error triggering renewal job: ${error.message}`
    });
  }
});

/**
 * @route GET /test/subscriptions
 * @description Test view for user subscriptions
 * @access Private (Disabled in production)
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const userId = req.query.user_id || 'test-user-id';
    logger.info(`Fetching subscriptions for user ${userId}`);
    
    // Get subscriptions for the user
    const subscriptions = await subscriptionService.getUserSubscriptions(userId);
    
    // Generate HTML to display the subscriptions
    const html = generateSubscriptionsHTML(subscriptions, userId);
    
    // Send response
    res.send(html);
  } catch (error) {
    logger.error('Error fetching subscriptions:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error</h1>
          <p>Failed to fetch subscriptions: ${error.message}</p>
          <a href="/test">Back to test home</a>
        </body>
      </html>
    `);
  }
});

/**
 * Generate HTML to display subscriptions
 * @param {Object} result - Result from subscription service
 * @param {string} userId - User ID
 * @returns {string} - HTML content
 */
function generateSubscriptionsHTML(result, userId) {
  const subscriptions = result.subscriptions || [];
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Subscriptions for User</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          h1, h2 {
            color: #2c3e50;
          }
          .subscription {
            background: white;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
            border-left: 4px solid #3498db;
          }
          .subscription.active {
            border-left-color: #2ecc71;
          }
          .subscription.cancelled {
            border-left-color: #e74c3c;
          }
          .subscription.payment_failed {
            border-left-color: #f39c12;
          }
          .status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status.active {
            background: #2ecc71;
            color: white;
          }
          .status.cancelled {
            background: #e74c3c;
            color: white;
          }
          .status.payment_failed {
            background: #f39c12;
            color: white;
          }
          .info {
            margin-top: 10px;
            display: flex;
            flex-wrap: wrap;
          }
          .info-item {
            flex: 1 0 50%;
            min-width: 250px;
            margin-bottom: 10px;
          }
          .info-label {
            font-weight: bold;
            color: #7f8c8d;
          }
          .actions {
            margin-top: 15px;
            text-align: right;
          }
          .button {
            display: inline-block;
            padding: 8px 15px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
          }
          .button.cancel {
            background: #e74c3c;
          }
          .button.disabled {
            background: #95a5a6;
            cursor: not-allowed;
          }
          .empty-state {
            text-align: center;
            padding: 30px;
            color: #7f8c8d;
          }
          .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #3498db;
            text-decoration: none;
          }
          .back-link:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/test" class="back-link">← Back to Test Home</a>
          <h1>Subscriptions for User</h1>
          <p>User ID: ${userId}</p>
          
          ${result.status === 'error' ? 
            `<div class="error">${result.message}</div>` : 
            ''}
          
          ${subscriptions.length === 0 ? 
            `<div class="empty-state">
              <h2>No subscriptions found</h2>
              <p>This user doesn't have any active or past subscriptions.</p>
              <a href="/test/razorpay-checkout?amount=299" class="button">Subscribe to a plan</a>
            </div>` : 
            subscriptions.map(subscription => `
              <div class="subscription ${subscription.status}">
                <h2>${subscription.plan_name}</h2>
                <span class="status ${subscription.status}">${subscription.status}</span>
                
                <div class="info">
                  <div class="info-item">
                    <div class="info-label">Subscription ID</div>
                    <div>${subscription.subscription_id}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Amount</div>
                    <div>₹${subscription.plan_amount} / ${subscription.plan_interval} ${subscription.plan_period}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Start Date</div>
                    <div>${new Date(subscription.start_date).toLocaleDateString()}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Next Billing Date</div>
                    <div>${subscription.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Gateway</div>
                    <div>${subscription.gateway}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Status</div>
                    <div>${subscription.status}</div>
                  </div>
                </div>
                
                <div class="actions">
                  ${subscription.status === 'active' ? 
                    `<a href="/test/cancel-subscription?id=${subscription.id}" class="button cancel">Cancel Subscription</a>` : 
                    `<a href="#" class="button disabled">Cancelled</a>`}
                </div>
              </div>
            `).join('')}
            
          <div style="margin-top: 20px; text-align: center;">
            <a href="/test/razorpay-checkout?amount=299" class="button">Subscribe to a new plan</a>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * @route GET /test/subscription-dashboard
 * @description Test dashboard for subscription management
 * @access Private (Disabled in production)
 */
router.get('/subscription-dashboard', setTestSession, async (req, res) => {
  try {
    // Get all plans
    const plansResult = await subscriptionService.getAllPlans();
    const plans = (plansResult.status === 'success') ? plansResult.plans : [];
    
    // Get user's subscriptions
    const subscriptionsResult = await subscriptionService.getUserSubscriptions(req.user.uuid);
    const subscriptions = (subscriptionsResult.status === 'success') ? subscriptionsResult.subscriptions : [];
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Subscription Management Dashboard</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background: #f5f7fa;
              color: #333;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
            }
            .page-title {
              font-size: 28px;
              font-weight: 600;
              color: #2c3e50;
            }
            .card {
              background: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
              padding: 20px;
              margin-bottom: 20px;
            }
            .card-title {
              font-size: 20px;
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .card-title .actions {
              display: flex;
              gap: 10px;
            }
            .btn {
              display: inline-block;
              padding: 8px 16px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              transition: background 0.3s;
              text-decoration: none;
            }
            .btn:hover {
              background: #2980b9;
            }
            .btn-success {
              background: #2ecc71;
            }
            .btn-success:hover {
              background: #27ae60;
            }
            .btn-warning {
              background: #f39c12;
            }
            .btn-warning:hover {
              background: #e67e22;
            }
            .btn-danger {
              background: #e74c3c;
            }
            .btn-danger:hover {
              background: #c0392b;
            }
            .btn-sm {
              padding: 5px 10px;
              font-size: 12px;
            }
            .btn-outlined {
              background: transparent;
              border: 1px solid #3498db;
              color: #3498db;
            }
            .btn-outlined:hover {
              background: #f8f9fa;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
            }
            .table th, .table td {
              padding: 12px 15px;
              border-bottom: 1px solid #eee;
              text-align: left;
            }
            .table th {
              font-weight: 600;
              color: #7f8c8d;
              font-size: 14px;
            }
            .table tbody tr:hover {
              background: #f8f9fa;
            }
            .status {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
              text-transform: uppercase;
            }
            .status.active {
              background: #2ecc71;
              color: white;
            }
            .status.cancelled {
              background: #95a5a6;
              color: white;
            }
            .status.pending {
              background: #f39c12;
              color: white;
            }
            .status.past_due {
              background: #e74c3c;
              color: white;
            }
            .empty-state {
              padding: 30px;
              text-align: center;
              color: #7f8c8d;
            }
            .plan-card {
              border: 1px solid #eee;
              border-radius: 6px;
              padding: 15px;
              margin-bottom: 15px;
              transition: box-shadow 0.3s;
            }
            .plan-card:hover {
              box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            }
            .plan-name {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 5px;
            }
            .plan-price {
              font-size: 24px;
              font-weight: 700;
              color: #3498db;
              margin-bottom: 10px;
            }
            .plan-details {
              color: #7f8c8d;
              margin-bottom: 15px;
            }
            .plan-features {
              margin-bottom: 20px;
            }
            .plan-feature {
              display: flex;
              align-items: center;
              margin-bottom: 5px;
            }
            .plan-feature:before {
              content: "✓";
              color: #2ecc71;
              margin-right: 8px;
            }
            .admin-controls {
              background: #f8f9fa;
              border-radius: 6px;
              padding: 15px;
              margin-top: 30px;
            }
            .admin-title {
              font-weight: 600;
              margin-bottom: 15px;
              font-size: 16px;
            }
            .admin-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
              gap: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="page-title">Subscription Management Dashboard</div>
              <a href="/test" class="btn">Back to Test Dashboard</a>
            </div>
            
            <div class="card">
              <div class="card-title">
                Your Subscriptions
              </div>
              
              ${subscriptions.length === 0 ? `
                <div class="empty-state">
                  <p>You don't have any subscriptions yet.</p>
                  ${plans.length > 0 ? `<p>Browse our plans below to get started.</p>` : ''}
                </div>
              ` : `
                <table class="table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Start Date</th>
                      <th>Next Billing</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${subscriptions.map(subscription => `
                      <tr>
                        <td>${subscription.plan_name || 'Unknown Plan'}</td>
                        <td>${new Date(subscription.start_date).toLocaleDateString()}</td>
                        <td>${subscription.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString() : 'N/A'}</td>
                        <td><span class="status ${subscription.status}">${subscription.status}</span></td>
                        <td>
                          <a href="/test/subscription-dashboard/subscription-details?id=${subscription.subscription_id}" class="btn btn-sm btn-outlined">View Details</a>
                          ${subscription.status === 'active' ? `
                            <form action="/test/subscription-dashboard/cancel" method="post" style="display: inline;">
                              <input type="hidden" name="subscription_id" value="${subscription.subscription_id}">
                              <button type="submit" class="btn btn-sm btn-danger">Cancel</button>
                            </form>
                          ` : ''}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
            </div>
            
            <div class="card">
              <div class="card-title">
                Available Plans
                <div class="actions">
                  <a href="/test/subscription-dashboard/create-plan" class="btn btn-success">Create New Plan</a>
                </div>
              </div>
              
              ${plans.length === 0 ? `
                <div class="empty-state">
                  <p>No plans are available yet.</p>
                  <p>Click the "Create New Plan" button to add a plan.</p>
                </div>
              ` : `
                <div class="grid">
                  ${plans.map(plan => `
                    <div class="plan-card">
                      <div class="plan-name">${plan.name}</div>
                      <div class="plan-price">₹${plan.amount} / ${plan.period}</div>
                      <div class="plan-details">
                        <div>Billing cycle: ${plan.interval} ${plan.period}</div>
                        <div>Gateway: ${plan.gateway}</div>
                      </div>
                      ${plan.metadata && plan.metadata.description ? `<div>${plan.metadata.description}</div>` : ''}
                      ${plan.metadata && plan.metadata.features ? `
                        <div class="plan-features">
                          ${Array.isArray(plan.metadata.features) ? 
                            plan.metadata.features.map(feature => `<div class="plan-feature">${feature}</div>`).join('') : 
                            `<div class="plan-feature">${plan.metadata.features}</div>`}
                        </div>
                      ` : ''}
                      <div>
                        <a href="/test/subscription-dashboard/subscribe?plan_id=${plan.plan_id}" class="btn btn-success">Subscribe</a>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
            
            <div class="admin-controls">
              <div class="admin-title">Admin Controls & Testing Tools</div>
              <div class="admin-actions">
                <a href="/test/subscription-dashboard/create-past-due" class="btn btn-warning">Create Past-Due Subscription</a>
                <a href="/test/subscription-dashboard/trigger-renewal" class="btn">Trigger Renewal Job</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error loading subscription dashboard:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route GET /test/subscription-dashboard/create-plan
 * @description Form for creating a new subscription plan
 * @access Private (Disabled in production)
 */
router.get('/subscription-dashboard/create-plan', setTestSession, (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Create Subscription Plan</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: #f5f7fa;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .card {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            padding: 20px;
            margin-bottom: 20px;
          }
          .card-title {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
          }
          .form-group {
            margin-bottom: 20px;
          }
          .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #444;
          }
          .form-control {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            transition: border-color 0.3s;
          }
          .form-control:focus {
            border-color: #3498db;
            outline: none;
          }
          .form-select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            background: white;
          }
          .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
            text-decoration: none;
          }
          .btn:hover {
            background: #2980b9;
          }
          .btn-block {
            display: block;
            width: 100%;
          }
          .btn-secondary {
            background: #95a5a6;
          }
          .btn-secondary:hover {
            background: #7f8c8d;
          }
          .form-hint {
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="card-title">Create New Subscription Plan</div>
            
            <form action="/test/subscription-dashboard/create-plan" method="post">
              <div class="form-group">
                <label class="form-label" for="name">Plan Name*</label>
                <input type="text" id="name" name="name" class="form-control" required placeholder="e.g., Premium Monthly">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="amount">Amount (INR)*</label>
                <input type="number" id="amount" name="amount" class="form-control" required placeholder="e.g., 999">
                <div class="form-hint">Amount in INR (₹) without decimal points</div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="billing_interval">Billing Interval*</label>
                <input type="number" id="billing_interval" name="billing_interval" class="form-control" required value="1" min="1">
                <div class="form-hint">Number of periods between billings (usually 1)</div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="period">Period*</label>
                <select id="period" name="period" class="form-select" required>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="gateway">Payment Gateway*</label>
                <select id="gateway" name="gateway" class="form-select" required>
                  <option value="razorpay">Razorpay</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="description">Description</label>
                <textarea id="description" name="description" class="form-control" rows="3" placeholder="Describe what's included in this plan"></textarea>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="features">Features (comma-separated)</label>
                <input type="text" id="features" name="features" class="form-control" placeholder="e.g., unlimited access, premium support, no ads">
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                <a href="/test/subscription-dashboard" class="btn btn-secondary">Cancel</a>
                <button type="submit" class="btn">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      </body>
    </html>
  `;
  
  res.send(html);
});

/**
 * @route POST /test/subscription-dashboard/create-plan
 * @description Process form submission for creating a new subscription plan
 * @access Private (Disabled in production)
 */
router.post('/subscription-dashboard/create-plan', setTestSession, async (req, res) => {
  try {
    // Extract form data
    const { 
      name, 
      amount, 
      billing_interval, 
      period, 
      gateway, 
      description, 
      features 
    } = req.body;
    
    // Create metadata with optional fields
    const metadata = {
      description: description || `${name} subscription plan`
    };
    
    // Add features if provided
    if (features) {
      metadata.features = features.split(',').map(feature => feature.trim());
    }
    
    // Create plan data
    const planData = {
      name,
      amount: parseInt(amount),
      interval: parseInt(billing_interval),
      period,
      gateway,
      metadata
    };
    
    // Create the plan
    const result = await subscriptionService.createPlan(planData);
    
    if (result.status === 'error') {
      return res.status(400).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error Creating Plan</h1>
            <p>${result.message}</p>
            <a href="/test/subscription-dashboard/create-plan">Try Again</a>
          </body>
        </html>
      `);
    }
    
    // Redirect to subscription dashboard
    res.redirect('/test/subscription-dashboard');
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route GET /test/subscription-dashboard/subscribe
 * @description Form for subscribing to a plan
 * @access Private (Disabled in production)
 */
router.get('/subscription-dashboard/subscribe', setTestSession, async (req, res) => {
  try {
    const { plan_id } = req.query;
    
    if (!plan_id) {
      return res.status(400).send('Plan ID is required');
    }
    
    // Get plan details
    const planResult = await subscriptionService.getPlan(plan_id);
    
    if (planResult.status === 'error') {
      return res.status(404).send(`Plan not found: ${planResult.message}`);
    }
    
    const plan = planResult.plan;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Subscribe to ${plan.name}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background: #f5f7fa;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .card {
              background: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
              padding: 20px;
              margin-bottom: 20px;
            }
            .card-title {
              font-size: 24px;
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 20px;
              text-align: center;
            }
            .plan-summary {
              background: #f8f9fa;
              border-radius: 6px;
              padding: 15px;
              margin-bottom: 20px;
            }
            .plan-price {
              font-size: 24px;
              font-weight: 600;
              color: #3498db;
              margin-bottom: 5px;
            }
            .plan-details {
              color: #666;
              margin-bottom: 15px;
            }
            .form-group {
              margin-bottom: 20px;
            }
            .form-label {
              display: block;
              margin-bottom: 8px;
              font-weight: 500;
              color: #444;
            }
            .form-control {
              width: 100%;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 16px;
              transition: border-color 0.3s;
            }
            .form-control:focus {
              border-color: #3498db;
              outline: none;
            }
            .btn {
              display: inline-block;
              padding: 10px 20px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              transition: background 0.3s;
              text-decoration: none;
            }
            .btn:hover {
              background: #2980b9;
            }
            .btn-success {
              background: #2ecc71;
            }
            .btn-success:hover {
              background: #27ae60;
            }
            .btn-secondary {
              background: #95a5a6;
            }
            .btn-secondary:hover {
              background: #7f8c8d;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="card-title">Subscribe to ${plan.name}</div>
              
              <div class="plan-summary">
                <div class="plan-price">₹${plan.amount} / ${plan.period}</div>
                <div class="plan-details">
                  <div>Billing cycle: ${plan.interval} ${plan.period}</div>
                  <div>Gateway: ${plan.gateway}</div>
                  ${plan.metadata && plan.metadata.description ? `<div>Description: ${plan.metadata.description}</div>` : ''}
                  ${plan.metadata && plan.metadata.features ? 
                    `<div>Features: ${Array.isArray(plan.metadata.features) ? 
                      plan.metadata.features.join(', ') : 
                      plan.metadata.features}
                    </div>` : ''}
                </div>
              </div>
              
              <form action="/test/subscription-dashboard/subscribe" method="post">
                <input type="hidden" name="plan_id" value="${plan.plan_id}">
                <input type="hidden" name="gateway" value="${plan.gateway}">
                
                <div class="form-group">
                  <label class="form-label" for="name">Your Name</label>
                  <input type="text" id="name" name="name" class="form-control" required value="Test User">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="email">Email</label>
                  <input type="email" id="email" name="email" class="form-control" required value="test@example.com">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="contact">Phone Number</label>
                  <input type="text" id="contact" name="contact" class="form-control" required value="9876543210">
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                  <a href="/test/subscription-dashboard" class="btn btn-secondary">Cancel</a>
                  <button type="submit" class="btn btn-success">Subscribe Now</button>
                </div>
              </form>
            </div>
          </div>
        </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error loading subscription form:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route POST /test/subscription-dashboard/subscribe
 * @description Process subscription form
 * @access Private (Disabled in production)
 */
router.post('/subscription-dashboard/subscribe', setTestSession, async (req, res) => {
  try {
    const { plan_id } = req.body;
    
    if (!plan_id) {
      return res.status(400).send('Plan ID is required');
    }
    
    // Get plan details first
    const plan = await subscriptionService.getPlan(plan_id);
    if (!plan) {
      return res.status(400).send('Invalid plan ID');
    }
    
    // Create subscription first
    const subscriptionData = {
      planId: plan_id,
      gateway: 'razorpay',
      customer: {
        name: 'Test User',
        email: 'test@example.com',
        contact: '9999999999'
      }
    };
    
    // Create subscription
    const subscriptionResult = await subscriptionService.subscribe(subscriptionData, req.user.uuid);
    
    if (subscriptionResult.status !== 'success') {
      return res.status(400).send(`Subscription creation failed: ${subscriptionResult.message}`);
    }
    
    // Create payment order for the subscription
    const orderData = {
      amount: plan.amount,
      currency: 'INR',
      method: 'upi',
      flow: 'intent',
      notes: {
        test: 'true',
        source: 'subscription',
        subscription_id: subscriptionResult.subscription.id,
        plan_id: plan_id
      }
    };
    
    const paymentResult = await paymentService.createOrder(orderData, req.user.uuid);
    
    if (paymentResult.status !== 'success') {
      // Rollback subscription if payment order creation fails
      await subscriptionService.cancelSubscription(subscriptionResult.subscription.id);
      return res.status(400).send(`Payment order creation failed: ${paymentResult.message}`);
    }
    
    // Redirect to payment page
    res.redirect(`/test/razorpay-checkout?amount=${plan.amount}&subscription=${plan.interval === 'monthly' ? 'monthly' : 'yearly'}`);
  } catch (error) {
    logger.error('Error in subscription creation', { error });
    res.status(500).send('Internal server error');
  }
});

/**
 * @route POST /test/subscription-dashboard/cancel
 * @description Cancel a subscription
 * @access Private (Disabled in production)
 */
router.post('/subscription-dashboard/cancel', setTestSession, async (req, res) => {
  try {
    const { subscription_id } = req.body;
    
    if (!subscription_id) {
      return res.status(400).send('Subscription ID is required');
    }
    
    // Cancel the subscription
    const result = await subscriptionService.cancelSubscription(subscription_id, req.user.uuid);
    
    if (result.status === 'error') {
      return res.status(400).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error Cancelling Subscription</h1>
            <p>${result.message}</p>
            <a href="/test/subscription-dashboard">Back to Dashboard</a>
          </body>
        </html>
      `);
    }
    
    // Redirect to subscription dashboard
    res.redirect('/test/subscription-dashboard');
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route GET /test/subscription-dashboard/subscription-details
 * @description View detailed information about a subscription
 * @access Private (Disabled in production)
 */
router.get('/subscription-dashboard/subscription-details', setTestSession, async (req, res) => {
  try {
    const subscriptionId = req.query.id;
    if (!subscriptionId) {
      return res.status(400).send('Subscription ID is required');
    }

    const subscription = await subscriptionModel.getSubscriptionBySubscriptionId(subscriptionId);
    
    // Format dates
    let startDate = subscription.start_date;
    let nextBillingDate = subscription.next_billing_date;
    
    if (startDate) {
      startDate = new Date(startDate).toLocaleDateString();
    }
    
    if (nextBillingDate) {
      nextBillingDate = new Date(nextBillingDate).toLocaleDateString();
    }
    
    let statusBadgeClass = 'bg-info';
    if (subscription.status === 'active') {
      statusBadgeClass = 'bg-success';
    } else if (subscription.status === 'cancelled') {
      statusBadgeClass = 'bg-danger';
    } else if (subscription.status === 'pending') {
      statusBadgeClass = 'bg-warning';
    }
    
    // Create a responsive layout with Bootstrap
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Subscription Details</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <div class="container mt-5">
          <h1>Subscription Details</h1>
          <div class="card mt-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5>Subscription #${subscription.subscription_id}</h5>
              <span class="badge ${statusBadgeClass}">${subscription.status}</span>
            </div>
            <div class="card-body">
              <div class="row mb-3">
                <div class="col-md-4 text-muted">Plan:</div>
                <div class="col-md-8">${subscription.plan_name}</div>
              </div>
              <div class="row mb-3">
                <div class="col-md-4 text-muted">Amount:</div>
                <div class="col-md-8">₹${subscription.plan_amount}</div>
              </div>
              <div class="row mb-3">
                <div class="col-md-4 text-muted">Billing Cycle:</div>
                <div class="col-md-8">${subscription.plan_interval} ${subscription.plan_period}</div>
              </div>
              <div class="row mb-3">
                <div class="col-md-4 text-muted">Start Date:</div>
                <div class="col-md-8">${startDate}</div>
              </div>
              <div class="row mb-3">
                <div class="col-md-4 text-muted">Next Billing:</div>
                <div class="col-md-8">${nextBillingDate || 'N/A'}</div>
              </div>
              <div class="row mb-3">
                <div class="col-md-4 text-muted">Gateway:</div>
                <div class="col-md-8">${subscription.gateway}</div>
              </div>
            </div>
            <div class="card-footer">
              <div class="d-flex">
                <a href="/test/subscription-dashboard" class="btn btn-secondary">Back to Dashboard</a>
                ${subscription.status === 'pending' ? `
                <a href="/test/razorpay-payment?subscription_id=${subscription.subscription_id}" class="btn btn-success ms-2">Complete Payment</a>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error in subscription details page:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route GET /test/subscription-dashboard/trigger-renewal
 * @description Manually trigger the subscription renewal job
 * @access Private (Disabled in production)
 */
router.get('/subscription-dashboard/trigger-renewal', setTestSession, async (req, res) => {
  try {
    logger.info('Manually triggering subscription renewal job');
    
    // Import the processRenewals function
    const { processRenewals } = require('../jobs/subscription-renewal.job');
    
    // Run the renewal job
    await processRenewals();
    
    // Render response
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Renewal Job Triggered</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background: #f5f7fa;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              padding: 20px;
              text-align: center;
            }
            .card {
              background: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
              padding: 30px;
            }
            .success-icon {
              font-size: 64px;
              color: #3498db;
              margin-bottom: 20px;
            }
            .success-title {
              font-size: 24px;
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 15px;
            }
            .success-message {
              color: #666;
              margin-bottom: 25px;
            }
            .log-info {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 4px;
              text-align: left;
              font-family: monospace;
              margin-bottom: 20px;
            }
            .btn {
              display: inline-block;
              padding: 10px 20px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              transition: background 0.3s;
              text-decoration: none;
            }
            .btn:hover {
              background: #2980b9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="success-icon">⟳</div>
              <div class="success-title">Renewal Job Triggered Successfully</div>
              <div class="success-message">The subscription renewal job has been executed.</div>
              
              <div class="log-info">
                <p>Job: Subscription Renewal</p>
                <p>Triggered: ${new Date().toLocaleString()}</p>
                <p>Status: Completed</p>
                <p>Note: Check server logs for detailed information</p>
              </div>
              
              <div>
                <a href="/test/subscription-dashboard" class="btn">Back to Dashboard</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error triggering renewal job:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route GET /test/subscription-dashboard/create-past-due
 * @description Create a subscription with past-due date for testing renewals
 * @access Private (Disabled in production)
 */
router.get('/subscription-dashboard/create-past-due', setTestSession, async (req, res) => {
  try {
    // Get all plans
    const plansResult = await subscriptionService.getAllPlans();
    
    if (plansResult.status === 'error' || plansResult.plans.length === 0) {
      return res.status(400).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>No Plans Available</h1>
            <p>Please create at least one subscription plan first.</p>
            <a href="/test/subscription-dashboard/create-plan">Create Plan</a>
          </body>
        </html>
      `);
    }
    
    const plans = plansResult.plans;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Create Past-Due Subscription</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background: #f5f7fa;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .card {
              background: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
              padding: 20px;
              margin-bottom: 20px;
            }
            .card-title {
              font-size: 24px;
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 20px;
              text-align: center;
            }
            .form-group {
              margin-bottom: 20px;
            }
            .form-label {
              display: block;
              margin-bottom: 8px;
              font-weight: 500;
              color: #444;
            }
            .form-select {
              width: 100%;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 16px;
              background: white;
            }
            .form-control {
              width: 100%;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 16px;
              transition: border-color 0.3s;
            }
            .alert {
              padding: 15px;
              border-radius: 4px;
              margin-bottom: 20px;
              background: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
            .alert-warning {
              background: #fff3cd;
              color: #856404;
              border: 1px solid #ffeeba;
            }
            .btn {
              display: inline-block;
              padding: 10px 20px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              transition: background 0.3s;
              text-decoration: none;
            }
            .btn:hover {
              background: #2980b9;
            }
            .btn-warning {
              background: #f39c12;
            }
            .btn-warning:hover {
              background: #e67e22;
            }
            .btn-secondary {
              background: #95a5a6;
            }
            .btn-secondary:hover {
              background: #7f8c8d;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="card-title">Create Past-Due Subscription</div>
              
              <div class="alert alert-warning">
                <strong>Testing Purpose Only:</strong> This will create a subscription with a past billing date to test the renewal process.
              </div>
              
              <form action="/test/subscription-dashboard/create-past-due" method="post">
                <div class="form-group">
                  <label class="form-label" for="plan_id">Select Plan</label>
                  <select id="plan_id" name="plan_id" class="form-select" required>
                    ${plans.map(plan => `
                      <option value="${plan.plan_id}">${plan.name} (₹${plan.amount}/${plan.period})</option>
                    `).join('')}
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="days_past_due">Days Past Due</label>
                  <input type="number" id="days_past_due" name="days_past_due" class="form-control" required value="5" min="1" max="30">
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                  <a href="/test/subscription-dashboard" class="btn btn-secondary">Cancel</a>
                  <button type="submit" class="btn btn-warning">Create Past-Due Subscription</button>
                </div>
              </form>
            </div>
          </div>
        </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error loading past-due form:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route POST /test/subscription-dashboard/create-past-due
 * @description Process form for creating a past-due subscription
 * @access Private (Disabled in production)
 */
router.post('/subscription-dashboard/create-past-due', setTestSession, async (req, res) => {
  try {
    const { plan_id, days_past_due } = req.body;
    
    // Get plan details
    const planResult = await subscriptionService.getPlan(plan_id);
    
    if (planResult.status === 'error') {
      return res.status(400).send(`Plan not found: ${planResult.message}`);
    }
    
    const plan = planResult.plan;
    
    // Create subscription data
    const subscriptionData = {
      planId: plan_id,
      gateway: plan.gateway,
      customer: {
        name: 'Test User',
        email: 'test@example.com',
        contact: '9876543210'
      }
    };
    
    // Create subscription
    const result = await subscriptionService.subscribe(subscriptionData, req.user.uuid);
    
    if (result.status === 'error') {
      return res.status(400).send(`Error creating subscription: ${result.message}`);
    }
    
    // Update the next_billing_date to be in the past
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - parseInt(days_past_due));
    
    // Get the subscription ID from the result
    const subscription = result.subscription;
    
    // Update next billing date to be in the past
    await subscriptionModel.updateNextBillingDate(subscription.id, pastDate);
    
    // Redirect to subscription dashboard
    res.redirect('/test/subscription-dashboard');
  } catch (error) {
    console.error('Error creating past-due subscription:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Add a menu item to the main test dashboard
router.get('/', (req, res, next) => {
  // Save the original send method
  const originalSend = res.send;
  
  // Override the send method
  res.send = function(html) {
    // Only modify HTML responses
    if (typeof html === 'string' && html.includes('Payment Service Test Dashboard')) {
      // Add a new card for the subscription dashboard before the closing card-grid div
      const subscriptionDashboardCard = `
        <div class="card">
          <h3>Subscription Testing</h3>
          <p>Comprehensive dashboard for testing all subscription features</p>
          <a href="/test/subscription-dashboard" class="link">Open Dashboard</a>
        </div>
      `;
      
      // Insert the card in the appropriate place
      html = html.replace('</div>\n          \n          <div class="section">', subscriptionDashboardCard + '</div>\n          \n          <div class="section">');
    }
    
    // Call the original send method
    return originalSend.call(this, html);
  };
  
  // Call the next middleware
  next();
});

/**
 * @route GET /test/subscription-dashboard/verify-payment
 * @description Form for verifying a subscription payment
 * @access Private (Disabled in production)
 */
router.get('/subscription-dashboard/verify-payment', setTestSession, async (req, res) => {
  try {
    const { subscription_id, order_id } = req.query;
    
    if (!subscription_id || !order_id) {
      return res.status(400).send('Subscription ID and Order ID are required');
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Verify Subscription Payment</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background: #f5f7fa;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .card {
              background: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
              padding: 20px;
              margin-bottom: 20px;
            }
            .card-title {
              font-size: 24px;
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 20px;
              text-align: center;
            }
            .form-group {
              margin-bottom: 20px;
            }
            .form-label {
              display: block;
              margin-bottom: 8px;
              font-weight: 500;
              color: #444;
            }
            .form-control {
              width: 100%;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 16px;
              transition: border-color 0.3s;
            }
            .form-control:focus {
              border-color: #3498db;
              outline: none;
            }
            .btn {
              display: inline-block;
              padding: 10px 20px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              transition: background 0.3s;
              text-decoration: none;
            }
            .btn:hover {
              background: #2980b9;
            }
            .btn-success {
              background: #2ecc71;
            }
            .btn-success:hover {
              background: #27ae60;
            }
            .btn-secondary {
              background: #95a5a6;
            }
            .btn-secondary:hover {
              background: #7f8c8d;
            }
            .note {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 4px;
              margin-bottom: 20px;
              font-size: 14px;
              color: #7f8c8d;
              border-left: 4px solid #3498db;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="card-title">Verify Subscription Payment</div>
              
              <div class="note">
                <p>This form simulates the payment verification process that would happen after a customer completes payment through a payment gateway.</p>
                <p>In a real application, this would typically be handled automatically via a redirect from the payment gateway or a webhook.</p>
              </div>
              
              <form action="/test/subscription-dashboard/verify-payment" method="post">
                <input type="hidden" name="subscription_id" value="${subscription_id}">
                <input type="hidden" name="order_id" value="${order_id}">
                
                <div class="form-group">
                  <label class="form-label" for="razorpay_order_id">Razorpay Order ID*</label>
                  <input type="text" id="razorpay_order_id" name="razorpay_order_id" class="form-control" required value="${order_id}">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="razorpay_payment_id">Razorpay Payment ID*</label>
                  <input type="text" id="razorpay_payment_id" name="razorpay_payment_id" class="form-control" required placeholder="pay_123456789">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="razorpay_signature">Razorpay Signature*</label>
                  <input type="text" id="razorpay_signature" name="razorpay_signature" class="form-control" required placeholder="abcdef1234567890">
                  <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">For testing, you can use any string as the signature.</p>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                  <a href="/test/subscription-dashboard" class="btn btn-secondary">Cancel</a>
                  <button type="submit" class="btn btn-success">Verify Payment</button>
                </div>
              </form>
            </div>
          </div>
        </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error loading payment verification form:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route POST /test/subscription-dashboard/verify-payment
 * @description Process a subscription payment verification
 * @access Private (Disabled in production)
 */
router.post('/subscription-dashboard/verify-payment', setTestSession, async (req, res) => {
  try {
    const { 
      subscription_id, 
      order_id, 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;
    
    if (!subscription_id || !order_id) {
      return res.status(400).send('Subscription ID and Order ID are required');
    }
    
    // Prepare payment data
    const paymentData = {
      subscription_id,
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    };
    
    // Call the subscription service to verify the payment
    const result = await subscriptionService.verifySubscriptionPayment(
      paymentData, 
      subscription_id, 
      req.user.uuid
    );
    
    if (result.status === 'error') {
      return res.status(400).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error Verifying Payment</h1>
            <p>${result.message}</p>
            <a href="/test/subscription-dashboard">Back to Dashboard</a>
          </body>
        </html>
      `);
    }
    
    // Show success page
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Verified</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background: #f5f7fa;
              color: #333;
              text-align: center;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .card {
              background: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
              padding: 30px;
              margin-bottom: 20px;
            }
            .success-icon {
              font-size: 72px;
              color: #2ecc71;
              margin-bottom: 20px;
            }
            .card-title {
              font-size: 28px;
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 20px;
            }
            .detail {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 4px;
              margin-bottom: 20px;
              text-align: left;
            }
            .detail-label {
              font-weight: 600;
              margin-bottom: 5px;
              color: #7f8c8d;
            }
            .detail-value {
              font-size: 18px;
            }
            .btn {
              display: inline-block;
              padding: 10px 20px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              transition: background 0.3s;
              text-decoration: none;
              margin: 5px;
            }
            .btn:hover {
              background: #2980b9;
            }
            .buttons {
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="success-icon">✓</div>
              <div class="card-title">Payment Verified Successfully!</div>
              
              <p>Your subscription payment has been verified and your subscription is now active.</p>
              
              <div class="detail">
                <div class="detail-label">Subscription ID:</div>
                <div class="detail-value">${result.subscription.subscription_id}</div>
              </div>
              
              <div class="detail">
                <div class="detail-label">Plan:</div>
                <div class="detail-value">${result.subscription.plan.name}</div>
              </div>
              
              <div class="detail">
                <div class="detail-label">Amount:</div>
                <div class="detail-value">₹${result.subscription.plan.amount}</div>
              </div>
              
              <div class="detail">
                <div class="detail-label">Status:</div>
                <div class="detail-value">${result.subscription.status}</div>
              </div>
              
              <div class="buttons">
                <a href="/test/subscription-dashboard" class="btn">Back to Dashboard</a>
                <a href="/test/subscription-dashboard/subscription-details?id=${result.subscription.subscription_id}" class="btn">View Subscription Details</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * Razorpay payment page with proper CSP headers
 */
router.get('/razorpay-payment', setTestSession, async (req, res) => {
  try {
    // Get parameters from query string
    const amount = parseFloat(req.query.amount) || 100;
    const subscriptionId = req.query.subscription_id;
    const orderId = req.query.order_id;
    
    // If we don't have order ID, and we have subscription ID, create a subscription order
    if (!orderId && subscriptionId) {
      // Get subscription details
      const subscription = await subscriptionModel.getSubscriptionBySubscriptionId(subscriptionId);
      if (!subscription) {
        return res.status(404).send('Subscription not found');
      }
      
      // Create a payment order for the subscription
      const orderResult = await subscriptionService.createSubscriptionOrder(subscriptionId, req.user.uuid);
      
      if (orderResult.status !== 'success') {
        return res.status(400).send(`Error creating order: ${orderResult.message}`);
      }
      
      // Redirect to self with the order ID
      return res.redirect(`/test/razorpay-payment?amount=${subscription.plan_amount}&subscription_id=${subscriptionId}&order_id=${orderResult.payment.order_id}`);
    }
    
    // If we have neither order ID nor subscription ID, create a regular order
    if (!orderId && !subscriptionId) {
      // Create a regular payment order
      const orderData = {
        amount,
        currency: 'INR',
        notes: {
          test: 'true',
          source: 'direct-checkout'
        }
      };
      
      const orderResult = await paymentService.createOrder(orderData, req.user.uuid);
      
      if (orderResult.status !== 'success') {
        return res.status(400).send(`Error creating order: ${orderResult.message}`);
      }
      
      // Redirect to self with the order ID
      return res.redirect(`/test/razorpay-payment?amount=${amount}&order_id=${orderResult.payment.order_id}`);
    }
    
    // Set proper CSP headers to allow Razorpay scripts and inline JS
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://*.razorpay.com; " +
      "frame-src 'self' https://*.razorpay.com; " +
      "style-src 'self' 'unsafe-inline' https://*.razorpay.com; " +
      "img-src 'self' data: https://*.razorpay.com; " +
      "connect-src 'self' https://*.razorpay.com;"
    );
    
    // Get the Razorpay key from config
    const razorpayConfig = paymentConfig.gateways.razorpay;
    const razorpayKeyId = razorpayConfig.credentials.key_id || process.env.RAZORPAY_KEY_ID || 'rzp_test_wsmyEOUbhu4SYa';
    
    // Determine if this is a subscription payment
    const isSubscription = !!subscriptionId;
    
    // Create an HTML response with the Razorpay checkout
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSubscription ? 'Subscription Payment' : 'Payment Page'}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
      color: #333;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 30px;
      margin-top: 40px;
      position: relative;
      z-index: 1; /* Ensure our container has proper z-index */
    }
    h1 {
      color: #343a40;
      text-align: center;
      margin-bottom: 30px;
    }
    .details {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .details-row {
      display: flex;
      margin-bottom: 10px;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .details-label {
      flex: 1;
      color: #6c757d;
      font-weight: 500;
    }
    .details-value {
      flex: 2;
      font-weight: 600;
    }
    .pay-button {
      background-color: #2874f0;
      color: white;
      border: none;
      padding: 12px 25px;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
      display: block;
      margin: 0 auto 15px;
      transition: background-color 0.2s;
      position: relative;
      z-index: 2; /* Higher z-index for the button */
    }
    .pay-button:hover {
      background-color: #1a5cbf;
    }
    .status {
      margin-top: 20px;
      padding: 15px;
      border-radius: 4px;
      background-color: #f8f9fa;
      display: none;
    }
    .success {
      border-left: 4px solid #28a745;
    }
    .error {
      border-left: 4px solid #dc3545;
    }
    .info {
      border-left: 4px solid #17a2b8;
    }
    /* Debug panel */
    .debug-panel {
      margin-top: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      display: none;
    }
    .debug-title {
      font-weight: bold;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
    }
    .debug-content {
      max-height: 200px;
      overflow: auto;
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .debug-toggle {
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 12px;
      cursor: pointer;
      margin-top: 10px;
    }
    /* CSS to ensure Razorpay modal displays properly */
    .razorpay-container {
      z-index: 10000 !important;
    }
    .razorpay-backdrop {
      z-index: 9999 !important;
      background-color: rgba(0, 0, 0, 0.6) !important;
      opacity: 1 !important;
    }
    .razorpay-checkout-frame {
      z-index: 10001 !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${isSubscription ? 'Complete Your Subscription Payment' : 'Complete Your Payment'}</h1>
    
    <div class="details">
      <div class="details-row">
        <div class="details-label">Amount:</div>
        <div class="details-value">₹${amount}</div>
      </div>
      ${isSubscription ? `
      <div class="details-row">
        <div class="details-label">Subscription ID:</div>
        <div class="details-value">${subscriptionId}</div>
      </div>
      ` : ''}
      <div class="details-row">
        <div class="details-label">Order ID:</div>
        <div class="details-value">${orderId}</div>
      </div>
    </div>
    
    <button id="rzp-button" class="pay-button">Pay with Razorpay</button>
    <button id="debug-toggle" class="debug-toggle">Show Debug Info</button>
    
    <div id="status" class="status"></div>
    
    <div id="debug-panel" class="debug-panel">
      <div class="debug-title">
        <span>Debug Information</span>
        <button id="debug-clear" style="font-size: 12px; border: none; background: #eee; padding: 2px 5px; cursor: pointer;">Clear</button>
      </div>
      <div id="debug-content" class="debug-content"></div>
    </div>
  </div>
  
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    // Debug logging functions
    const debugPanel = document.getElementById('debug-panel');
    const debugContent = document.getElementById('debug-content');
    
    // Store important values in JavaScript variables
    const razorpayKeyIdValue = "${razorpayKeyId}";
    const orderIdValue = "${orderId}";
    const amountValue = ${amount};
    const isSubscriptionValue = ${isSubscription ? 'true' : 'false'};
    const subscriptionIdValue = "${subscriptionId || ''}";
    const verifySubscriptionEndpoint = "/api/payment/verify-subscription-payment";
    const verifyPaymentEndpoint = "/api/payment/verify-payment";
    const successRedirectSubscription = "/test/subscription-dashboard/subscription-details?id=${subscriptionId || ''}";
    const successRedirectPayment = "/test/payment-success?txn=";
    
    document.getElementById('debug-toggle').addEventListener('click', function() {
      if (debugPanel.style.display === 'none' || !debugPanel.style.display) {
        debugPanel.style.display = 'block';
        this.textContent = 'Hide Debug Info';
      } else {
        debugPanel.style.display = 'none';
        this.textContent = 'Show Debug Info';
      }
    });
    
    document.getElementById('debug-clear').addEventListener('click', function() {
      debugContent.innerHTML = '';
    });
    
    function debugLog(message, type = 'info') {
      const timestamp = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.innerHTML = '<strong>[' + timestamp + ']</strong> <span style="color: ' + (type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue') + '">' + message + '</span>';
      debugContent.appendChild(entry);
      debugContent.scrollTop = debugContent.scrollHeight;
      
      console.log('[DEBUG] ' + message);
    }
    
    // Helper function to update status
    function updateStatus(message, type) {
      const statusElement = document.getElementById('status');
      statusElement.style.display = 'block';
      statusElement.className = 'status ' + type;
      statusElement.textContent = message;
      debugLog(message, type);
    }
    
    // Start with basic debug info
    debugLog('Page loaded. Razorpay Key ID: ' + razorpayKeyIdValue);
    debugLog('Order ID: ' + orderIdValue);
    
    document.getElementById('rzp-button').onclick = function(e) {
      e.preventDefault();
      updateStatus('Initializing payment...', 'info');
      
      debugLog('Razorpay button clicked');
      
      // Ensure any existing Razorpay frames are cleared first
      const existingFrames = document.querySelectorAll('.razorpay-checkout-frame, .razorpay-container, .razorpay-backdrop');
      existingFrames.forEach(frame => {
        debugLog('Removing existing Razorpay frame: ' + frame.className);
        frame.parentNode.removeChild(frame);
      });
      
      var options = {
        "key": razorpayKeyIdValue,
        "amount": amountValue * 100, // Amount in paise
        "currency": "INR",
        "name": "Payment Microservice",
        "description": isSubscriptionValue ? 'Subscription Payment' : 'One-Time Payment',
        "order_id": orderIdValue,
        "modal": {
          "backdropclose": false,
          "escape": false,
          "handleback": true,
          "animation": true,
          "confirm_close": true
        },
        "handler": function (response) {
          debugLog('Payment response received: ' + JSON.stringify(response), 'success');
          updateStatus('Payment successful! Verifying...', 'success');
          
          // Prepare verification data
          const verificationData = {
            order_id: orderIdValue,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          };
          
          if (isSubscriptionValue) {
            verificationData.subscription_id = subscriptionIdValue;
          }
          
          debugLog('Sending verification request: ' + JSON.stringify(verificationData));
          
          // Call verification endpoint
          fetch(isSubscriptionValue ? verifySubscriptionEndpoint : verifyPaymentEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(verificationData),
            credentials: 'include'
          })
          .then(response => response.json())
          .then(data => {
            debugLog('Verification response: ' + JSON.stringify(data));
            if (data.status === 'success') {
              updateStatus('Payment verified successfully! Redirecting...', 'success');
              setTimeout(() => {
                window.location.href = isSubscriptionValue 
                  ? successRedirectSubscription 
                  : successRedirectPayment + response.razorpay_payment_id;
              }, 1500);
            } else {
              updateStatus('Payment verification failed: ' + data.message, 'error');
            }
          })
          .catch(error => {
            debugLog('Verification error: ' + error.message, 'error');
            updateStatus('Error during verification: ' + error.message, 'error');
          });
        },
        "prefill": {
          "name": "Test User",
          "email": "test@example.com",
          "contact": "9999999999"
        },
        "theme": {
          "color": "#2874f0"
        },
        "readonly": {
          "contact": false,
          "email": false,
          "name": false
        }
      };
      
      debugLog('Razorpay options: ' + JSON.stringify(options));
      
      try {
        debugLog('Creating Razorpay instance');
        var rzp1 = new Razorpay(options);
        
        rzp1.on('payment.failed', function (response) {
          debugLog('Payment failed: ' + JSON.stringify(response.error), 'error');
          updateStatus('Payment failed: ' + response.error.description, 'error');
        });
        
        // Extra event listeners for debugging
        rzp1.on('payment.error', function(response) {
          debugLog('Payment error: ' + JSON.stringify(response), 'error');
        });
        
        rzp1.on('payment.submit', function() {
          debugLog('Payment submitted');
        });
        
        rzp1.on('payment.cancel', function() {
          debugLog('Payment cancelled by user');
        });
        
        updateStatus('Opening Razorpay...', 'info');
        debugLog('Opening Razorpay payment form');
        
        // Add a small delay before opening to ensure DOM is ready
        setTimeout(() => {
          rzp1.open();
          debugLog('Razorpay open() method called');
        }, 100);
      } catch (error) {
        debugLog('Error opening Razorpay: ' + error.message, 'error');
        updateStatus('Error opening Razorpay: ' + error.message, 'error');
      }
    };
    
    // Check if Razorpay is loaded correctly
    if (typeof Razorpay === 'undefined') {
      debugLog('Razorpay script failed to load!', 'error');
      updateStatus('Razorpay script failed to load. Please check your internet connection and try again.', 'error');
    } else {
      debugLog('Razorpay script loaded successfully');
    }
  </script>
</body>
</html>`;
    
    res.send(html);
    
  } catch (error) {
    console.error('Error in Razorpay payment page:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * @route GET /test/test-subscription-order
 * @description Test endpoint for subscription order creation
 * @access Private (Disabled in production)
 */
router.get('/test-subscription-order', setTestSession, async (req, res) => {
  try {
    // Get or create a test subscription
    let subscription;
    const subscriptions = await subscriptionModel.getUserSubscriptions('test-user-uuid');
    
    if (subscriptions && subscriptions.length > 0) {
      // Find a pending subscription
      subscription = subscriptions.find(s => s.status === 'pending');
      
      if (!subscription) {
        // If no pending subscription, try to get any subscription
        subscription = subscriptions[0];
      }
    }
    
    if (!subscription) {
      return res.status(400).send(`
        <h1>No subscriptions found</h1>
        <p>Please create a subscription first by visiting the <a href="/test/subscription-dashboard">subscription dashboard</a>.</p>
      `);
    }
    
    logger.info('Testing subscription order creation', { 
      subscriptionId: subscription.subscription_id,
      status: subscription.status
    });
    
    // Create a subscription order
    const result = await subscriptionService.createSubscriptionOrder(
      subscription.subscription_id, 
      'test-user-uuid'
    );
    
    // Return result in a nice HTML format
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Subscription Order Test</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .success { border-left: 4px solid #2ecc71; }
            .error { border-left: 4px solid #e74c3c; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
            h1 { color: #2c3e50; }
            .btn { display: inline-block; padding: 8px 16px; background: #3498db; color: white; 
                  text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Subscription Order Test</h1>
            
            <div class="card ${result.status === 'success' ? 'success' : 'error'}">
              <h2>Result: ${result.status.toUpperCase()}</h2>
              ${result.status === 'success' 
                ? `<p>Order created successfully with ID: ${result.payment.order_id}</p>` 
                : `<p>Error: ${result.message}</p>`}
              
              <h3>Subscription Details:</h3>
              <ul>
                <li>Subscription ID: ${subscription.subscription_id}</li>
                <li>Status: ${subscription.status}</li>
                <li>Plan ID: ${subscription.plan_id}</li>
              </ul>
              
              <h3>Complete Response:</h3>
              <pre>${JSON.stringify(result, null, 2)}</pre>
            </div>
            
            <a href="/test" class="btn">Back to Test Dashboard</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <pre>${error.stack}</pre>
    `);
  }
});

router.post('/payment-callback', setTestSession, async (req, res) => {
  try {
    const paymentData = {
      razorpay_order_id: req.body.razorpay_order_id,
      razorpay_payment_id: req.body.razorpay_payment_id,
      razorpay_signature: req.body.razorpay_signature
    };
    
    // Verify payment
    const verificationResult = await paymentService.verifyPayment(paymentData, req.user.uuid);
    
    if (verificationResult.status !== 'success') {
      return res.status(400).send(`Payment verification failed: ${verificationResult.message}`);
    }
    
    // Get order details to check if it's a subscription payment
    const order = await orderModel.getOrderByOrderId(paymentData.razorpay_order_id);
    
    if (order?.metadata?.subscription_id) {
      // Activate subscription
      const activationResult = await subscriptionService.activateSubscription(order.metadata.subscription_id);
      
      if (activationResult.status !== 'success') {
        logger.error('Failed to activate subscription', { 
          subscription_id: order.metadata.subscription_id,
          error: activationResult.message 
        });
      }
    }
    
    // Render success page
    res.render('payment-success', {
      payment_id: paymentData.razorpay_payment_id,
      order_id: paymentData.razorpay_order_id,
      subscription_id: order?.metadata?.subscription_id
    });
  } catch (error) {
    logger.error('Error in payment callback', { error });
    res.status(500).send(`Error: ${error.message}`);
  }
});

module.exports = router; 