import a2aService from '../services/a2aService.js';
import logger from '../utils/logger.js';

class AgentController {
  async routeTask(req, res) {
    try {
      const { type, content, component, canvasState } = req.body;
      const userId = req.user?.userId || 'dummy-user-id';
      
      if (!content && !type) {
        return res.status(400).json({
          status: 'error',
          message: 'Task type or content is required'
        });
      }
      
      logger.info(`A2A task request from user ${userId}: ${type || 'unknown'} - ${content?.substring(0, 100)}...`);
      
      const task = {
        type: type || 'general',
        content: content || 'General assistance request',
        component: component || null,
        canvasState: canvasState || {},
        userId,
        timestamp: new Date()
      };
      
      const response = await a2aService.routeTask(task);
      
      res.json({
        status: 'success',
        data: response,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error in routeTask:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to process A2A task',
        error: error.message
      });
    }
  }

  async askAgent(req, res) {
    try {
      const { content, canvasState, agentId } = req.body;
      const userId = req.user?.userId || 'dummy-user-id';
      
      if (!content) {
        return res.status(400).json({
          status: 'error',
          message: 'Content is required'
        });
      }
      
      logger.info(`Agent request from user ${userId}: ${content.substring(0, 100)}...`);
      
      const task = {
        type: 'chat',
        content,
        canvasState: canvasState || {},
        userId,
        agentId, // Optional: specific agent requested
        timestamp: new Date()
      };
      
      const response = await a2aService.routeTask(task);
      
      res.json({
        status: 'success',
        data: response
      });
    } catch (error) {
      logger.error('Error in askAgent:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to process agent request'
      });
    }
  }

  async getAgentStatus(req, res) {
    try {
      const status = await a2aService.getAgentStatus();
      
      res.json({
        status: 'success',
        data: status
      });
    } catch (error) {
      logger.error('Error getting agent status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get agent status'
      });
    }
  }

  async analyzeCanvas(req, res) {
    try {
      const { canvasData } = req.body;
      const userId = req.user?.userId || 'dummy-user-id';
      
      if (!canvasData) {
        return res.status(400).json({
          status: 'error',
          message: 'Canvas data is required'
        });
      }
      
      logger.info(`Canvas analysis request from user ${userId}`);
      
      const task = {
        type: 'analysis',
        content: 'Please analyze this architecture and provide recommendations',
        canvasState: canvasData,
        userId,
        timestamp: new Date()
      };
      
      const response = await a2aService.routeTask(task);
      
      res.json({
        status: 'success',
        data: response
      });
    } catch (error) {
      logger.error('Error analyzing canvas:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to analyze canvas'
      });
    }
  }

  async suggestImprovements(req, res) {
    try {
      const { code } = req.body;
      const result = await a2aService.suggestImprovements(code);
      res.json(result);
    } catch (error) {
      logger.error('Error suggesting improvements:', error);
      res.status(500).json({ error: 'Failed to suggest improvements' });
    }
  }

  async validateArchitecture(req, res) {
    try {
      const { canvasData, validationType } = req.body;
      const userId = req.user?.userId || 'dummy-user-id';
      
      if (!canvasData) {
        return res.status(400).json({
          status: 'error',
          message: 'Canvas data is required'
        });
      }
      
      const validationTypes = {
        'security': 'security vulnerabilities and compliance issues',
        'performance': 'performance bottlenecks and optimization opportunities',
        'scalability': 'scalability issues and growth limitations',
        'best-practices': 'adherence to architecture best practices',
        'all': 'all aspects including security, performance, scalability, and best practices'
      };
      
      const validationFocus = validationTypes[validationType] || validationTypes['all'];
      
      logger.info(`Architecture validation request from user ${userId}, type: ${validationType || 'all'}`);
      
      const task = {
        type: 'validation',
        content: `Please validate this architecture for ${validationFocus}. Identify potential issues, risks, and violations of best practices.`,
        canvasState: canvasData,
        userId,
        timestamp: new Date()
      };
      
      const response = await a2aService.routeTask(task);
      
      res.json({
        status: 'success',
        data: response
      });
    } catch (error) {
      logger.error('Error validating architecture:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to validate architecture'
      });
    }
  }

  async generateDocumentation(req, res) {
    try {
      const { canvasData, documentationType } = req.body;
      const userId = req.user?.userId || 'dummy-user-id';
      
      if (!canvasData) {
        return res.status(400).json({
          status: 'error',
          message: 'Canvas data is required'
        });
      }
      
      const docTypes = {
        'overview': 'a high-level architecture overview document',
        'technical': 'detailed technical documentation',
        'api': 'API documentation and specifications',
        'deployment': 'deployment and operations guide',
        'security': 'security architecture documentation'
      };
      
      const docType = docTypes[documentationType] || docTypes['overview'];
      
      logger.info(`Documentation generation request from user ${userId}, type: ${documentationType || 'overview'}`);
      
      const task = {
        type: 'documentation',
        content: `Generate ${docType} for this architecture. Include component descriptions, relationships, data flows, and key technical decisions.`,
        canvasState: canvasData,
        userId,
        timestamp: new Date()
      };
      
      const response = await a2aService.routeTask(task);
      
      res.json({
        status: 'success',
        data: response
      });
    } catch (error) {
      logger.error('Error generating documentation:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate documentation'
      });
    }
  }

  async collaborateAgents(req, res) {
    try {
      const { content, canvasState, agentIds } = req.body;
      const userId = req.user?.userId || 'dummy-user-id';
      
      if (!content || !agentIds || !Array.isArray(agentIds)) {
        return res.status(400).json({
          status: 'error',
          message: 'Content and agentIds array are required'
        });
      }
      
      logger.info(`Multi-agent collaboration request from user ${userId} with ${agentIds.length} agents`);
      
      const task = {
        type: 'collaboration',
        content,
        canvasState: canvasState || {},
        userId,
        timestamp: new Date()
      };
      
      const response = await a2aService.collaborateAgents(task, agentIds);
      
      res.json({
        status: 'success',
        data: response
      });
    } catch (error) {
      logger.error('Error in agent collaboration:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to collaborate agents'
      });
    }
  }

  async getAgentCapabilities(req, res) {
    try {
      const { agentId } = req.params;
      
      const status = await a2aService.getAgentStatus();
      
      if (agentId) {
        const agent = status.agents.find(a => a.id === agentId);
        if (!agent) {
          return res.status(404).json({
            status: 'error',
            message: 'Agent not found'
          });
        }
        
        res.json({
          status: 'success',
          data: agent
        });
      } else {
        res.json({
          status: 'success',
          data: status
        });
      }
    } catch (error) {
      logger.error('Error getting agent capabilities:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get agent capabilities'
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const status = await a2aService.getAgentStatus();
      
      res.json({
        status: 'success',
        data: {
          service: 'AI Agents',
          version: '1.0.0',
          uptime: process.uptime(),
          agents: status,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Error in agent health check:', error);
      res.status(500).json({
        status: 'error',
        message: 'Agent service health check failed'
      });
    }
  }

  async chat(req, res) {
    try {
      const { message, canvasState, component } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          error: 'Message is required' 
        });
      }

      logger.info(`Agent chat request: ${message.substring(0, 100)}...`);

      // Create task for A2A service
      const task = {
        type: 'chat',
        content: message,
        canvasState: canvasState || {},
        component: component || null,
        userId: req.user?.id || 'anonymous',
        timestamp: new Date()
      };

      // Route task to appropriate agent
      const result = await a2aService.routeTask(task);

      res.json({
        success: true,
        agent: result.agentName,
        response: result.response,
        executedAt: result.executedAt
      });

    } catch (error) {
      logger.error('Error in agent chat:', error);
      res.status(500).json({ 
        error: 'Failed to process chat request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async generateCode(req, res) {
    try {
      const { prompt } = req.body;
      const result = await a2aService.generateCode(prompt);
      res.json(result);
    } catch (error) {
      logger.error('Error generating code:', error);
      res.status(500).json({ error: 'Failed to generate code' });
    }
  }

  async analyze(req, res) {
    try {
      const { canvasState, focusComponent } = req.body;
      
      if (!canvasState || !canvasState.nodes) {
        return res.status(400).json({ 
          error: 'Canvas state with nodes is required' 
        });
      }

      logger.info(`Architecture analysis request for ${canvasState.nodes.length} components`);

      // Create analysis task
      const task = {
        type: 'analysis',
        content: 'Analyze this architecture for performance, security, and scalability issues',
        canvasState: canvasState,
        component: focusComponent || null,
        userId: req.user?.id || 'anonymous',
        timestamp: new Date()
      };

      // Route to architecture agent
      const result = await a2aService.routeTask(task);

      res.json({
        success: true,
        agent: result.agentName,
        analysis: result.response.data?.analysis || '',
        optimizations: result.response.data?.optimizations || {},
        suggestions: result.response.data?.suggestions || [],
        nextSteps: result.response.data?.nextSteps || [],
        executedAt: result.executedAt
      });

    } catch (error) {
      logger.error('Error in architecture analysis:', error);
      res.status(500).json({ 
        error: 'Failed to analyze architecture',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getAgents(req, res) {
    try {
      const status = await a2aService.getAgentStatus();
      
      res.json({
        success: true,
        agents: status.agents,
        skillRegistry: status.skillRegistry,
        totalAgents: status.totalAgents
      });

    } catch (error) {
      logger.error('Error getting agent status:', error);
      res.status(500).json({ 
        error: 'Failed to get agent status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async analyzeCode(req, res) {
    try {
      const { code } = req.body;
      const result = await a2aService.analyzeCode(code);
      res.json(result);
    } catch (error) {
      logger.error('Error analyzing code:', error);
      res.status(500).json({ error: 'Failed to analyze code' });
    }
  }

  async reviewCode(req, res) {
    try {
      const { code } = req.body;
      const result = await a2aService.reviewCode(code);
      res.json(result);
    } catch (error) {
      logger.error('Error reviewing code:', error);
      res.status(500).json({ error: 'Failed to review code' });
    }
  }
}

const agentController = new AgentController();
export default agentController; 