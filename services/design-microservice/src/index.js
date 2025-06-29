import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import logger from './utils/logger.js';

// Import A2A SDK components for server implementation
import { A2AExpressApp, DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk';

// Import our agent executors
import { DesignAgentExecutor } from './services/agents/DesignAgentExecutor.js';

// Import routes (for non-A2A endpoints)
import workspaceRoutes from './routes/workspaces.js';
import projectRoutes from './routes/projects.js';
import canvasRoutes from './routes/canvas.js';
import agentRoutes from './routes/agents.js';
import templateRoutes from './routes/templates.js';
import dynamicPromptingRoutes from './routes/dynamicPrompting.js';

// Import middleware
import authMiddleware from './middleware/auth.js';

const app = express();

// CORS configuration
const corsOptions = {
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  url: `http://localhost:${config.port}`,
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

// Initialize A2A Server Components
const taskStore = new InMemoryTaskStore();
const designAgentExecutor = new DesignAgentExecutor();

const requestHandler = new DefaultRequestHandler(
  DESIGN_AGENT_CARD,
  taskStore,
  designAgentExecutor
);

// Setup A2A routes using the SDK
const a2aApp = new A2AExpressApp(requestHandler);

// Add optional authentication for A2A routes in production
if (config.environment === 'production') {
  logger.info('🔒 Adding authentication to A2A routes in production');
  a2aApp.setupRoutes(app, '/a2a', authMiddleware);
} else {
  logger.info('🔓 A2A routes running without authentication in development');
  a2aApp.setupRoutes(app, '/a2a');
}

logger.info('🚀 A2A Server routes configured');

// Traditional REST API routes (for backward compatibility)
app.use('/api/workspaces', authMiddleware, workspaceRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/canvas', authMiddleware, canvasRoutes);
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/templates', authMiddleware, templateRoutes);
app.use('/api/dynamic-prompting', authMiddleware, dynamicPromptingRoutes);

// Routes for nginx proxy (without /api prefix)
app.use('/workspaces', authMiddleware, workspaceRoutes);
app.use('/projects', authMiddleware, projectRoutes);
app.use('/canvas', authMiddleware, canvasRoutes);
app.use('/agents', authMiddleware, agentRoutes);
app.use('/templates', authMiddleware, templateRoutes);
app.use('/dynamic-prompting', authMiddleware, dynamicPromptingRoutes);

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
app.listen(PORT, () => {
  logger.info(`🚀 Design microservice running on port ${PORT}`);
  logger.info(`📊 Environment: ${config.environment}`);
  logger.info(`🔑 Google AI: ${config.googleAI.apiKey ? 'configured' : 'not configured'}`);
  logger.info(`🌐 CORS origins: ${config.cors.origins.join(', ')}`);
  logger.info(`🎯 A2A Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
  logger.info(`🔄 A2A Endpoints: http://localhost:${PORT}/a2a/*`);
});

export default app;
