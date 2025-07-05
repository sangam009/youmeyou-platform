import express from 'express';
import agentController from '../controllers/agentController.js';

const router = express.Router();

// Enhanced A2A endpoints
router.post('/task', agentController.routeTask);
router.post('/chat', agentController.chat);
router.post('/generate', agentController.generateCode);
router.post('/analyze', agentController.analyzeCode);
router.get('/status', agentController.getAgentStatus);

// Legacy endpoint (keeping for backward compatibility)
router.post('/ask', agentController.askAgent);

// Canvas analysis and suggestions
router.post('/analyze-canvas', agentController.analyzeCanvas);
router.post('/suggest', agentController.suggestImprovements);
router.post('/validate', agentController.validateArchitecture);
router.post('/document', agentController.generateDocumentation);

// Multi-agent collaboration
router.post('/collaborate', agentController.collaborateAgents);

// Agent management
router.get('/capabilities/:agentId?', agentController.getAgentCapabilities);
router.get('/health', agentController.healthCheck);
router.get('/list', agentController.getAgents);

export default router; 