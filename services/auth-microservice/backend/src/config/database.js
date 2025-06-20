const mysql = require('mysql2/promise');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env' 
    : '.env.development'
});

let pool = null;

const connect = async () => {
  try {
    // We can use the DATABASE_URL if available, otherwise use individual parameters
    if (process.env.DATABASE_URL) {
      console.log('Connecting to database using DATABASE_URL');
      pool = mysql.createPool(process.env.DATABASE_URL);
    } else {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
        queueLimit: 0
      });
    }

    // Test the connection
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database');
    connection.release();

    // Create users table if it doesn't exist
    await initializeDatabase();
    
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connect() first.');
  }
  return pool;
};

const initializeDatabase = async () => {
  try {
    const createUserTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        firebase_uid VARCHAR(128) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        display_name VARCHAR(255),
        photo_url TEXT,
        provider VARCHAR(50) NOT NULL,
        phone_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    const createUserRolesTable = `
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_uuid VARCHAR(36) NOT NULL,
        role_name VARCHAR(50) NOT NULL,
        permissions JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
      )
    `;

    await pool.query(createUserTable);
    await pool.query(createUserRolesTable);
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    throw error;
  }
};

module.exports = {
  connect,
  getPool
}; 