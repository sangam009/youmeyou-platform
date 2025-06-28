import logger from '../../utils/logger.js';
import { AgentOrchestrator } from './AgentOrchestrator.js';

class A2AAdapter {
  constructor() {
    this.orchestrator = new AgentOrchestrator();
    this.activeExecutions = new Map();
  }

  async routeTask(task) {
    try {
      logger.info(`Routing task through A2A Adapter: ${task.type}`);
      
      // Convert A2A task format to new agent system format
      const request = this.convertTaskToRequest(task);
      
      // Process request through new agent system format
      const executionResult = await this.orchestrator.analyzeTask(request.content);
      
      // Store execution mapping
      this.activeExecutions.set(task.id, executionResult);
      
      // Convert response back to A2A format
      return this.convertToA2AResponse(executionResult, task);
    } catch (error) {
      logger.error('Error in A2A Adapter:', error);
      throw error;
    }
  }

  async executeNextStep(taskId, previousResponse = null) {
    try {
      const executionResult = this.activeExecutions.get(taskId);
      if (!executionResult) {
        throw new Error('No active execution found for task');
      }
      
      // Execute coordinated task with the selected agents
      const stepResult = await this.orchestrator.executeCoordinatedTask(
        executionResult.selectedAgents,
        previousResponse || 'Continue with the next step',
        executionResult.context
      );
      
      return this.convertToA2AStepResponse(stepResult);
    } catch (error) {
      logger.error('Error executing next step:', error);
      throw error;
    }
  }

  convertTaskToRequest(task) {
    // Convert A2A task format to new request format
    return {
      type: task.type,
      content: task.content,
      context: {
        canvasState: task.canvasState,
        userPreferences: task.preferences,
        systemConstraints: task.constraints
      }
    };
  }

  convertToA2AResponse(executionResult, task) {
    // Convert new agent system response to A2A format
    return {
      agentId: 'multi-agent-system',
      agentName: 'Enhanced Agent System',
      response: {
        analysis: executionResult.context,
        questions: [],
        plan: executionResult.selectedAgents,
        status: 'INITIALIZED'
      },
      skills: executionResult.selectedAgents,
      executedAt: new Date(),
      metadata: {
        executionResult: executionResult,
        originalTask: task.type,
        complexity: executionResult.complexity
      }
    };
  }

  convertToA2AStepResponse(stepResult) {
    // Convert step result to A2A format
    return {
      status: stepResult.success ? 'completed' : 'failed',
      response: {
        validation: stepResult.success,
        followUp: stepResult.summary,
        progressReport: stepResult.metadata
      },
      nextStep: stepResult.success ? 'completed' : 'retry',
      completedAt: new Date()
    };
  }
}

export default A2AAdapter; 