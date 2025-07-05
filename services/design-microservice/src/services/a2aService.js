import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import { AgentOrchestrator } from './agents/AgentOrchestrator.js';
import { IntelligentTaskRouter } from './IntelligentTaskRouter.js';

/**
 * A2A Service with enhanced streaming support
 */
export class A2AService {
  constructor() {
    // Initialize intelligent router and orchestrator - use singletons
    this.intelligentRouter = new IntelligentTaskRouter();
    this.orchestrator = new AgentOrchestrator();
    
    // Get agents from orchestrator instead of creating new instances
    this.projectManager = this.orchestrator.projectManager;
    this.techLead = this.orchestrator.techLead || null; // May not exist yet
    
    logger.info('🚀 [A2A SERVICE] A2AService initialized with singleton orchestrator and router');
  }

  /**
   * Format SSE message
   */
  formatSSEMessage(event, data) {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  /**
   * Route task with streaming support
   */
  async routeTask(req, res) {
    const { content, type = 'general', canvasState, streamingEnabled } = req.body;

    // Set up SSE headers
    if (streamingEnabled) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Send initial connection event
      res.write(this.formatSSEMessage('connected', { status: 'connected' }));
    }

    try {
      const context = {
        userId: req.user?.id,
        projectId: canvasState?.projectId,
        streamingEnabled,
        streamingCallback: (data) => {
          if (streamingEnabled) {
            res.write(this.formatSSEMessage(data.type, data));
          }
        }
      };

      // Execute task with streaming
      const result = await this.intelligentRouter.routeTask(content, {
        ...context,
        type,
        complexity: 0.5 // Will be updated by analysis
      });

      // Send completion event
      if (streamingEnabled) {
        res.write(this.formatSSEMessage('complete', { 
          type: 'complete',
          status: 'Task execution completed',
          result 
        }));
        res.end();
      } else {
        res.json(result);
      }

    } catch (error) {
      logger.error('❌ Task execution failed:', error);
      
      if (streamingEnabled) {
        res.write(this.formatSSEMessage('error', {
          type: 'error',
          error: error.message
        }));
        res.end();
      } else {
        res.status(500).json({
          error: error.message
        });
      }
    }
  }

  async handleChatTask(task) {
    try {
      logger.info('💬 Handling chat task');
      
      // Use the orchestrator to analyze and execute the task
      const analysis = await this.orchestrator.analyzeTask(task.content);
      
      // Execute with the selected agents
      const result = await this.orchestrator.executeCoordinatedTask(
        analysis.selectedAgents,
        task.content,
        { canvasState: task.canvasState, userId: task.userId }
      );

      return {
        agentId: 'multi-agent-orchestrator',
        agentName: 'AI Architecture Assistant',
        response: {
          content: result.summary || 'I\'m here to help with your architecture needs!',
          analysis: result.analysis || 'Task completed successfully',
          suggestions: result.suggestions || []
        },
        executedAt: new Date(),
        metadata: {
          selectedAgents: analysis.selectedAgents,
          complexity: analysis.complexity
        }
      };
    } catch (error) {
      logger.error('❌ Error handling chat task:', error);
      return {
        agentId: 'fallback',
        agentName: 'System Assistant',
        response: {
          content: 'I\'m having trouble processing your request right now, but I\'m here to help! Could you try rephrasing your question?',
          analysis: 'Error occurred during processing',
          suggestions: []
        },
        executedAt: new Date()
      };
    }
  }

  async handleAnalysisTask(task) {
    try {
      logger.info('🔍 Handling analysis task');
      
      const analysis = await this.orchestrator.analyzeTask(
        `Analyze the architecture: ${task.content}`
      );
      
      const result = await this.orchestrator.executeCoordinatedTask(
        ['architectureDesigner', 'databaseDesigner'],
        task.content,
        { canvasState: task.canvasState }
      );

      return {
        agentId: 'architecture-analyzer',
        agentName: 'Architecture Analyzer',
        response: {
          content: result.summary || 'Architecture analysis completed',
          analysis: result.analysis || 'No specific issues found',
          recommendations: result.recommendations || []
        },
        executedAt: new Date()
      };
    } catch (error) {
      logger.error('❌ Error handling analysis task:', error);
      throw error;
    }
  }

  async handleValidationTask(task) {
    try {
      logger.info('✅ Handling validation task');
      
      const result = await this.orchestrator.executeCoordinatedTask(
        ['techLead', 'architectureDesigner'],
        task.content,
        { canvasState: task.canvasState }
      );

      return {
        agentId: 'architecture-validator',
        agentName: 'Architecture Validator',
        response: {
          content: result.summary || 'Validation completed',
          issues: result.issues || [],
          recommendations: result.recommendations || []
        },
        executedAt: new Date()
      };
    } catch (error) {
      logger.error('❌ Error handling validation task:', error);
      throw error;
    }
  }

  async handleDocumentationTask(task) {
    try {
      logger.info('📝 Handling documentation task');
      
      const result = await this.orchestrator.executeCoordinatedTask(
        ['projectManager', 'architectureDesigner'],
        task.content,
        { canvasState: task.canvasState }
      );

      return {
        agentId: 'documentation-generator',
        agentName: 'Documentation Generator',
        response: {
          content: result.summary || 'Documentation generated',
          documentation: result.documentation || 'No documentation available',
          sections: result.sections || []
        },
        executedAt: new Date()
      };
    } catch (error) {
      logger.error('❌ Error handling documentation task:', error);
      throw error;
    }
  }

  async handleGenericTask(task) {
    try {
      logger.info('🔧 Handling generic task');
      
      const analysis = await this.orchestrator.analyzeTask(task.content);
      const result = await this.orchestrator.executeCoordinatedTask(
        analysis.selectedAgents,
        task.content,
        { canvasState: task.canvasState }
      );

      return {
        agentId: 'generic-assistant',
        agentName: 'AI Assistant',
        response: {
          content: result.summary || 'Task completed',
          analysis: result.analysis || 'No specific analysis available'
        },
        executedAt: new Date()
      };
    } catch (error) {
      logger.error('❌ Error handling generic task:', error);
      throw error;
    }
  }

  async getAgentStatus() {
    try {
      logger.info('📊 Getting agent status');
      
      const agents = await this.getLocalAgents();
      
      return {
        status: 'active',
        agents: agents.map(agent => ({
          ...agent,
          status: 'ready',
          lastActivity: new Date(),
          capabilities: this.getAgentCapabilities(agent.id)
        })),
        orchestrator: {
          status: 'ready',
          activeAgents: agents.length,
          lastActivity: new Date()
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('❌ Error getting agent status:', error);
      throw error;
    }
  }

  getAgentCapabilities(agentId) {
    const capabilities = {
      'project-manager': ['project_planning', 'task_breakdown', 'resource_allocation'],
      'tech-lead': ['architecture_review', 'code_review', 'technical_guidance'],
      'architecture-designer': ['system_design', 'scalability_analysis', 'pattern_recommendation'],
      'database-designer': ['schema_design', 'query_optimization', 'data_modeling'],
      'api-designer': ['rest_api_design', 'authentication_flows', 'api_documentation'],
      'code-generator': ['code_generation', 'testing', 'documentation']
    };
    
    return capabilities[agentId] || ['general_assistance'];
  }

  async suggestImprovements(code) {
    try {
      logger.info('💡 Suggesting improvements for code');
      
      const result = await this.orchestrator.executeCoordinatedTask(
        ['techLead', 'codeGenerator'],
        `Suggest improvements for this code: ${code}`,
        {}
      );

      return {
        status: 'success',
        suggestions: result.suggestions || [],
        improvements: result.improvements || []
      };
    } catch (error) {
      logger.error('❌ Error suggesting improvements:', error);
      throw error;
    }
  }

  async getAgentCard() {
    return {
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
          tags: ['architecture', 'system-design', 'scalability']
        },
        {
          id: 'database_design',
          name: 'Database Design',
          description: 'Design database schemas, optimize queries, and plan data models',
          tags: ['database', 'schema', 'optimization']
        },
        {
          id: 'api_design',
          name: 'API Design',
          description: 'Design RESTful APIs, authentication flows, and documentation',
          tags: ['api', 'rest', 'authentication']
        },
        {
          id: 'code_generation',
          name: 'Code Generation',
          description: 'Generate implementation code, tests, and documentation',
          tags: ['code', 'implementation', 'testing']
        },
        {
          id: 'project_management',
          name: 'Project Management',
          description: 'Break down projects into tasks, estimate timelines, and track progress',
          tags: ['project', 'planning', 'management']
        }
      ]
    };
  }

  async executeTask(taskId, task, context = {}) {
    try {
      logger.info(`Executing task ${taskId}`);

      // Analyze task and select appropriate agents
      const analysis = await this.orchestrator.analyzeTask(task.content);
      
      // Execute task with selected agents
      const result = await this.orchestrator.executeCoordinatedTask(
        analysis.selectedAgents,
        task.content,
        { ...context, ...analysis.context }
      );
      
      return {
        taskId,
        status: 'completed',
        result: result.results,
        metadata: {
          complexity: analysis.complexity,
          selectedAgents: analysis.selectedAgents,
          executionTime: Date.now() - analysis.startTime
        }
      };
    } catch (error) {
      logger.error(`Error executing task ${taskId}:`, error);
      throw error;
    }
  }

  async streamTask(taskId, task, context = {}) {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue({
            type: 'status',
            status: 'started',
            message: 'Analyzing task requirements...'
          });

          // Analyze task
          const analysis = await this.orchestrator.analyzeTask(task.content);
          
          controller.enqueue({
            type: 'analysis',
            selectedAgents: analysis.selectedAgents,
            complexity: analysis.complexity
          });

          // Execute task with streaming
          const result = await this.orchestrator.executeCoordinatedTaskWithStreaming(
            analysis.selectedAgents,
            task.content,
            { ...context, ...analysis.context },
            (update) => {
              controller.enqueue({
                type: 'progress',
                ...update
              });
            }
          );

          // Send final result
          controller.enqueue({
            type: 'completed',
            result: result.results,
            metadata: {
              complexity: analysis.complexity,
              selectedAgents: analysis.selectedAgents,
              executionTime: Date.now() - analysis.startTime
            }
          });

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return stream;
  }

  async getLocalAgents() {
    return [
      {
        id: 'project-manager',
        name: 'Project Manager Agent',
        skills: ['project_planning', 'task_breakdown', 'resource_allocation'],
        version: '1.0.0'
      },
      {
        id: 'tech-lead',
        name: 'Tech Lead Agent', 
        skills: ['architecture_review', 'code_review', 'technical_guidance'],
        version: '1.0.0'
      }
    ];
  }
}

// Export an instance of the service
const a2aService = new A2AService();
export default a2aService;