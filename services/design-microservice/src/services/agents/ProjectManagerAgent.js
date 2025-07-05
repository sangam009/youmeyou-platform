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

  async execute(userQuery, context = {}) {
    try {
      logger.info('🎯 ProjectManager starting natural conversation with streaming');
      logger.info('📋 ProjectManager received context:', {
        hasUserId: !!context.userId,
        hasProjectId: !!context.projectId,
        userId: context.userId,
        projectId: context.projectId,
        contextKeys: Object.keys(context)
      });
      
      // Use parent's conversational execute with streaming support
      return await this.executeWithStreaming(userQuery, context);
      
    } catch (error) {
      logger.error('❌ ProjectManager execution error:', error);
      return this.getFallbackResponse(userQuery, error);
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
      // Step 1: Initial task analysis
      const taskPrompt = `
As a Senior Project Manager, analyze this task and provide a detailed response:

TASK: "${userQuery}"

Please provide:
1. Task analysis and scope
2. Key requirements and deliverables
3. Technical considerations
4. Implementation approach
5. Potential challenges and solutions

Format your response in a clear, structured way.`;

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
      logger.info('🎯 ProjectManager handling task:', task);
      
      // If streaming is enabled, use streaming execution
      if (context.streamingEnabled && context.streamingCallback) {
        return await this.executeWithStreaming(task, context);
      }
      
      // Otherwise, use standard execution
      return await this.execute(task, context);
      
    } catch (error) {
      logger.error('❌ Error in ProjectManager handleTask:', error);
      throw error;
    }
  }
}

export default ProjectManagerAgent; 