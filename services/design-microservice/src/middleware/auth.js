import axios from 'axios';
import logger from '../utils/logger.js';

const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token with auth service
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export default requireAuth; 