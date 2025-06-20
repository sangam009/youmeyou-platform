/**
 * Error Middleware
 * Provides consistent error handling across the application
 */
const logger = require('../utils/logger');

/**
 * Error handling middleware
 * Catches errors thrown in routes and returns appropriate response
 */
function errorMiddleware(err, req, res, next) {
  // Log error
  logger.error(`API Error: ${err.message}`, err);
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Create error response
  const errorResponse = {
    status: 'error',
    message: err.message || 'Internal Server Error'
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}

module.exports = errorMiddleware; 