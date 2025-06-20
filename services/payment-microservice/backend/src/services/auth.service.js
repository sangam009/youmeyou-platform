const axios = require('axios');

// Simple in-memory cache for session validation results
// In production, you might use Redis for this
const sessionCache = new Map();

/**
 * Create a mock test user for development mode
 * @returns {Object} Mock session data
 */
const createTestUser = () => {
  return {
    uuid: 'test-user-uuid',
    role: {
      name: 'user',
      permissions: {
        payments: { read: true, write: true },
        orders: { read: true, write: true }
      }
    },
    user_profile: {
      display_name: 'Test User',
      email: 'test@example.com',
      photo_url: 'https://via.placeholder.com/150',
      phone_number: '9876543210'
    },
    session_created: new Date().toISOString(),
    session_expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };
};

/**
 * Validates a session with the Auth Microservice
 * @param {string} sessionId - The session ID to validate
 * @returns {Promise<Object>} - Session data if valid
 */
const validateSession = async (sessionId) => {
  // For development testing - allow a specific test session ID to bypass authentication
  if (process.env.NODE_ENV !== 'production' && sessionId === 'test-session-id') {
    console.log('Using test session ID - bypassing authentication');
    return createTestUser();
  }
  
  // Check cache first
  const cachedSession = sessionCache.get(sessionId);
  const now = Date.now();
  
  // If we have a cached result that's not expired, return it
  if (
    cachedSession && 
    cachedSession.expires > now
  ) {
    return cachedSession.data;
  }
  
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    const endpoint = process.env.SESSION_VALIDATION_ENDPOINT || '/session/validate';
    const url = `${authServiceUrl}${endpoint}`;
    
    console.log(`Validating session with auth service at: ${url}`);
    
    // Call auth service's session validation endpoint with timeout
    const response = await axios.post(
      url,
      { sessionId },
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000 // 5 second timeout
      }
    );
    
    // If successful, cache the result
    if (response.data.status === 'success') {
      // Cache for the configured duration (default 5 minutes)
      const cacheDuration = parseInt(process.env.CACHE_DURATION || 300) * 1000;
      
      sessionCache.set(sessionId, {
        data: response.data.session,
        expires: now + cacheDuration
      });
      
      console.log(`Session validated successfully for user: ${response.data.session.uuid}`);
      return response.data.session;
    }
    
    console.warn('Session validation returned unsuccessful status:', response.data);
    throw new Error('Session validation failed');
  } catch (error) {
    // Handle specific error types
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.warn(`Auth service connection failed (${error.code}). ${process.env.NODE_ENV !== 'production' ? 'Using test user.' : 'Authentication failed.'}`);
      
      // In development mode, provide a test user
      if (process.env.NODE_ENV !== 'production') {
        return createTestUser();
      }
    }
    
    console.error('Auth service validation error:', error.message);
    throw new Error('Failed to validate session');
  }
};

/**
 * Checks if the auth service is accessible
 * @returns {Promise<boolean>} - Whether the auth service is accessible
 */
const isAuthServiceAccessible = async () => {
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    await axios.get(`${authServiceUrl}/health`, { timeout: 2000 });
    return true;
  } catch (error) {
    console.warn(`Auth service health check failed: ${error.message}`);
    return false;
  }
};

/**
 * Clears the session cache for a specific session ID
 * @param {string} sessionId - The session ID to invalidate in cache
 */
const invalidateSessionCache = (sessionId) => {
  sessionCache.delete(sessionId);
};

/**
 * Clears the entire session cache
 */
const clearSessionCache = () => {
  sessionCache.clear();
};

module.exports = {
  validateSession,
  invalidateSessionCache,
  clearSessionCache,
  isAuthServiceAccessible
}; 