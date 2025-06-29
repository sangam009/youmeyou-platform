import axios from 'axios';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';

const requireAuth = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token with auth service
    const authServiceUrl = config.authService?.url || process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    
    try {
      const response = await axios.get(`${authServiceUrl}/session/check`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Cookie: req.headers.cookie || ''
        },
        withCredentials: true
      });

      if (response.data.status === 'success' && response.data.user) {
        req.user = response.data.user;
        next();
      } else {
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