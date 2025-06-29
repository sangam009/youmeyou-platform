import axios from 'axios';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';

const requireAuth = async (req, res, next) => {
  try {
    logger.info('🔒 Auth middleware started', {
      path: req.path,
      method: req.method,
      headers: {
        cookie: req.headers.cookie ? 'Present' : 'Missing',
        'user-agent': req.headers['user-agent']
      }
    });

    // Check if we have cookies (the auth service uses cookie-based sessions)
    if (!req.headers.cookie) {
      logger.error('❌ No cookies found in request');
      return res.status(401).json({ error: 'Authentication required - no session cookie' });
    }

    // Extract session ID from cookies
    let sessionId = null;
    const cookies = req.headers.cookie.split(';')
      .map(cookie => cookie.trim())
      .reduce((acc, cookie) => {
        const [key, value] = cookie.split('=');
        acc[key] = decodeURIComponent(value);
        return acc;
      }, {});

    // Look for connect.sid cookie (used by express-session)
    sessionId = cookies['connect.sid'];
    
    if (!sessionId) {
      logger.error('❌ No session cookie (connect.sid) found in request', {
        availableCookies: Object.keys(cookies)
      });
      return res.status(401).json({ error: 'Authentication required - no session ID' });
    }

    logger.info('🔑 Session ID found in cookies', {
      sessionIdPrefix: sessionId.substring(0, 10) + '...'
    });

    // Verify session with auth service using cookie-based approach
    const authServiceUrl = config.authService?.url || process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    logger.info('🔍 Verifying session with auth service', { authServiceUrl });
    
    try {
      // Use the /session/check endpoint which expects cookies
      const response = await axios.get(`${authServiceUrl}/session/check`, {
        headers: {
          Cookie: req.headers.cookie,
          'User-Agent': req.headers['user-agent'] || 'DesignService/1.0',
          'X-Forwarded-For': req.ip,
          'X-Forwarded-Proto': req.protocol
        },
        withCredentials: true
      });

      logger.info('📥 Received response from auth service', {
        status: response.status,
        hasUser: !!response.data.user,
        responseStatus: response.data.status
      });

      if (response.data.status === 'success' && response.data.user) {
        // Forward any Set-Cookie headers from auth service
        if (response.headers['set-cookie']) {
          res.setHeader('Set-Cookie', response.headers['set-cookie']);
          logger.info('🍪 Forwarding Set-Cookie headers from auth service');
        }
        
        // Map the auth service response to our expected format
        req.user = {
          userId: response.data.user.uuid,
          uuid: response.data.user.uuid,
          role: response.data.user.role,
          ...response.data.user
        };
        
        logger.info('✅ Authentication successful', {
          userId: req.user.userId,
          role: req.user.role
        });
        next();
      } else {
        logger.error('❌ Invalid session response', {
          response: response.data
        });
        res.status(401).json({ error: 'Invalid session' });
      }
    } catch (authError) {
      logger.error('❌ Auth service error', {
        error: authError.message,
        response: authError.response?.data,
        status: authError.response?.status,
        url: authError.config?.url
      });
      
      // Handle specific error cases
      if (authError.response?.status === 401) {
        res.status(401).json({ error: 'Session expired or invalid' });
      } else {
        res.status(401).json({ error: 'Authentication service unavailable' });
      }
    }
  } catch (error) {
    logger.error('❌ Auth middleware error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal authentication error' });
  }
};

export default requireAuth; 