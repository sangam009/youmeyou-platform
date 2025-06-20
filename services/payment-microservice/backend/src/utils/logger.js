/**
 * Logger Utility
 * Provides consistent logging across the application
 */

/**
 * Log an informational message
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include
 */
function info(message, data) {
  log('INFO', message, data);
}

/**
 * Log a warning message
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include
 */
function warn(message, data) {
  log('WARN', message, data);
}

/**
 * Log an error message
 * @param {string} message - The message to log
 * @param {Error|Object} error - Error object or data to include
 */
function error(message, error) {
  if (error instanceof Error) {
    log('ERROR', message, {
      error: error.message,
      stack: error.stack
    });
  } else {
    log('ERROR', message, error);
  }
}

/**
 * Log a debug message (only in development)
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include
 */
function debug(message, data) {
  if (process.env.NODE_ENV !== 'production') {
    log('DEBUG', message, data);
  }
}

/**
 * Internal log function
 * @param {string} level - Log level
 * @param {string} message - Message to log
 * @param {Object} data - Optional data to include
 */
function log(level, message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message
  };

  if (data) {
    logEntry.data = data;
  }

  // In production, we might want to use a proper logging service
  if (process.env.NODE_ENV === 'production') {
    // Here we could send logs to a service like Winston, Bunyan, etc.
    console.log(JSON.stringify(logEntry));
  } else {
    // In development, we want more readable logs
    if (level === 'ERROR') {
      console.error(`[${timestamp}] [${level}] ${message}`, data || '');
    } else if (level === 'WARN') {
      console.warn(`[${timestamp}] [${level}] ${message}`, data || '');
    } else {
      console.log(`[${timestamp}] [${level}] ${message}`, data || '');
    }
  }
}

module.exports = {
  info,
  warn,
  error,
  debug
}; 