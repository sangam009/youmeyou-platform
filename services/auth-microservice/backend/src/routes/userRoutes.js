const express = require('express');
const router = express.Router();

// Import controllers
const { 
  createUserHandler,
  getUserHandler,
  updateUserHandler
} = require('../controllers/userController');

// Import middleware
const { 
  validateSession,
  verifyFirebaseToken,
  checkUserExists
} = require('../middleware/authMiddleware');

/**
 * POST /user/create
 * Creates a new user after Firebase authentication
 * Request body: {
 *   provider: 'google'|'phone',
 *   payload: {
 *     token: 'firebase_id_token',
 *     refresh_token: 'firebase_refresh_token',
 *     user: {...} // Firebase user data
 *   }
 * }
 */
router.post('/create', verifyFirebaseToken, checkUserExists, createUserHandler);

/**
 * PATCH /user/update
 * Updates user profile information
 * Request body: {
 *   uuid: 'user_uuid',
 *   payload: {...} // Fields to update
 * }
 * Requires valid session
 */
router.patch('/update', validateSession, updateUserHandler);

/**
 * GET /user/:uuid
 * Returns user details for profile screen
 * Requires valid session
 */
router.get('/:uuid', validateSession, getUserHandler);

module.exports = router; 