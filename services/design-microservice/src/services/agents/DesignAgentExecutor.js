import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

// Import our existing agents - fix imports to match actual exports
import { AgentOrchestrator } from './AgentOrchestrator.js';
import ProjectManagerAgent from './ProjectManagerAgent.js';
import { ArchitectureDesignerAgent } from './ArchitectureDesignerAgent.js';
import DatabaseDesignerAgent from './DatabaseDesignerAgent.js';
import APIDesignerAgent from './APIDesignerAgent.js';
import CodeGeneratorAgent from './CodeGeneratorAgent.js';
import TechLeadAgent from './TechLeadAgent.js';

/**
 * A2A Agent Executor for the Design Microservice
 * Implements the A2A protocol and coordinates all design agents
 */
export class DesignAgentExecutor {
  constructor() {
    this.cancelledTasks = new Set();
    
    // Initialize our agent system
    this.orchestrator = new AgentOrchestrator();
    this.agents = {
      projectManager: new ProjectManagerAgent(),
      architectureDesigner: new ArchitectureDesignerAgent(),
      databaseDesigner: new DatabaseDesignerAgent(),
      apiDesigner: new APIDesignerAgent(),
      codeGenerator: new CodeGeneratorAgent(),
      techLead: new TechLeadAgent()
    };
    
    logger.info('🤖 DesignAgentExecutor initialized with all agents');
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId, eventBus) {
    logger.info(`🛑 Cancelling task: ${taskId}`);
    this.cancelledTasks.add(taskId);
    
    // Publish cancellation event
    const cancelEvent = {
      kind: 'status-update',
      taskId: taskId,
      contextId: taskId, // Use taskId as contextId for simplicity
      status: {
        state: 'canceled',
        timestamp: new Date().toISOString()
      },
      final: true
    };
    
    eventBus.publish(cancelEvent);
  }

  /**
   * Execute a task using our multi-agent system
   */
  async execute(requestContext, eventBus) {
    const userMessage = requestContext.userMessage;
    const existingTask = requestContext.task;
    
    // Get task and context IDs from requestContext
    const taskId = requestContext.taskId || uuidv4();
    const contextId = requestContext.contextId || uuidv4();
    
    logger.info(`🚀 Processing A2A task ${taskId} with message: ${userMessage.parts[0]?.text?.substring(0, 100)}...`);

    try {
      // 1. Create initial task if it doesn't exist
      if (!existingTask) {
        const initialTask = {
          kind: 'task',
          id: taskId,
          contextId: contextId,
          status: {
            state: 'submitted',
            timestamp: new Date().toISOString()
          },
          history: [userMessage],
          metadata: userMessage.metadata || {},
          artifacts: []
        };
        
        eventBus.publish(initialTask);
        logger.info(`📝 Created initial task ${taskId}`);
      }

      // 2. Publish working status
      await this.publishStatusUpdate(eventBus, taskId, contextId, {
        state: 'working',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: '🤖 Analyzing your request and selecting the best agents...' }],
          taskId: taskId,
          contextId: contextId
        }
      });

      // Check for cancellation
      if (this.cancelledTasks.has(taskId)) {
        await this.handleCancellation(eventBus, taskId, contextId);
        return;
      }

      // 3. Extract user query
      const userQuery = this.extractUserQuery(userMessage);
      
      // 4. Use orchestrator to analyze and route the task
      await this.publishStatusUpdate(eventBus, taskId, contextId, {
        state: 'working',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: '🔍 Analyzing task complexity and requirements...' }],
          taskId: taskId,
          contextId: contextId
        }
      });

      // Analyze the task using our orchestrator
      const taskAnalysis = await this.orchestrator.analyzeTask(userQuery);
      
      // Check for cancellation
      if (this.cancelledTasks.has(taskId)) {
        await this.handleCancellation(eventBus, taskId, contextId);
        return;
      }

      // 5. Select and execute with appropriate agents
      await this.publishStatusUpdate(eventBus, taskId, contextId, {
        state: 'working',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: `🎯 Selected agents: ${taskAnalysis.selectedAgents.join(', ')}` }],
          taskId: taskId,
          contextId: contextId
        }
      });

      // Execute the task with streaming updates
      const result = await this.executeWithStreaming(taskAnalysis, userQuery, eventBus, taskId, contextId);

      // Check for cancellation
      if (this.cancelledTasks.has(taskId)) {
        await this.handleCancellation(eventBus, taskId, contextId);
        return;
      }

      // 6. Publish artifacts if any
      if (result.artifacts && result.artifacts.length > 0) {
        for (const artifact of result.artifacts) {
          const artifactEvent = {
            kind: 'artifact-update',
            taskId: taskId,
            contextId: contextId,
            artifact: {
              artifactId: artifact.id || uuidv4(),
              name: artifact.name || 'Generated Artifact',
              parts: artifact.parts || [{ kind: 'text', text: JSON.stringify(artifact.content, null, 2) }]
            },
            append: false,
            lastChunk: true
          };
          
          eventBus.publish(artifactEvent);
        }
      }

      // 7. Publish final completion
      await this.publishStatusUpdate(eventBus, taskId, contextId, {
        state: 'completed',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: result.summary || '✅ Task completed successfully!' }],
          taskId: taskId,
          contextId: contextId
        }
      }, true);

      logger.info(`✅ Task ${taskId} completed successfully`);

    } catch (error) {
      logger.error(`❌ Error executing task ${taskId}:`, error);
      
      // Publish error status
      await this.publishStatusUpdate(eventBus, taskId, contextId, {
        state: 'failed',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ 
            kind: 'text', 
            text: `❌ Task failed: ${error.message}. Please try again or rephrase your request.` 
          }],
          taskId: taskId,
          contextId: contextId
        }
      }, true);
    }
    
    // Call finished on eventBus
    eventBus.finished();
  }

  /**
   * Execute task with streaming updates
   */
  async executeWithStreaming(taskAnalysis, userQuery, eventBus, taskId, contextId) {
    const results = [];
    
    // Execute each selected agent with streaming
    for (let i = 0; i < taskAnalysis.selectedAgents.length; i++) {
      const agentName = taskAnalysis.selectedAgents[i];
      const agent = this.agents[agentName];
      
      if (!agent) {
        logger.warn(`⚠️ Agent ${agentName} not found, skipping`);
        continue;
      }

      // Check for cancellation before each agent
      if (this.cancelledTasks.has(taskId)) {
        await this.handleCancellation(eventBus, taskId, contextId);
        return;
      }

      // Publish agent start
      await this.publishStatusUpdate(eventBus, taskId, contextId, {
        state: 'working',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ 
            kind: 'text', 
            text: `🤖 ${agent.name || agentName} is working... (${i + 1}/${taskAnalysis.selectedAgents.length})` 
          }],
          taskId: taskId,
          contextId: contextId
        }
      });

      try {
        // Create streaming context for the agent
        const streamingContext = {
          ...taskAnalysis.context,
          userId: taskAnalysis.context.userId || 'a2a-user',
          projectId: taskAnalysis.context.projectId || 'a2a-project',
          streamingEnabled: true,
          streamingCallback: (progressData) => {
            // Convert agent progress to A2A events
            this.publishStatusUpdate(eventBus, taskId, contextId, {
              state: 'working',
              message: {
                kind: 'message',
                role: 'agent',
                messageId: uuidv4(),
                parts: [{ 
                  kind: 'text', 
                  text: `🔄 ${progressData.agent || agent.name}: ${progressData.status}` 
                }],
                taskId: taskId,
                contextId: contextId
              }
            });
          }
        };

        // Use streaming execution if available, otherwise fall back to regular execution
        let agentResult;
        if (typeof agent.executeWithStreaming === 'function') {
          logger.info(`🌊 Using streaming execution for ${agentName}`);
          agentResult = await agent.executeWithStreaming(userQuery, streamingContext);
        } else {
          logger.info(`📝 Using regular execution for ${agentName}`);
          agentResult = await agent.execute(userQuery, streamingContext);
        }
        
        // Publish agent completion
        await this.publishStatusUpdate(eventBus, taskId, contextId, {
          state: 'working',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ 
              kind: 'text', 
              text: `✅ ${agent.name || agentName} completed` 
            }],
            taskId: taskId,
            contextId: contextId
          }
        });

        results.push(agentResult);
        
      } catch (agentError) {
        logger.error(`❌ Agent ${agentName} failed:`, agentError);
        
        await this.publishStatusUpdate(eventBus, taskId, contextId, {
          state: 'working',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ 
              kind: 'text', 
              text: `⚠️ ${agent.name || agentName} encountered an issue, continuing with other agents...` 
            }],
            taskId: taskId,
            contextId: contextId
          }
        });
      }
    }

    // Combine results
    return this.combineResults(results, taskAnalysis);
  }

  /**
   * Combine results from multiple agents
   */
  combineResults(results, taskAnalysis) {
    const artifacts = [];
    const summaryParts = [];

    results.forEach((result, index) => {
      if (result.content) {
        summaryParts.push(result.content);
      }
      
      if (result.artifacts) {
        artifacts.push(...result.artifacts);
      }
      
      if (result.canvas) {
        artifacts.push({
          id: uuidv4(),
          name: 'canvas_update.json',
          content: result.canvas,
          parts: [{ kind: 'text', text: JSON.stringify(result.canvas, null, 2) }]
        });
      }
    });

    return {
      summary: summaryParts.join('\n\n'),
      artifacts: artifacts,
      metadata: {
        taskType: taskAnalysis.type,
        agentsUsed: taskAnalysis.selectedAgents,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Extract user query from message
   */
  extractUserQuery(userMessage) {
    const textParts = userMessage.parts.filter(part => part.kind === 'text');
    return textParts.map(part => part.text).join(' ');
  }

  /**
   * Publish status update event
   */
  async publishStatusUpdate(eventBus, taskId, contextId, status, final = false) {
    const statusEvent = {
      kind: 'status-update',
      taskId: taskId,
      contextId: contextId,
      status: {
        ...status,
        timestamp: new Date().toISOString()
      },
      final: final
    };
    
    eventBus.publish(statusEvent);
    
    // Add small delay for streaming effect
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Handle task cancellation
   */
  async handleCancellation(eventBus, taskId, contextId) {
    logger.info(`🛑 Handling cancellation for task ${taskId}`);
    
    const cancelEvent = {
      kind: 'status-update',
      taskId: taskId,
      contextId: contextId,
      status: {
        state: 'canceled',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: '🛑 Task was cancelled by user request' }],
          taskId: taskId,
          contextId: contextId
        },
        timestamp: new Date().toISOString()
      },
      final: true
    };
    
    eventBus.publish(cancelEvent);
  }
} 