import axios from 'axios';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';

const requireAuth = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    let token = null;
    
    // First try to get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // If no token in Authorization header, try cookies
    if (!token && req.cookies) {
      token = req.cookies.token;
    }
    
    if (!token) {
      logger.error('No authentication token found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token with auth service
    const authServiceUrl = config.authService?.url || process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    
    try {
      // Forward all cookies and authorization header to auth service
      const response = await axios.get(`${authServiceUrl}/session/check`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Cookie: req.headers.cookie || '',
          'X-Forwarded-For': req.ip
        },
        withCredentials: true
      });

      if (response.data.status === 'success' && response.data.user) {
        // Forward any Set-Cookie headers from auth service
        if (response.headers['set-cookie']) {
          res.setHeader('Set-Cookie', response.headers['set-cookie']);
        }
        
        req.user = response.data.user;
        next();
      } else {
        logger.error('Invalid session response:', response.data);
        res.status(401).json({ error: 'Invalid session' });
      }
    } catch (authError) {
      logger.error('Auth service error:', authError.response?.data || authError.message);
      res.status(401).json({ error: 'Authentication failed' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal authentication error' });
  }
};

export default requireAuth; 