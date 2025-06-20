-- Payment Microservice Database Schema
-- This script will run on initialization but will only create tables if they don't exist
-- This ensures that we don't lose data on redeployment

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  amount INT NOT NULL,
  interval INT NOT NULL,
  period VARCHAR(50) NOT NULL CHECK (period IN ('monthly', 'yearly')),
  gateway VARCHAR(100) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (plan_id, gateway)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL, -- UUID from auth service
  plan_id INT NOT NULL,
  subscription_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'cancelled', 'failed', 'pending')),
  gateway VARCHAR(100) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  next_billing_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id),
  UNIQUE (subscription_id, gateway)
);

-- Orders table (for decoupled order management)
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) CHECK (status IN ('created', 'processing', 'completed', 'cancelled', 'refunded', 'failed')),
  gateway VARCHAR(100) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id),
  INDEX (order_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  order_reference_id INT NULL,
  subscription_id VARCHAR(255),
  amount INT NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('created', 'pending', 'success', 'failed', 'expired', 'cancelled')),
  user_id VARCHAR(255) NOT NULL, -- UUID from auth service
  gateway VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('one-time', 'subscription')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMP,
  refund_status VARCHAR(50) DEFAULT 'none' CHECK (refund_status IN ('none', 'initiated', 'completed')),
  transaction_id UUID NOT NULL UNIQUE,
  metadata JSON,
  FOREIGN KEY (order_reference_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Create indexes for better query performance only if they don't exist
-- Using DROP/CREATE pattern for safety - MySQL doesn't have CREATE INDEX IF NOT EXISTS
-- Payments indexes
SELECT COUNT(*) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = DATABASE() AND table_name = 'payments' AND index_name = 'idx_payments_user_id';
SET @create_index = CONCAT('CREATE INDEX idx_payments_user_id ON payments(user_id)');
PREPARE stmt FROM @create_index;
SET @drop_index = CONCAT('DROP INDEX idx_payments_user_id ON payments');

-- Only create if it doesn't exist
SET @create_stmt = IF(@index_exists=0, @create_index, 'SELECT 1');
PREPARE stmt FROM @create_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Repeat for other indexes
SELECT COUNT(*) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = DATABASE() AND table_name = 'payments' AND index_name = 'idx_payments_order_id';
SET @create_stmt = IF(@index_exists=0, 'CREATE INDEX idx_payments_order_id ON payments(order_id)', 'SELECT 1');
PREPARE stmt FROM @create_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = DATABASE() AND table_name = 'payments' AND index_name = 'idx_payments_transaction_id';
SET @create_stmt = IF(@index_exists=0, 'CREATE INDEX idx_payments_transaction_id ON payments(transaction_id)', 'SELECT 1');
PREPARE stmt FROM @create_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = DATABASE() AND table_name = 'subscriptions' AND index_name = 'idx_subscriptions_user_id';
SET @create_stmt = IF(@index_exists=0, 'CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id)', 'SELECT 1');
PREPARE stmt FROM @create_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = DATABASE() AND table_name = 'subscriptions' AND index_name = 'idx_subscriptions_subscription_id';
SET @create_stmt = IF(@index_exists=0, 'CREATE INDEX idx_subscriptions_subscription_id ON subscriptions(subscription_id)', 'SELECT 1');
PREPARE stmt FROM @create_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt; 