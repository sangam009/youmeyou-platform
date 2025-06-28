import express from 'express';
import a2aService from '../services/a2aService.js';
import canvasService from '../services/canvasService.js';
import logger from '../utils/logger.js';
import dynamicPromptingRoutes from './dynamicPrompting.js';
import canvasController from '../controllers/canvasController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Stream A2A responses for canvas operations
router.get('/stream', async (req, res) => {
  const { clientId, task } = req.query;
  
  if (!clientId || !task) {
    return res.status(400).json({ error: 'clientId and task required' });
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  try {
    // Execute task with streaming
    const handleStreamEvent = (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    await a2aService.executeWithStreaming(task, handleStreamEvent);
  } catch (error) {
    logger.error('Error in streaming execution:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
  }
});

// Create new canvas with streaming updates
router.post('/', auth, canvasController.createCanvas.bind(canvasController));

// Update canvas with streaming updates
router.put('/:id', auth, canvasController.updateCanvas.bind(canvasController));

// Design system architecture with streaming updates
router.post('/architecture', async (req, res) => {
  try {
    const { projectType, requirements, constraints, existingComponents, scalabilityNeeds, clientId } = req.body;
    
    if (!projectType || !requirements || !clientId) {
      return res.status(400).json({ error: 'projectType, requirements, and clientId are required' });
    }

    // Create architecture design task
    const task = {
      type: 'ARCHITECTURE',
      context: {
        projectType,
        requirements,
        constraints: constraints || {},
        existingComponents: existingComponents || [],
        scalabilityNeeds: scalabilityNeeds || {}
      }
    };

    // Start streaming execution
    const handleArchitectureEvent = async (event) => {
      if (event.type === 'architecture-update') {
        try {
          await canvasService.updateArchitecture(clientId, event.data);
        } catch (error) {
          logger.error('Error updating architecture:', error);
        }
      }
    };

    await a2aService.executeWithStreaming(task, handleArchitectureEvent);

    res.json({ 
      success: true, 
      message: 'Architecture design started',
      streamUrl: `/api/canvas/stream?clientId=${clientId}&task=${encodeURIComponent(JSON.stringify(task))}`
    });
  } catch (error) {
    logger.error('Error designing architecture:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get architecture design status
router.get('/architecture/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const architecture = await canvasService.getArchitecture(clientId);
    if (!architecture) {
      return res.status(404).json({ error: 'Architecture not found' });
    }

    res.json(architecture);
  } catch (error) {
    logger.error('Error getting architecture:', error);
    res.status(500).json({ error: error.message });
  }
});

// Phase 3: Dynamic Prompting Routes
router.use('/dynamic-prompting', dynamicPromptingRoutes);

router.get('/:id', auth, canvasController.getCanvas.bind(canvasController));
router.delete('/:id', auth, canvasController.deleteCanvas.bind(canvasController));

export default router;