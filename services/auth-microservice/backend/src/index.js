// Load environment variables based on NODE_ENV
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env' 
    : '.env.development'
});

const express = require('express');
const session = require('express-session');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

// Import routes
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

// Import middleware
const { validateSession } = require('./middleware/authMiddleware');

// Initialize Redis client
let redisClient;
const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: `redis://${process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD + '@' : ''}${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Connected to Redis successfully');
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
};

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    
    // In production, only allow youmeyou.ai domains
    if (isProduction) {
      const isAllowed = origin && (
        origin.endsWith('youmeyou.ai') || 
        allowedOrigins.includes(origin)
      );
      callback(null, isAllowed);
    } else {
      // In development, allow configured origins
      callback(null, origin);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(helmet()); // Security headers
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Redis and session
const initializeSession = async () => {
  await connectRedis();
  
  // Session configuration with Redis
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  const domain = isProduction ? '.youmeyou.ai' : undefined;
  
  app.use(session({
    store: new RedisStore({ 
      client: redisClient,
      prefix: process.env.REDIS_PREFIX || 'auth_'
    }),
    secret: process.env.SESSION_SECRET || 'default_secret_for_dev',
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
      secure: isProduction, // Set to true in production
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax', // Use 'none' for cross-site in production
      domain: domain,
      path: '/',
      maxAge: parseInt(process.env.REDIS_TTL || '86400', 10) * 1000 // convert seconds to milliseconds
    }
  }));

  // Health check route
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Auth service is running' });
  });

  // Apply session validation to all user routes
  app.use('/user', userRoutes);
  
  // Session validation endpoint for other services
  app.use('/session', sessionRoutes);

  // Global error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : err.message
    });
  });

  // Handle 404 routes
  app.use('*', (req, res) => {
    res.status(404).json({ status: 'error', message: 'Route not found' });
  });

  // Initialize database connection
  await require('./config/database').connect();

  // Initialize Firebase
  require('./config/firebase').initialize();

  // Start the server
  app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
};

// Start the application
initializeSession().catch(console.error); 