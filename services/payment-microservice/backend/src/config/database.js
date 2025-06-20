const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Function to test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    
    // Initialize database tables
    await initializeTables();
    
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Execute a query with parameters
const query = async (sql, params) => {
  try {
    const [results] = await pool.execute(sql, params);
    console.log('Database query results:', results);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper function to check if an index exists
const indexExists = async (tableName, indexName) => {
  try {
    const [indexes] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics 
      WHERE table_schema = ? 
        AND table_name = ?
        AND index_name = ?
    `, [process.env.DB_NAME, tableName, indexName]);
    
    return indexes[0].count > 0;
  } catch (error) {
    console.error(`Error checking if index ${indexName} exists:`, error);
    return false; // Assume it doesn't exist if there's an error
  }
};

// Initialize database tables if they don't exist
const initializeTables = async () => {
  try {
    // Check if required tables exist
    const [tables] = await pool.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND table_name IN ('payments', 'plans', 'subscriptions', 'orders')
    `, [process.env.DB_NAME]);
    
    const existingTables = new Set(tables.map(t => t.table_name));
    
    console.log('Checking database tables...');
    
    // If we have all our required tables, we don't need to do anything
    if (existingTables.has('payments') && existingTables.has('plans') && 
        existingTables.has('subscriptions') && existingTables.has('orders')) {
      console.log('Database tables already exist');
      return;
    }
    
    console.log('Some database tables are missing. Checking each table...');
    
    // Check and create tables as needed - this ensures we preserve existing tables and data
    if (!existingTables.has('plans')) {
      console.log('Creating plans table...');
      // Create plans table first (because it's referenced by subscriptions)
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS plans (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          plan_id VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          amount INT NOT NULL,
          billing_interval INT NOT NULL,
          period VARCHAR(50) NOT NULL,
          gateway VARCHAR(100) NOT NULL,
          metadata JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE (plan_id, gateway)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
    
    if (!existingTables.has('subscriptions')) {
      console.log('Creating subscriptions table...');
      // Create subscriptions table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          plan_id BIGINT UNSIGNED NOT NULL,
          subscription_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          gateway VARCHAR(100) NOT NULL,
          start_date TIMESTAMP NOT NULL,
          next_billing_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (plan_id) REFERENCES plans(id),
          UNIQUE (subscription_id, gateway)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
    
    if (!existingTables.has('orders')) {
      console.log('Creating orders table...');
      // Create orders table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS orders (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          order_id VARCHAR(255) NOT NULL UNIQUE,
          user_id VARCHAR(255) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(3) NOT NULL DEFAULT 'INR',
          status VARCHAR(50) NOT NULL,
          gateway VARCHAR(100) NOT NULL,
          metadata JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_orders_user_id (user_id),
          INDEX idx_orders_order_id (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    if (!existingTables.has('payments')) {
      console.log('Creating payments table...');
      // Create payments table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          order_id VARCHAR(255),
          order_reference_id BIGINT UNSIGNED NULL,
          subscription_id VARCHAR(255),
          amount INT NOT NULL,
          status VARCHAR(50) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          gateway VARCHAR(100) NOT NULL,
          type VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NULL,
          error_message TEXT,
          retry_count INT DEFAULT 0,
          last_retry_at TIMESTAMP NULL,
          refund_status VARCHAR(50) DEFAULT 'none',
          transaction_id VARCHAR(36) NOT NULL UNIQUE,
          metadata JSON,
          FOREIGN KEY (order_reference_id) REFERENCES orders(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
    
    // Create missing indexes if needed
    console.log('Checking and creating necessary indexes...');
    
    // Add indexes to payments table if it exists
    if (existingTables.has('payments')) {
      if (!(await indexExists('payments', 'idx_payments_user_id'))) {
        console.log('Creating idx_payments_user_id index...');
        await pool.execute(`CREATE INDEX idx_payments_user_id ON payments(user_id)`);
      }
      
      if (!(await indexExists('payments', 'idx_payments_order_id'))) {
        console.log('Creating idx_payments_order_id index...');
        await pool.execute(`CREATE INDEX idx_payments_order_id ON payments(order_id)`);
      }
      
      if (!(await indexExists('payments', 'idx_payments_transaction_id'))) {
        console.log('Creating idx_payments_transaction_id index...');
        await pool.execute(`CREATE INDEX idx_payments_transaction_id ON payments(transaction_id)`);
      }
    }
    
    // Add indexes to subscriptions table if it exists
    if (existingTables.has('subscriptions')) {
      if (!(await indexExists('subscriptions', 'idx_subscriptions_user_id'))) {
        console.log('Creating idx_subscriptions_user_id index...');
        await pool.execute(`CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id)`);
      }
      
      if (!(await indexExists('subscriptions', 'idx_subscriptions_subscription_id'))) {
        console.log('Creating idx_subscriptions_subscription_id index...');
        await pool.execute(`CREATE INDEX idx_subscriptions_subscription_id ON subscriptions(subscription_id)`);
      }
    }
    
    console.log('Database tables and indexes initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  testConnection
}; 