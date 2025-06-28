import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import morgan from 'morgan';
import logger from './utils/logger.js';
import cookieParser from 'cookie-parser';
import requireAuth from './middleware/auth.js';
import workspacesRoutes from './routes/workspaces.js';
import projectRoutes from './routes/projects.js';
import templatesRoutes from './routes/templates.js';
import canvasRoutes from './routes/canvas.js';
import agentRoutes from './routes/agents.js';
import dynamicPromptingRoutes from './routes/dynamicPrompting.js';
import projectsController from './controllers/projectsController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .txt files
function loadEnvFromFile() {
  const env = process.env.NODE_ENV || 'development';
  const envFilePath = join(__dirname, '..', `env.${env}.txt`);
  
  if (fs.existsSync(envFilePath)) {
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Only set if not already defined
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
    
    console.log(`✅ Loaded environment from: ${envFilePath}`);
  } else {
    console.log(`⚠️  Environment file not found: ${envFilePath}`);
  }
}

// Load environment first
loadEnvFromFile();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev', { stream: { write: msg => logger.info(msg.trim()) } }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    googleAI: process.env.GOOGLE_AI_KEY ? 'configured' : 'not configured'
  });
});

// Protect all routes below with requireAuth
app.use(requireAuth);

app.use('/workspaces', workspacesRoutes);

// Workspace-specific project routes
app.get('/workspaces/:id/projects', projectsController.listProjects);
app.post('/workspaces/:id/projects', projectsController.createProject);

app.use('/projects', projectRoutes);
app.use('/templates', templatesRoutes);
app.use('/canvas', canvasRoutes);
app.use('/agents', agentRoutes);
app.use('/dynamic-prompting', dynamicPromptingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`🚀 Design microservice running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔑 Google AI: ${process.env.GOOGLE_AI_KEY ? 'configured' : 'NOT CONFIGURED'}`);
  logger.info(`🌐 CORS origins: ${corsOptions.origin.join(', ')}`);
});
