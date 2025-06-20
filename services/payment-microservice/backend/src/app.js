const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production'
    ? 'env.production.txt'
    : 'env.development.txt';
dotenv.config({ path: path.resolve(__dirname, '../', envFile) });

// Import routes and services
const healthRoutes = require('./routes/health.routes');
const paymentRoutes = require('./routes/payment.routes');
const refundRoutes = require('./routes/refund.routes');
const testRoutes = require('./routes/test.routes');
const database = require('./config/database');
const cronService = require('./services/cron.service');
const reconciliationService = require('./services/reconciliation.service');
const webhookRoutes = require('./routes/webhook.routes');
const errorMiddleware = require('./middleware/error.middleware');
const authMiddleware = require('./middleware/auth.middleware');
const logger = require('./utils/logger');
const adminRoutes = require('./routes/admin.routes');
const planModel = require('./models/plan.model');

// Initialize app
const app = express();
const PORT = process.env.PORT || 4000;

// Generate a random nonce for each request
app.use((req, res, next) => {
  res.locals.nonce = 'payment-test-nonce';
  next();
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'nonce-payment-test-nonce'",
        "https://checkout.razorpay.com"
      ],
      frameSrc: ["'self'", "https://api.razorpay.com"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      imgSrc: ["'self'", "data:", "https://api.qrserver.com"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined'));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payment/refund', refundRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Test routes - only available in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/test', testRoutes);
  console.log('Test routes enabled - available at /test/*');
}

// Serve success page for testing
app.get('/payment-success.html', (req, res) => {
  res.redirect(`/test/payment-success?txn=${req.query.txn || ''}`);
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Payment service is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorMiddleware);

// Initialize cron jobs
logger.info('Initializing cron service');
cronService.init();

// Initialize reconciliation service
logger.info('Initializing reconciliation service');
reconciliationService.init();

// 404 middleware
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.stack}`);
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Process event handlers
process.on('uncaughtException', (error) => {
  console.error(`[FATAL] ${new Date().toISOString()} - Uncaught Exception:`, error);
  // Attempt graceful shutdown
  cronService.stop();
  reconciliationService.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[FATAL] ${new Date().toISOString()} - Unhandled Rejection at:`, promise, 'reason:', reason);
  // Keep process alive but log the error
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cronService.stop();
  reconciliationService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  cronService.stop();
  reconciliationService.stop();
  process.exit(0);
});

// Test database connection
database.testConnection()
  .then((connected) => {
    if (connected) {
      // Initialize cron jobs
      cronService.init();
      
      // Start server
      const server = app.listen(PORT, () => {
        console.log(`[INFO] ${new Date().toISOString()} - Payment Service running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      });
      
      // Set timeout for server connections
      server.timeout = 60000; // 60 seconds
    } else {
      console.error(`[FATAL] ${new Date().toISOString()} - Failed to connect to database. Exiting...`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error(`[FATAL] ${new Date().toISOString()} - Error connecting to database:`, error);
    process.exit(1);
  });

const initializeDatabase = async () => {
  try {
    // Check database connection
    await database.query('SELECT 1');
    console.log('Database connection successful');

    // Check and create tables
    console.log('Checking database tables...');
    const tables = await database.query('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);
    
    if (tableNames.length < 4) {
      console.log('Some database tables are missing. Checking each table...');
      
      // Create plans table if not exists
      if (!tableNames.includes('plans')) {
        console.log('Creating plans table...');
        await database.query(`
          CREATE TABLE IF NOT EXISTS plans (
            id INT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            interval_type VARCHAR(20) NOT NULL,
            interval_count INT NOT NULL DEFAULT 1,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        // Create default plans
        await planModel.createDefaultPlans();
      }
      
      // Create subscriptions table if not exists
      if (!tableNames.includes('subscriptions')) {
        console.log('Creating subscriptions table...');
        await database.query(`
          CREATE TABLE IF NOT EXISTS subscriptions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id VARCHAR(255) NOT NULL,
            plan_id INT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            start_date TIMESTAMP NOT NULL,
            end_date TIMESTAMP NOT NULL,
            gateway VARCHAR(50) NOT NULL,
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (plan_id) REFERENCES plans(id)
          )
        `);
      }
      
      // Create orders table if not exists
      if (!tableNames.includes('orders')) {
        console.log('Creating orders table...');
        await database.query(`
          CREATE TABLE IF NOT EXISTS orders (
            id INT PRIMARY KEY AUTO_INCREMENT,
            order_id VARCHAR(255) NOT NULL UNIQUE,
            user_id VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            status VARCHAR(20) NOT NULL DEFAULT 'created',
            gateway VARCHAR(50) NOT NULL,
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
      }
      
      // Create payments table if not exists
      if (!tableNames.includes('payments')) {
        console.log('Creating payments table...');
        await database.query(`
          CREATE TABLE IF NOT EXISTS payments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            order_id VARCHAR(255) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            gateway VARCHAR(50) NOT NULL,
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(order_id)
          )
        `);
      }
      
      // Create refunds table if not exists
      if (!tableNames.includes('refunds')) {
        console.log('Creating refunds table...');
        await database.query(`
          CREATE TABLE IF NOT EXISTS refunds (
            id INT PRIMARY KEY AUTO_INCREMENT,
            payment_id INT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            reason TEXT,
            user_id VARCHAR(255) NOT NULL,
            gateway VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'initiated',
            gateway_refund_id VARCHAR(255),
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (payment_id) REFERENCES payments(id)
          )
        `);
      }
    }
    
    // Check and create necessary indexes
    console.log('Checking and creating necessary indexes...');
    await database.query('CREATE INDEX IF NOT EXISTS idx_user_id ON subscriptions(user_id)');
    await database.query('CREATE INDEX IF NOT EXISTS idx_plan_id ON subscriptions(plan_id)');
    await database.query('CREATE INDEX IF NOT EXISTS idx_order_id ON orders(order_id)');
    await database.query('CREATE INDEX IF NOT EXISTS idx_user_id ON orders(user_id)');
    await database.query('CREATE INDEX IF NOT EXISTS idx_order_id ON payments(order_id)');
    await database.query('CREATE INDEX IF NOT EXISTS idx_user_id ON payments(user_id)');
    
    console.log('Database tables and indexes initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = app; 