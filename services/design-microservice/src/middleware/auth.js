import axios from 'axios';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';

const requireAuth = async (req, res, next) => {
  try {
    logger.info('🔒 Auth middleware started', {
      path: req.path,
      method: req.method,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        cookie: req.headers.cookie ? 'Present' : 'Missing'
      }
    });

    // Get token from cookies or Authorization header
    let token = null;
    
    // First try to get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      logger.info('🔑 Token found in Authorization header');
    }
    
    // If no token in Authorization header, try cookies
    if (!token && req.cookies) {
      token = req.cookies.token;
      if (token) {
        logger.info('🔑 Token found in cookies');
      }
    }
    
    if (!token) {
      logger.error('❌ No authentication token found in request', {
        headers: req.headers,
        cookies: req.cookies
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token with auth service
    const authServiceUrl = config.authService?.url || process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    logger.info('🔍 Verifying token with auth service', { authServiceUrl });
    
    try {
      // Forward all cookies and authorization header to auth service
      const headers = {
        Authorization: `Bearer ${token}`,
        Cookie: req.headers.cookie || '',
        'X-Forwarded-For': req.ip
      };
      
      logger.info('📤 Sending request to auth service', {
        url: `${authServiceUrl}/session/check`,
        headers
      });

      const response = await axios.get(`${authServiceUrl}/session/check`, {
        headers,
        withCredentials: true
      });

      logger.info('📥 Received response from auth service', {
        status: response.status,
        hasUser: !!response.data.user,
        responseHeaders: response.headers
      });

      if (response.data.status === 'success' && response.data.user) {
        // Forward any Set-Cookie headers from auth service
        if (response.headers['set-cookie']) {
          res.setHeader('Set-Cookie', response.headers['set-cookie']);
          logger.info('🍪 Forwarding Set-Cookie headers from auth service');
        }
        
        req.user = response.data.user;
        logger.info('✅ Authentication successful', {
          userId: response.data.user.userId
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
        stack: authError.stack
      });
      res.status(401).json({ error: 'Authentication failed' });
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