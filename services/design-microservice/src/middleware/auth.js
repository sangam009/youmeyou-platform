const axios = require('axios');
const logger = require('../utils/logger');

async function requireAuth(req, res, next) {
  try {
    // Get session ID from cookies or Authorization header
    const sessionId = req.cookies?.sessionId || 
                     (req.headers.authorization?.startsWith('Bearer ') ? 
                      req.headers.authorization.slice(7) : null);
    
    if (!sessionId) {
      logger.warn('[AuthMiddleware] No session ID provided');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No session ID provided'
      });
    }

    // Validate session with auth service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    const response = await axios.post(
      `${authServiceUrl}/session/validate`,
      { sessionId },
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status !== 'success') {
      logger.warn('[AuthMiddleware] Session validation failed:', response.data);
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid session'
      });
    }

    // Extract user data from validated session
    const sessionData = response.data.session;
    req.user = {
      userId: sessionData.uuid,
      email: sessionData.user_profile?.email,
      name: sessionData.user_profile?.displayName,
      role: sessionData.role?.name || 'user',
      permissions: sessionData.role?.permissions || {}
    };

    logger.info(`[AuthMiddleware] User authenticated: ${req.user.userId}`);
    next();
    
  } catch (err) {
    logger.error('[AuthMiddleware] Session validation failed:', {
      error: err.message,
      response: err?.response?.data,
      status: err?.response?.status,
      url: req.path
    });
    
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
}

module.exports = requireAuth; 