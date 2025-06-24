const axios = require('axios');
const logger = require('../utils/logger');

async function requireAuth(req, res, next) {
  try {
    // Get session ID from cookies or Authorization header
    let sessionId = null;
    
    // Check for Authorization header first
    if (req.headers.authorization?.startsWith('Bearer ')) {
      sessionId = req.headers.authorization.slice(7);
    }
    // Check for connect.sid (Express session cookie)
    else if (req.cookies?.['connect.sid']) {
      // Express session cookies are signed, need to parse them
      let rawSessionId = req.cookies['connect.sid'];
      
      // Remove signature if present (starts with 's:')
      if (rawSessionId.startsWith('s:')) {
        // Extract the session ID part before the signature
        const parts = rawSessionId.slice(2).split('.');
        sessionId = parts[0];
      } else {
        sessionId = rawSessionId;
      }
    }
    // Check for plain sessionId cookie
    else if (req.cookies?.sessionId) {
      sessionId = req.cookies.sessionId;
    }
    
    if (!sessionId) {
      logger.warn('[AuthMiddleware] No session ID provided', {
        cookies: Object.keys(req.cookies || {}),
        connectSid: req.cookies?.['connect.sid']?.substring(0, 20) + '...',
        hasAuth: !!req.headers.authorization,
        userAgent: req.headers['user-agent']?.substring(0, 50)
      });
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No session ID provided'
      });
    }

    // Validate session with auth service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    
    logger.info(`[AuthMiddleware] Validating session with auth service`, {
      authServiceUrl,
      sessionIdLength: sessionId.length,
      sessionIdPrefix: sessionId.substring(0, 8) + '...'
    });
    
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