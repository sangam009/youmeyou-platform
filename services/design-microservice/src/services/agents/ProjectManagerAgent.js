import logger from '../../utils/logger.js';
import { ConversationalAgent } from './ConversationalAgent.js';
import { vectorDB } from '../VectorDBService.js';
import { actionExecutor } from '../ActionExecutor.js';
import { LLMDrivenTaskAnalyzer } from './LLMDrivenTaskAnalyzer.js';

class ProjectManagerAgent extends ConversationalAgent {
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

    // Step 1: LLM-POWERED task division
    this.streamProgress({
      type: 'task_analysis',
      agent: this.agentName,
      status: 'Analyzing task complexity and dividing into sub-tasks...',
      completionScore: 10,
      timestamp: new Date().toISOString()
    }, context);

    const taskDivision = await this.taskAnalyzer.divideTaskIntoSubtasks(userQuery, context);
    
    this.streamProgress({
      type: 'task_division_complete',
      agent: this.agentName,
      status: `Task divided into ${taskDivision.subTasks.length} sub-tasks`,
      completionScore: 20,
      subTasks: taskDivision.subTasks.length,
      timestamp: new Date().toISOString()
    }, context);

    // Step 2: Execute sub-tasks with LLM-driven progress evaluation
    const results = [];
    let overallCompletion = 0;

    for (let i = 0; i < taskDivision.subTasks.length; i++) {
      const subTask = taskDivision.subTasks[i];
      
      this.streamProgress({
        type: 'subtask_start',
        agent: this.agentName,
        status: `Executing sub-task ${i + 1}/${taskDivision.subTasks.length}: ${subTask.title}`,
        completionScore: 20 + (i * 15),
        currentTask: subTask.title,
        timestamp: new Date().toISOString()
      }, context);

      // Execute sub-task with LLM
      const { LLMAgent } = await import('./LLMAgent.js');
      const llmAgent = new LLMAgent();
      
      const subTaskPrompt = `
As a ${subTask.agent}, execute this specific task:

TASK: ${subTask.title}
DESCRIPTION: ${subTask.description}
DELIVERABLES: ${subTask.deliverables.join(', ')}
ACCEPTANCE CRITERIA: ${subTask.acceptanceCriteria.join(', ')}

Please provide a comprehensive response that addresses all requirements.
`;

      const llmResponse = await llmAgent.collaborateWithAgent(
        subTask.agent,
        subTaskPrompt,
        { ...streamingContext, subTask }
      );

      // Store conversation turn in VectorDB
      await vectorDB.storeConversationTurn(userId, projectId, {
        turnNumber: i + 1,
        userMessage: subTask.description,
        agentResponse: llmResponse.response,
        agentName: subTask.agent,
        completionScore: 0.5, // Will be updated after evaluation
        context: { subTask, conversationContext },
        timestamp: new Date().toISOString()
      });

      // Parse and execute actions from LLM response
      const actions = actionExecutor.parseActionsFromLLMResponse(llmResponse.response);
      const actionResults = [];
      
      for (const action of actions) {
        try {
          const result = await actionExecutor.executeAction(userId, projectId, {
            ...action,
            agentName: subTask.agent
          }, { ...context, subTask });
          actionResults.push(result);
        } catch (error) {
          logger.error(`❌ Action execution failed:`, error);
          actionResults.push({ error: error.message });
        }
      }

      // LLM-POWERED progress evaluation
      const progressEvaluation = await this.taskAnalyzer.evaluateTaskProgress(
        llmResponse.response,
        subTask.description,
        { ...context, subTask, actionResults }
      );

      // LLM-POWERED missing elements detection
      const missingElements = await this.taskAnalyzer.detectMissingElements(
        llmResponse.response,
        subTask.description,
        { ...context, subTask }
      );

      // If not complete, generate follow-up prompts
      let finalResponse = llmResponse.response;
      let conversationTurns = 1;

      while (progressEvaluation.completionScore < this.taskAnalyzer.completionThreshold && 
             conversationTurns < 3) {
        
        conversationTurns++;
        
        this.streamProgress({
          type: 'follow_up',
          agent: this.agentName,
          status: `Follow-up ${conversationTurns} for: ${subTask.title}`,
          completionScore: 20 + (i * 15) + (conversationTurns * 5),
          currentTask: subTask.title,
          timestamp: new Date().toISOString()
        }, context);

        // Generate follow-up prompt using LLM
        const followUp = await this.taskAnalyzer.generateFollowUpPrompt(
          missingElements.missingElements,
          subTask.description,
          { ...context, subTask, previousResponse: finalResponse }
        );

        const followUpResponse = await llmAgent.collaborateWithAgent(
          subTask.agent,
          followUp.followUpPrompt,
          { ...streamingContext, subTask, previousResponse: finalResponse }
        );

        finalResponse += '\n\n' + followUpResponse.response;

        // Re-evaluate progress
        const newProgressEvaluation = await this.taskAnalyzer.evaluateTaskProgress(
          finalResponse,
          subTask.description,
          { ...context, subTask }
        );

        if (newProgressEvaluation.completionScore >= this.taskAnalyzer.completionThreshold) {
          break;
        }
      }

      results.push({
        subTask,
        response: finalResponse,
        completionScore: progressEvaluation.completionScore,
        missingElements: missingElements.missingElements,
        conversationTurns
      });

      overallCompletion += progressEvaluation.completionScore / taskDivision.subTasks.length;

      this.streamProgress({
        type: 'subtask_complete',
        agent: this.agentName,
        status: `Sub-task ${i + 1} completed (${Math.round(progressEvaluation.completionScore * 100)}%)`,
        completionScore: 20 + ((i + 1) * 15),
        currentTask: subTask.title,
        timestamp: new Date().toISOString()
      }, context);
    }

    // Step 3: Compile final response
    this.streamProgress({
      type: 'compilation',
      agent: this.agentName,
      status: 'Compiling final response from all sub-tasks...',
      completionScore: 90,
      timestamp: new Date().toISOString()
    }, context);

    const finalResponse = this.compileSubTaskResults(results, taskDivision, userQuery);

    this.streamProgress({
      type: 'agent_complete',
      agent: this.agentName,
      completionScore: Math.round(overallCompletion * 100),
      status: `Project completed! (${Math.round(overallCompletion * 100)}%)`,
      timestamp: new Date().toISOString()
    }, context);

    return {
      agentId: 'llm-driven-project-manager',
      agentName: 'LLM-Driven Project Manager',
      response: {
        content: finalResponse,
        analysis: `Task divided into ${taskDivision.subTasks.length} sub-tasks`,
        suggestions: taskDivision.successMetrics,
        subTasks: results.map(r => ({
          title: r.subTask.title,
          completion: Math.round(r.completionScore * 100),
          missingElements: r.missingElements.length
        }))
      },
      executedAt: new Date(),
      metadata: {
        taskAnalysis: taskDivision.taskAnalysis,
        subTaskCount: taskDivision.subTasks.length,
        overallCompletion: Math.round(overallCompletion * 100),
        llmDriven: true,
        executionType: 'llm-driven-subtask-execution'
      }
    };
  }

  /**
   * Stream progress updates to A2A client
   */
  streamProgress(progressData, context) {
    if (context.streamingCallback) {
      context.streamingCallback(progressData);
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
}

export default ProjectManagerAgent; 