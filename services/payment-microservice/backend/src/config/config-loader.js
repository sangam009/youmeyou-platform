const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Loads configuration from a text file and returns it as an object
 * @param {string} filename - Name of the config file to load
 * @returns {Object} Configuration key-value pairs
 */
const loadConfigFromFile = (filename) => {
  try {
    // Look for the env file in the paymentmicroservice root directory
    const configPath = path.join(__dirname, '..', '..', '..', filename);
    logger.info(`Attempting to load config from: ${configPath}`);
    
    if (!fs.existsSync(configPath)) {
      logger.warn(`Config file not found at: ${configPath}`);
      return {};
    }
    
    const fileContent = fs.readFileSync(configPath, 'utf8');
    
    // Parse the file content line by line
    const config = {};
    fileContent.split('\n').forEach(line => {
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return;
      
      // Split on first = only, to handle values that might contain =
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      
      if (key && value) {
        // Remove quotes if present
        const cleanValue = value.trim().replace(/^["']|["']$/g, '');
        config[key.trim()] = cleanValue;
      }
    });
    
    logger.info(`Successfully loaded configuration from ${filename}`);
    return config;
  } catch (error) {
    logger.error(`Failed to load configuration from ${filename}: ${error.message}`);
    return {};
  }
};

/**
 * Gets a configuration value from the appropriate source
 * @param {string} key - Configuration key to get
 * @param {*} defaultValue - Default value if key is not found
 * @returns {*} Configuration value
 */
const getConfig = (key, defaultValue = '') => {
  // In development mode, try to get from env.development.txt first
  if (process.env.NODE_ENV === 'development') {
    const devConfig = loadConfigFromFile('env.development.txt');
    if (devConfig[key] !== undefined) {
      logger.debug(`Found ${key} in env.development.txt: ${devConfig[key]}`);
      return devConfig[key];
    }
  }
  
  // In production mode, try to get from env.production.txt
  if (process.env.NODE_ENV === 'production') {
    const prodConfig = loadConfigFromFile('env.production.txt');
    if (prodConfig[key] !== undefined) {
      logger.debug(`Found ${key} in env.production.txt: ${prodConfig[key]}`);
      return prodConfig[key];
    }
  }
  
  // Fallback to process.env or default value
  const value = process.env[key] || defaultValue;
  logger.debug(`Using ${key} from process.env or default: ${value}`);
  return value;
};

/**
 * Gets a numeric configuration value
 * @param {string} key - Configuration key to get
 * @param {number} defaultValue - Default value if key is not found
 * @returns {number} Configuration value as number
 */
const getNumericConfig = (key, defaultValue = 0) => {
  const value = getConfig(key, defaultValue);
  return Number(value);
};

/**
 * Gets a boolean configuration value
 * @param {string} key - Configuration key to get
 * @param {boolean} defaultValue - Default value if key is not found
 * @returns {boolean} Configuration value as boolean
 */
const getBooleanConfig = (key, defaultValue = false) => {
  const value = getConfig(key, defaultValue);
  return value === 'true' || value === true;
};

/**
 * Gets an array configuration value
 * @param {string} key - Configuration key to get
 * @param {Array} defaultValue - Default value if key is not found
 * @returns {Array} Configuration value as array
 */
const getArrayConfig = (key, defaultValue = []) => {
  const value = getConfig(key);
  return value ? value.split(',').map(item => item.trim()) : defaultValue;
};

module.exports = {
  getConfig,
  getNumericConfig,
  getBooleanConfig,
  getArrayConfig
}; 