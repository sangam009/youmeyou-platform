const { verifyIdToken } = require('../config/firebase');
const { getPool } = require('../config/database');
const logger = require('../utils/logger')

/**
 * Middleware to validate user session
 * This will check if the user has a valid session cookie
 * If the session is invalid or expired, it will return 401 Unauthorized
 */
const validateSession = async (req, res, next) => {
  logger.info('--- /session/check called ---');
  logger.info('req.headers.cookie:', req.headers.cookie);
  logger.info('req.cookies:', req.cookies);
  logger.info('req.session:', req.session);
  
  
  try {
    // Check if session exists
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - No valid session'
      });
    }

    // Check if session is expired
    const currentTime = Date.now();
    if (req.session.user.ttl && req.session.user.ttl < currentTime) {
      // Clear the session
      req.session.destroy();
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - Session expired'
      });
    }

    // If we reach here, session is valid
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Middleware to verify Firebase token
 * Used during user creation/login process
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const { token } = req.body.payload || {};
    
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'No token provided'
      });
    }
    
    const decodedToken = await verifyIdToken(token);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired Firebase token'
    });
  }
};

/**
 * Middleware to verify if user exists in database
 * Used to differentiate between registration and login
 */
const checkUserExists = async (req, res, next) => {
  try {
    if (!req.firebaseUser || !req.firebaseUser.uid) {
      return res.status(400).json({
        status: 'error',
        message: 'Firebase user not found in request'
      });
    }

    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = ?',
      [req.firebaseUser.uid]
    );

    req.userExists = rows.length > 0;
    if (req.userExists) {
      req.dbUser = rows[0];
    }
    
    next();
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while checking user'
    });
  }
};

module.exports = {
  validateSession,
  verifyFirebaseToken,
  checkUserExists
}; 