const admin = require('firebase-admin');
const logger = require('./logger');

// Initialize Firebase Admin
try {
  // Skip Firebase initialization in test/development mode
  if (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV === 'development' && !process.env.FIREBASE_PRIVATE_KEY)) {
    logger.warn('Skipping Firebase initialization in test/development mode');
    module.exports = {
      auth: () => ({
        verifyIdToken: async () => ({ uid: 'test-user-id' }),
        getUser: async () => ({ uid: 'test-user-id', email: 'test@example.com' })
      })
    };
    return;
  }

  // Check if all required Firebase config variables are present
  const requiredEnvVars = [
    'FIREBASE_TYPE',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
    'FIREBASE_AUTH_URI',
    'FIREBASE_TOKEN_URI',
    'FIREBASE_AUTH_PROVIDER_X509_CERT_URL',
    'FIREBASE_CLIENT_X509_CERT_URL',
    'FIREBASE_UNIVERSE_DOMAIN'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
  }

  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
  };
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  
  logger.info('Firebase Admin initialized successfully');
} catch (error) {
  logger.error('Error initializing Firebase Admin', {
    error: error.message,
    stack: error.stack
  });
  
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    logger.warn('Continuing in test/development mode with mock Firebase');
    module.exports = {
      auth: () => ({
        verifyIdToken: async () => ({ uid: 'test-user-id' }),
        getUser: async () => ({ uid: 'test-user-id', email: 'test@example.com' })
      })
    };
    return;
  }
  
  throw error;
}

module.exports = admin; 