const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const logger = require('./utils/logger');
const cookieParser = require('cookie-parser');
const requireAuth = require('./middleware/auth');
const workspacesRoutes = require('./routes/workspaces');
const projectsRoutes = require('./routes/projects');
const templatesRoutes = require('./routes/templates');
const canvasRoutes = require('./routes/canvas');
const agentRoutes = require('./routes/agents');
const projectsController = require('./controllers/projectsController');

// Load environment variables from .txt files
function loadEnvFromFile() {
  const env = process.env.NODE_ENV || 'development';
  const envFilePath = path.join(__dirname, '..', `env.${env}.txt`);
  
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

app.use('/projects', projectsRoutes);
app.use('/templates', templatesRoutes);
app.use('/canvas', canvasRoutes);
app.use('/agents', agentRoutes);

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
