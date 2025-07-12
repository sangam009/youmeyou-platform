import logger from '../utils/logger.js';
import EnhancedGeminiService from '../services/EnhancedGeminiService.js';
import canvasService from '../services/canvasService.js';

/**
 * Simple Chat Controller - Handles the simplified streaming chat endpoint
 */
class SimpleChatController {
  constructor() {
    this.geminiService = new EnhancedGeminiService();
    
    logger.info('💬 SimpleChatController initialized');
  }

  /**
   * Stream chat response based on intent classification
   */
  async streamChat(req, res) {
    try {
      const { prompt, canvasId, userId } = req.body;

      // Validate input
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required and must be a string'
        });
      }

      if (prompt.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Prompt too long. Maximum 10,000 characters allowed.'
        });
      }

      // Get user ID from auth middleware if available
      const effectiveUserId = userId || req.user?.id || req.userId || 'anonymous';

      // Get canvas state if canvasId is provided
      let canvasState = {};
      if (canvasId) {
        try {
          const canvas = await canvasService.getCanvas(canvasId);
          if (canvas) {
            canvasState = {
              canvasId: canvas.id,
              title: canvas.title,
              description: canvas.description,
              components: canvas.components || [],
              connections: canvas.connections || [],
              metadata: canvas.metadata || {}
            };
          }
        } catch (canvasError) {
          logger.warn('⚠️ Failed to fetch canvas state:', canvasError);
          // Continue without canvas state
        }
      }

      logger.info('📤 Starting stream chat request:', {
        promptLength: prompt.length,
        canvasId: canvasId || 'none',
        userId: effectiveUserId,
        hasCanvasState: Object.keys(canvasState).length > 0
      });

      // Set up Server-Sent Events (SSE) headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Expose-Headers': 'Content-Type'
      });

      // Send initial connection event
      res.write(`event: connected\ndata: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to chat stream',
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Process the prompt using Enhanced Gemini Service
      await this.geminiService.processPrompt(
        prompt,
        res,
        canvasState,
        effectiveUserId
      );

      logger.info('✅ Stream chat completed successfully');

    } catch (error) {
      logger.error('❌ Stream chat failed:', error);

      // Send error event if response is still open
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }));
      } else {
        // If already streaming, send error event
        try {
          res.write(`event: error\ndata: ${JSON.stringify({
            type: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
          })}\n\n`);
          res.end();
        } catch (writeError) {
          logger.error('❌ Failed to write error to stream:', writeError);
        }
      }
    }
  }

  /**
   * Health check for the simple chat endpoint
   */
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        service: 'simple-chat',
        timestamp: new Date().toISOString(),
        geminiService: {
          initialized: this.geminiService.initialized,
          currentKeyIndex: this.geminiService.currentKeyIndex
        }
      };

      res.json(health);

    } catch (error) {
      logger.error('❌ Health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get supported capabilities
   */
  async getCapabilities(req, res) {
    try {
      const capabilities = {
        streaming: true,
        intentClassification: true,
        taskBreakdown: true,
        canvasActions: true,
        casualConversation: true,
        technicalProcessing: true,
        multiKeyFallback: true,
        supportedIntents: ['casual', 'technical'],
        supportedActions: [
          'canvas_update',
          'add_component',
          'update_component',
          'remove_component',
          'add_connection',
          'update_metadata'
        ],
        maxPromptLength: 10000,
        maxSubPrompts: 5
      };

      res.json({
        success: true,
        capabilities,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Get capabilities failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Process test request (for development/debugging)
   */
  async testProcess(req, res) {
    try {
      const { prompt, intent } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required'
        });
      }

      // Test intent classification
      const intentResult = await this.geminiService.classifyIntent(prompt);
      
      // Test task breakdown if technical
      let taskBreakdown = null;
      if (intentResult.data.intent === 'technical') {
        const subPromptResult = await this.geminiService.taskPromptService.divideIntoSubPrompts(prompt);
        taskBreakdown = subPromptResult.data;
      }

      res.json({
        success: true,
        data: {
          originalPrompt: prompt,
          intentClassification: intentResult.data,
          taskBreakdown,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('❌ Test process failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default new SimpleChatController(); 