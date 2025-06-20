-- Orders table to decouple from payments
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) CHECK (status IN ('created', 'processing', 'completed', 'cancelled', 'refunded', 'failed')),
  gateway VARCHAR(100) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (user_id),
  INDEX (order_id)
);

-- Add order_id reference to payments table if not exists
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS order_reference_id INT NULL,
ADD CONSTRAINT fk_payment_order FOREIGN KEY (order_reference_id) REFERENCES orders(id) ON DELETE SET NULL; 