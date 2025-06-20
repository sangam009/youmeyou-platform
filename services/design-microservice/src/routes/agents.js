const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Enhanced A2A endpoints
router.post('/task', agentController.routeTask);
router.post('/chat', agentController.chat);
router.post('/generate-code', agentController.generateCode);
router.post('/analyze', agentController.analyze);
router.get('/status', agentController.getAgents);

// Legacy endpoint (keeping for backward compatibility)
router.post('/ask', agentController.askAgent);

// Canvas analysis and suggestions
router.post('/analyze', agentController.analyzeCanvas);
router.post('/suggest', agentController.suggestImprovements);
router.post('/validate', agentController.validateArchitecture);
router.post('/document', agentController.generateDocumentation);

// Multi-agent collaboration
router.post('/collaborate', agentController.collaborateAgents);

// Agent management
router.get('/capabilities/:agentId?', agentController.getAgentCapabilities);
router.get('/health', agentController.healthCheck);

module.exports = router; 