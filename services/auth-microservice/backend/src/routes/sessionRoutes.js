const express = require('express');
const router = express.Router();

// Import middleware
const { validateSession } = require('../middleware/authMiddleware');

/**
 * POST /session/validate
 * Validates a session token
 * This endpoint is meant to be called by other microservices to validate a user's session
 * Request body: { sessionId: 'session_id' }
 */
router.post('/validate', async (req, res) => {
  try {
    const { sessionId, token } = req.body;
    
    if (!sessionId && !token) {
      return res.status(400).json({
        status: 'error',
        message: 'Session ID or token is required'
      });
    }

    // If a token is provided, validate using the token
    if (token) {
      // Get the session cookie from the token
      const sessionCookie = req.sessionStore.get(token, (err, session) => {
        if (err || !session) {
          return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired session token'
          });
        }

        // Check if session is expired
        const currentTime = Date.now();
        if (session.user?.ttl && session.user.ttl < currentTime) {
          return res.status(401).json({
            status: 'error',
            message: 'Session expired'
          });
        }

        // Return user session data
        return res.status(200).json({
          status: 'success',
          session: {
            uuid: session.user.uuid,
            user_profile: session.user.user_profile,
            role: session.user.role
          }
        });
      });
    } 
    // If a sessionId is provided, validate using the sessionId
    else {
      req.sessionStore.get(sessionId, (err, session) => {
        if (err || !session) {
          return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired session'
          });
        }

        // Check if session is expired
        const currentTime = Date.now();
        if (session.user?.ttl && session.user.ttl < currentTime) {
          return res.status(401).json({
            status: 'error',
            message: 'Session expired'
          });
        }

        // Return user session data
        return res.status(200).json({
          status: 'success',
          session: {
            uuid: session.user.uuid,
            user_profile: session.user.user_profile,
            role: session.user.role
          }
        });
      });
    }
  } catch (error) {
    console.error('Error in session validation:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during session validation'
    });
  }
});

/**
 * GET /session/check
 * Simple session check for the current user
 * Requires a valid session cookie
 */
router.get('/check', validateSession, (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Session is valid',
    user: {
      uuid: req.session.user.uuid,
      role: req.session.user.role.name
    }
  });
});

/**
 * POST /session/logout
 * Destroys the current user session
 * Requires a valid session cookie
 */
router.post('/logout', (req, res) => {
  try {
    // Check if session exists
    if (!req.session) {
      return res.status(200).json({
        status: 'success',
        message: 'No active session to logout'
      });
    }

    // Destroy the session in Redis
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({
          status: 'error',
          message: 'Error during logout process'
        });
      }

      // Clear the session cookie
      res.clearCookie('connect.sid');

      return res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });
    });
  } catch (error) {
    console.error('Error in logout:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during logout'
    });
  }
});

module.exports = router; 