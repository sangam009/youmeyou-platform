import logger from '../../utils/logger.js';
import { ConversationalAgent } from './ConversationalAgent.js';
import { vectorDB } from '../VectorDBService.js';
import { actionExecutor } from '../ActionExecutor.js';
import { LLMDrivenTaskAnalyzer } from './LLMDrivenTaskAnalyzer.js';

export class ProjectManagerAgent extends ConversationalAgent {
  constructor() {
    super('Project Manager', 'Senior Project Manager');
    this.streamingEnabled = true; // Enable A2A streaming
    this.taskAnalyzer = new LLMDrivenTaskAnalyzer();
    logger.info('🎯 ProjectManagerAgent initialized with LLM-driven task analyzer');
  }

  /**
   * Override execute to add project-specific context
   */
  async execute(userQuery, context = {}) {
    try {
      logger.info('🎯 ProjectManager starting natural conversation with streaming');
      logger.info('📋 ProjectManager received context:', {
        hasUserId: !!context.userId,
        hasProjectId: !!context.projectId,
        contextKeys: Object.keys(context)
      });

      // Validate required context
      if (!context.userId || !context.projectId) {
        throw new Error('userId and projectId are required for ProjectManager execution');
      }

      // Get conversation context from VectorDB
      const conversationContext = await vectorDB.getConversationContext(context.userId, context.projectId, 5);
      logger.info(`📚 Retrieved ${conversationContext.length} conversation turns from VectorDB`);

      // Add project-specific context
      const enhancedContext = {
        ...context,
        streamingEnabled: true,
        conversationContext,
        agentCapabilities: {
          projectPlanning: true,
          resourceManagement: true,
          taskCoordination: true,
          riskAssessment: true
        }
      };

      // Use parent's execute method which implements iterative conversation
      const result = await super.execute(userQuery, enhancedContext);

      // Store conversation in VectorDB
      await vectorDB.storeConversationTurn(context.userId, context.projectId, {
        turnNumber: result.conversationTurns || 1,
        userMessage: userQuery,
        agentResponse: result.response?.content || result.content,
        agentName: this.agentName,
        completionScore: result.completionScore || 0.8,
        context: { conversationContext },
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      logger.error('❌ ProjectManager execution error:', error);
      return this.getFallbackResponse(userQuery, error);
    }
  }

  /**
   * Override to add project-specific prompt generation
   */
  async generateNextPrompt(conversationState, context) {
    const { DynamicPromptGenerationService } = await import('../DynamicPromptGenerationService.js');
    const promptGenerator = new DynamicPromptGenerationService();

    // If working on a subtask
    if (conversationState.currentSubTask) {
      return promptGenerator.getProjectSubTaskPrompt(
        conversationState.currentSubTask,
        conversationState.taskProgress,
        context.conversationContext || []
      );
    }

    // Generate prompt for next step
    return promptGenerator.getProjectNextStepPrompt(
      conversationState.originalTask,
      conversationState.taskProgress,
      context.conversationContext || []
    );
  }

  /**
   * Override to add project-specific action handling
   */
  async executeActions(actions, context) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'update_project':
            await this.executeProjectUpdate(action, context);
            break;
          case 'create_task':
            await this.executeTaskCreation(action, context);
            break;
          case 'assign_resources':
            await this.executeResourceAssignment(action, context);
            break;
          case 'update_canvas':
            await this.executeCanvasUpdate(action, context);
            break;
          default:
            // Use parent's action execution for common actions
            await super.executeActions([action], context);
        }
      } catch (error) {
        logger.error(`Error executing project action ${action.type}:`, error);
      }
    }
  }

  /**
   * Project-specific action handlers
   */
  async executeProjectUpdate(action, context) {
    try {
      const { projectService } = await import('../projectService.js');
      await projectService.updateProject(context.projectId, action.updates);
    } catch (error) {
      logger.error('Project update failed:', error);
    }
  }

  async executeTaskCreation(action, context) {
    try {
      const { taskService } = await import('../taskService.js');
      await taskService.createTask(context.projectId, action.task);
    } catch (error) {
      logger.error('Task creation failed:', error);
    }
  }

  async executeResourceAssignment(action, context) {
    try {
      const { resourceService } = await import('../resourceService.js');
      await resourceService.assignResources(context.projectId, action.assignments);
    } catch (error) {
      logger.error('Resource assignment failed:', error);
    }
  }

  /**
   * Execute canvas update action
   */
  async executeCanvasUpdate(action, context) {
    try {
      const { canvasService } = await import('../canvasService.js');
      const { FLAN_T5_Client } = await import('../cpuModels/FLAN_T5_Client.js');
      
      // Use FLAN-T5 to merge LLM response with existing canvas
      const flant5 = new FLAN_T5_Client();
      const mergedElements = await flant5.mergeCanvasElements(
        action.elements,
        context.canvasState || {}
      );

      // Update canvas with merged elements
      await canvasService.updateCanvas(context.projectId, {
        type: 'canvas_update',
        elements: mergedElements,
        description: action.description || 'Canvas updated by ProjectManager'
      });

      // Stream progress if enabled
      if (context.streamingEnabled && context.streamingCallback) {
        context.streamingCallback({
          type: 'canvas_update',
          status: 'Canvas elements updated',
          elements: mergedElements,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Canvas update failed:', error);
      throw error;
    }
  }

  /**
   * Override to add project-specific response compilation
   */
  compileFinalResponse(conversationState, context) {
    const baseResponse = super.compileFinalResponse(conversationState, context);

    // Add project-specific metadata
    return {
      ...baseResponse,
      projectMetadata: {
        projectId: context.projectId,
        conversationTurns: conversationState.conversationTurns,
        completedSubTasks: conversationState.subTasks.filter(t => t.completed).length,
        totalSubTasks: conversationState.subTasks.length,
        actionsTaken: conversationState.taskProgress.reduce((sum, p) => sum + (p.actions?.length || 0), 0)
      }
    };
  }

  async planProject(requirements) {
    try {
      logger.info('Planning project for requirements:', requirements);
      // TODO: Implement project planning logic
      return { status: 'Not implemented yet' };
    } catch (error) {
      logger.error('Error planning project:', error);
      throw error;
    }
  }

  async assignTasks(plan) {
    try {
      logger.info('Assigning tasks for plan:', plan);
      // TODO: Implement task assignment logic
      return { status: 'Not implemented yet' };
    } catch (error) {
      logger.error('Error assigning tasks:', error);
      throw error;
    }
  }

  async trackProgress(tasks) {
    try {
      logger.info('Tracking progress for tasks:', tasks);
      // TODO: Implement progress tracking logic
      return { status: 'Not implemented yet' };
    } catch (error) {
      logger.error('Error tracking progress:', error);
      throw error;
    }
  }

  /**
   * Execute with LLM-driven A2A streaming support
   */
  async executeWithStreaming(userQuery, context = {}) {
    const { userId, projectId } = context;
    
    if (!userId || !projectId) {
      throw new Error('userId and projectId are required for ProjectManager execution');
    }

    const streamingContext = {
      ...context,
      streamingEnabled: true,
      agentName: this.agentName,
      specialization: this.specialization
    };

    // Get conversation context from VectorDB
    const conversationContext = await vectorDB.getConversationContext(userId, projectId, 5);
    logger.info(`📚 Retrieved ${conversationContext.length} conversation turns from VectorDB`);

    // Stream initial status
    this.streamProgress({
      type: 'agent_start',
      agent: this.agentName,
      status: 'Starting LLM-driven task analysis...',
      completionScore: 0,
      timestamp: new Date().toISOString()
    }, context);

    try {
      // Step 1: Generate dynamic task analysis prompt
      const { DynamicPromptGenerationService } = await import('../DynamicPromptGenerationService.js');
      const promptGenerator = new DynamicPromptGenerationService();
      
      const taskPrompt = await promptGenerator.getTaskAnalysisPrompt(userQuery, {
        agentName: this.agentName,
        complexity: context.complexity || 'medium',
        domain: context.domain || 'software_development',
        userLevel: context.userLevel || 'intermediate'
      });

      const { LLMAgent } = await import('./LLMAgent.js');
      const llmAgent = LLMAgent.getInstance();
      
      // Stream analysis status
      this.streamProgress({
        type: 'task_analysis',
        agent: this.agentName,
        status: 'Analyzing task requirements...',
        completionScore: 20,
        timestamp: new Date().toISOString()
      }, context);

      const llmResponse = await llmAgent.collaborateWithAgent(
        this.agentName,
        taskPrompt,
        streamingContext
      );

      // Store conversation in VectorDB
      await vectorDB.storeConversationTurn(userId, projectId, {
        turnNumber: 1,
        userMessage: userQuery,
        agentResponse: llmResponse.response,
        agentName: this.agentName,
        completionScore: 0.8,
        context: { conversationContext },
        timestamp: new Date().toISOString()
      });

      // Stream completion
      this.streamProgress({
        type: 'agent_complete',
        agent: this.agentName,
        status: 'Analysis completed successfully',
        completionScore: 100,
        timestamp: new Date().toISOString()
      }, context);

      // Return structured response
      return {
        agentId: 'project-manager',
        agentName: this.agentName,
        response: {
          content: llmResponse.response,
          analysis: userQuery,
          suggestions: llmResponse.nextSteps || []
        },
        executedAt: new Date(),
        metadata: {
          complexity: 0.5,
          executionType: 'simple'
        }
      };

    } catch (error) {
      logger.error('❌ Error in ProjectManager streaming execution:', error);
      
      // Stream error status
      this.streamProgress({
        type: 'error',
        agent: this.agentName,
        status: `Error: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      }, context);

      // Return error response
      return {
        agentId: 'project-manager',
        agentName: this.agentName,
        response: {
          content: 'I apologize, but I encountered an error while processing your request. Please try again.',
          analysis: 'Error occurred during processing',
          suggestions: ['Try rephrasing your request', 'Break down the task into smaller parts']
        },
        executedAt: new Date(),
        metadata: {
          error: error.message,
          executionType: 'error'
        }
      };
    }
  }

  /**
   * Stream progress updates to A2A client
   */
  streamProgress(progressData, context) {
    if (context.streamingCallback) {
      try {
        context.streamingCallback(progressData);
        logger.info(`📡 Streaming sent: ${progressData.type} - ${progressData.status}`);
      } catch (error) {
        logger.error('❌ Error in streaming callback:', error);
      }
    } else {
      logger.warn('⚠️ No streaming callback available in context');
    }
    logger.info(`📡 Streaming: ${progressData.type} - ${progressData.status}`);
  }

  /**
   * Compile results from all sub-tasks into final response
   */
  compileSubTaskResults(results, taskDivision, originalQuery) {
    let finalResponse = `# Project Analysis: ${originalQuery}\n\n`;
    
    finalResponse += `## Task Breakdown\n`;
    finalResponse += `- **Complexity**: ${taskDivision.taskAnalysis.complexity}\n`;
    finalResponse += `- **Estimated Duration**: ${taskDivision.taskAnalysis.estimatedDuration}\n`;
    finalResponse += `- **Risk Level**: ${taskDivision.taskAnalysis.riskLevel}\n`;
    finalResponse += `- **Sub-tasks Executed**: ${results.length}\n\n`;

    finalResponse += `## Detailed Results\n\n`;
    
    results.forEach((result, index) => {
      finalResponse += `### ${index + 1}. ${result.subTask.title}\n`;
      finalResponse += `**Agent**: ${result.subTask.agent}\n`;
      finalResponse += `**Completion**: ${Math.round(result.completionScore * 100)}%\n`;
      finalResponse += `**Conversation Turns**: ${result.conversationTurns}\n\n`;
      
      if (result.missingElements.length > 0) {
        finalResponse += `**Missing Elements**:\n`;
        result.missingElements.forEach(element => {
          finalResponse += `- ${element.element} (${element.importance})\n`;
        });
        finalResponse += `\n`;
      }
      
      finalResponse += `**Response**:\n${result.response}\n\n`;
      finalResponse += `---\n\n`;
    });

    finalResponse += `## Summary\n`;
    finalResponse += `This project was executed using LLM-driven task division and progress evaluation. `;
    finalResponse += `Each sub-task was evaluated for completion and missing elements were addressed through follow-up prompts. `;
    finalResponse += `The overall completion rate is ${Math.round(results.reduce((sum, r) => sum + r.completionScore, 0) / results.length * 100)}%.\n\n`;
    
    finalResponse += `## Success Metrics\n`;
    taskDivision.successMetrics.forEach(metric => {
      finalResponse += `- ${metric}\n`;
    });

    return finalResponse;
  }

  /**
   * Compile responses from iterative LLM collaboration
   */
  compileIterativeResponse(initial, deep, recommendations) {
    return `**PROJECT ANALYSIS SUMMARY**

**Initial Assessment:**
${initial.response.substring(0, 300)}...

**Detailed Analysis:**
${deep.response.substring(0, 300)}...

**Actionable Recommendations:**
${recommendations.response.substring(0, 300)}...

This analysis was generated through iterative collaboration with AI to ensure comprehensive project planning.`;
  }

  /**
   * Extract actionable items from LLM responses
   */
  extractActionableItems(response) {
    const actionableItems = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^\d+\./) || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const item = trimmed.replace(/^\d+\./, '').replace(/^[-•]\s*/, '').trim();
        if (item.length > 15 && (item.toLowerCase().includes('implement') || 
                                item.toLowerCase().includes('create') ||
                                item.toLowerCase().includes('establish') ||
                                item.toLowerCase().includes('develop'))) {
          actionableItems.push(item);
        }
      }
    }
    
    return actionableItems.slice(0, 5); // Limit to 5 actionable items
  }

  async handleTask(task, context = {}) {
    try {
      logger.info('🎯 ProjectManager handling task with iterative conversation:', task);
      
      // IMPORTANT: Use ConversationalAgent's iterative conversation instead of custom implementation
      // This enables natural conversation until 80% completion with sub-prompts
      logger.info('💬 Using ConversationalAgent iterative conversation (80% completion threshold)');
      
      return await this.execute(task, context);
      
    } catch (error) {
      logger.error('❌ Error in ProjectManager handleTask:', error);
      throw error;
    }
  }
}

export default ProjectManagerAgent; 