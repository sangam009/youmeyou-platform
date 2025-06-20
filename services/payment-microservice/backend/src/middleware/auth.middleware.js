const authService = require('../services/auth.service');
const logger = require('../utils/logger');

// Log that auth middleware has been loaded - direct approach instead of using init
logger.info('Auth middleware loaded and ready to use');

/**
 * Creates a dummy admin user for development testing
 * @returns {Object} Dummy admin user data
 */
const createDummyAdminUser = () => {
  return {
    uuid: 'dummy-admin-uuid',
    role: {
      name: 'admin',
      permissions: {
        payments: { read: true, write: true },
        orders: { read: true, write: true },
        subscriptions: { read: true, write: true },
        users: { read: true, write: true },
        plans: { read: true, write: true }
      }
    },
    displayName: 'Dummy Admin',
    email: 'admin@example.com',
    permissions: {
      payments: { read: true, write: true },
      orders: { read: true, write: true },
      subscriptions: { read: true, write: true },
      users: { read: true, write: true },
      plans: { read: true, write: true }
    }
  };
};

/**
 * Extracts the session ID from the request
 * @param {Object} req - Express request object
 * @returns {string|null} - Session ID or null if not found
 */
const extractSessionId = (req) => {
  // Check if the session ID is in the cookies
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';')
      .map(cookie => cookie.trim())
      .reduce((acc, cookie) => {
        const [key, value] = cookie.split('=');
        acc[key] = value;
        return acc;
      }, {});
    
    return cookies['connect.sid'];
  }
  
  // Check if it's in the request headers
  if (req.headers['session-id']) {
    return req.headers['session-id'];
  }
  
  // If sending in the body as a last resort
  if (req.body && req.body.sessionId) {
    return req.body.sessionId;
  }
  
  return null;
};

/**
 * Validates the user session and attaches the user to the request
 */
const authenticate = async (req, res, next) => {
  try {
    const sessionId = extractSessionId(req);
    
    // In development mode, if no session ID is provided, use dummy admin user
    if (!sessionId && process.env.NODE_ENV === 'development') {
      logger.info('No session ID provided in development mode - using dummy admin user');
      req.user = createDummyAdminUser();
      return next();
    }
    
    if (!sessionId) {
      return res.status(401).json({
        status: 'error',
        message: 'No session ID provided'
      });
    }
    
    // Validate the session with the auth service
    const sessionData = await authService.validateSession(sessionId);
    
    // Attach user data to the request for use in route handlers
    req.user = {
      uuid: sessionData.uuid,
      role: sessionData.role,
      displayName: sessionData.user_profile?.display_name,
      email: sessionData.user_profile?.email,
      permissions: sessionData.role?.permissions || {}
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    // In development mode, if auth fails, use dummy admin user
    if (process.env.NODE_ENV === 'development') {
      logger.info('Authentication failed in development mode - using dummy admin user');
      req.user = createDummyAdminUser();
      return next();
    }
    
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Bypass authentication for specific endpoints (like webhooks)
 * This middleware passes through without requiring authentication,
 * but also doesn't provide user data to the request.
 */
const bypassAuth = (req, res, next) => {
  // Add a flag to indicate this request bypassed auth
  req.isWebhook = true;
  
  // Log webhook requests for debugging
  console.log(`Received webhook request from ${req.ip}`, {
    path: req.path,
    method: req.method,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });
  
  next();
};

/**
 * Middleware factory function that creates role-based middleware
 * @param {string} requiredRole - The role required to access the route
 * @returns {Function} - Express middleware function
 */
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      // First authenticate the user
      await authenticate(req, res, (err) => {
        if (err) return next(err);
        
        // Check if the user has the required role
        if (
          !req.user || 
          !req.user.role || 
          (req.user.role.name !== requiredRole && req.user.role.name !== 'admin')
        ) {
          return res.status(403).json({
            status: 'error',
            message: `This action requires ${requiredRole} privileges`
          });
        }
        
        // User has the required role, allow access
        next();
      });
    } catch (error) {
      console.error('Role check error:', error.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error checking user role'
      });
    }
  };
};

/**
 * Middleware to check specific permissions
 * @param {string} resource - The resource being accessed
 * @param {string} action - The action being performed (read/write)
 */
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      // First authenticate the user
      await authenticate(req, res, (err) => {
        if (err) return next(err);
        
        // Admin always has all permissions
        if (req.user.role.name === 'admin') {
          return next();
        }
        
        // Check if the user has the required permission
        const permissions = req.user.permissions;
        if (
          !permissions || 
          !permissions[resource] || 
          !permissions[resource][action]
        ) {
          return res.status(403).json({
            status: 'error',
            message: `You don't have permission to ${action} ${resource}`
          });
        }
        
        // User has the required permission, allow access
        next();
      });
    } catch (error) {
      console.error('Permission check error:', error.message);
      return res.status(500).json({
        status: 'error',
        message: 'Error checking user permissions'
      });
    }
  };
};

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  bypassAuth
}; 