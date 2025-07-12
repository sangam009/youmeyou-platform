import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import logger from './utils/logger.js';

// Import routes (for non-A2A endpoints)
import workspaceRoutes from './routes/workspaces.js';
import projectRoutes from './routes/projects.js';
import canvasRoutes from './routes/canvas.js';
import agentRoutes from './routes/agents.js';
import templateRoutes from './routes/templates.js';
import simpleChatRoutes from './routes/simpleChat.js';

// Import middleware
import authMiddleware from './middleware/auth.js';

const app = express();

// CORS configuration
const corsOptions = {
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Cookie',
    'Set-Cookie',
    'Origin',
    'Accept'
  ],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'design-microservice',
    timestamp: new Date().toISOString(),
    environment: config.environment 
  });
});

// A2A Agent Card - Define our design agents
const DESIGN_AGENT_CARD = {
  name: 'YouMeYou Design Agents',
  description: 'AI-powered system design and architecture agents for building complete applications',
  url: config.a2a.baseUrl,
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true
  },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain', 'application/json'],
  skills: [
    {
      id: 'architecture_design',
      name: 'Architecture Design',
      description: 'Design system architecture, component relationships, and scalability patterns',
      tags: ['architecture', 'system-design', 'scalability'],
      examples: [
        'Design a microservices architecture for e-commerce platform',
        'Create a scalable chat application architecture',
        'Design database schema for social media app'
      ],
      inputModes: ['text/plain'],
      outputModes: ['text/plain', 'application/json']
    },
    {
      id: 'database_design',
      name: 'Database Design',
      description: 'Design database schemas, optimize queries, and plan data models',
      tags: ['database', 'schema', 'optimization'],
      examples: [
        'Design database schema for inventory management',
        'Optimize queries for large datasets',
        'Create migration strategy for database changes'
      ],
      inputModes: ['text/plain'],
      outputModes: ['text/plain', 'application/json']
    },
    {
      id: 'api_design',
      name: 'API Design',
      description: 'Design RESTful APIs, authentication flows, and documentation',
      tags: ['api', 'rest', 'authentication'],
      examples: [
        'Design REST API for user management',
        'Create authentication flow for mobile app',
        'Design GraphQL schema for content management'
      ],
      inputModes: ['text/plain'],
      outputModes: ['text/plain', 'application/json']
    },
    {
      id: 'code_generation',
      name: 'Code Generation',
      description: 'Generate implementation code, tests, and documentation',
      tags: ['code', 'implementation', 'testing'],
      examples: [
        'Generate Node.js API implementation',
        'Create React components for dashboard',
        'Generate test cases for user authentication'
      ],
      inputModes: ['text/plain'],
      outputModes: ['text/plain', 'application/json']
    },
    {
      id: 'project_management',
      name: 'Project Management',
      description: 'Break down projects into tasks, estimate timelines, and track progress',
      tags: ['project', 'planning', 'management'],
      examples: [
        'Break down e-commerce project into milestones',
        'Estimate development timeline for mobile app',
        'Create task dependencies for team project'
      ],
      inputModes: ['text/plain'],
      outputModes: ['text/plain', 'application/json']
    }
  ],
  supportsAuthenticatedExtendedCard: true,
  authenticationRequired: config.environment === 'production'
};

// Serve the A2A Agent Card at the well-known location
app.get('/.well-known/agent.json', (req, res) => {
  logger.info('🎯 Serving A2A Agent Card');
  res.json(DESIGN_AGENT_CARD);
});

// A2A functionality has been moved to simple chat API
logger.info('🚀 Simple Chat API is now the primary interface for AI interactions');

// Traditional REST API routes (for backward compatibility)
app.use('/api/workspaces', authMiddleware, workspaceRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/canvas', authMiddleware, canvasRoutes);
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/templates', authMiddleware, templateRoutes);
app.use('/api/simple-chat', authMiddleware, simpleChatRoutes);

// Routes for nginx proxy (without /api prefix)
app.use('/workspaces', authMiddleware, workspaceRoutes);
app.use('/projects', authMiddleware, projectRoutes);
app.use('/canvas', authMiddleware, canvasRoutes);
app.use('/agents', authMiddleware, agentRoutes);
app.use('/templates', authMiddleware, templateRoutes);
app.use('/simple-chat', authMiddleware, simpleChatRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('❌ Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: config.environment === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start the server
const PORT = config.port || 4000;

// Initialize services before starting the server
async function initializeServices() {
  logger.info('🔧 Initializing services...');
  
  try {
    // Services have been simplified - no external dependencies needed
    logger.info('✅ Services initialized successfully');
    return true;
    
  } catch (error) {
    logger.error('❌ Service initialization failed:', error);
    // Continue startup even if some services fail
    return false;
  }
}

app.listen(PORT, async () => {
  logger.info('🚀 Design microservice startup configuration:');
  logger.info(`├── Environment: ${config.environment}`);
  logger.info(`├── Port: ${PORT}`);
  logger.info(`├── Auth Service: ${config.authService.url}`);
  logger.info(`├── A2A Configuration:`);
  logger.info(`│   ├── Base URL: ${config.a2a.baseUrl}`);
  logger.info(`│   ├── Project ID: ${config.a2a.projectId}`);
  logger.info(`│   └── API Key: ${config.a2a.apiKey ? 'Configured' : 'Missing'}`);
  logger.info(`├── Google AI: ${config.googleAI.apiKey ? 'Configured' : 'Missing'}`);
  logger.info(`├── CORS Origins:`);
  config.cors.origins.forEach(origin => {
    logger.info(`│   └── ${origin}`);
  });
  logger.info(`├── MongoDB: ${config.mongodb.uri}`);
  logger.info(`├── Redis: ${config.redis.host}:${config.redis.port}`);
  logger.info(`├── A2A Agent Card: ${config.a2a.baseUrl}/.well-known/agent.json`);
  logger.info(`└── A2A Endpoints: ${config.a2a.baseUrl}/a2a/*`);
  
  // Initialize services after server starts
  await initializeServices();
});

export default app;
