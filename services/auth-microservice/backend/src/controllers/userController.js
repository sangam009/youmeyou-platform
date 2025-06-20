const { 
  createUser, 
  getUserByUuid, 
  getUserByFirebaseUid, 
  updateUser 
} = require('../models/userModel');

/**
 * Create a new user after Firebase authentication
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createUserHandler = async (req, res) => {
  try {
    const { provider, payload } = req.body;
    
    if (!provider || !payload) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // If user already exists in our database, treat this as a login
    if (req.userExists) {
      return loginExistingUser(req, res);
    }

    // Create new user in database
    const user = await createUser(req.firebaseUser, provider);

    // Set session data
    setUserSession(req, user);

    return res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      user: user.uuid
    });
  } catch (error) {
    console.error('Error in createUser handler:', error);
    return res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Failed to create user' 
        : error.message
    });
  }
};

/**
 * Handle login for existing users
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const loginExistingUser = async (req, res) => {
  try {
    // Get user from database
    const [user, error] = await getUserByFirebaseUid(req.firebaseUser.uid);
    
    if (error || !user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Set session data
    setUserSession(req, user);

    return res.status(200).json({
      status: 'success',
      message: 'User logged in successfully',
      user: user.uuid
    });
  } catch (error) {
    console.error('Error in loginExistingUser:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Login failed'
    });
  }
};

/**
 * Set user session data
 * @param {Object} req - Request object
 * @param {Object} user - User object
 */
const setUserSession = (req, user) => {
  // Calculate TTL (24 hours from now)
  const ttl = Date.now() + 24 * 60 * 60 * 1000;
  
  // Create user profile object for the session
  const userProfile = {
    uuid: user.uuid,
    displayName: user.display_name,
    email: user.email,
    photoUrl: user.photo_url,
    provider: user.provider
  };

  // Set session data
  req.session.user = {
    uuid: user.uuid,
    user_profile: userProfile,
    role: user.roles && user.roles.length > 0 ? user.roles[0] : { name: 'user', permissions: {} },
    ttl
  };
};

/**
 * Get user by UUID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getUserHandler = async (req, res) => {
  try {
    const { uuid } = req.params;
    
    if (!uuid) {
      return res.status(400).json({
        status: 'error',
        message: 'UUID is required'
      });
    }

    // Verify that the requested UUID matches the session user
    // This prevents users from accessing other users' data
    if (req.session.user.uuid !== uuid) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized access to user data'
      });
    }

    const [user, error] = await getUserByUuid(uuid);
    
    if (error || !user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Remove sensitive data before sending response
    const { firebase_uid, ...safeUserData } = user;

    return res.status(200).json({
      status: 'success',
      user: safeUserData
    });
  } catch (error) {
    console.error('Error in getUser handler:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get user details'
    });
  }
};

/**
 * Update user profile
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateUserHandler = async (req, res) => {
  try {
    const { uuid, payload } = req.body;
    
    if (!uuid || !payload) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Verify that the requested UUID matches the session user
    if (req.session.user.uuid !== uuid) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to update this user'
      });
    }

    const [updatedUser, error] = await updateUser(uuid, payload);
    
    if (error || !updatedUser) {
      return res.status(400).json({
        status: 'error',
        message: error ? error.message : 'Failed to update user'
      });
    }

    // Update session with new user data
    setUserSession(req, updatedUser);

    return res.status(200).json({
      status: 'success',
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error in updateUser handler:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update user'
    });
  }
};

module.exports = {
  createUserHandler,
  getUserHandler,
  updateUserHandler
}; 