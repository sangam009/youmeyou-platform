const logger = require('../../utils/logger');
const AgentOrchestrator = require('./AgentOrchestrator');

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
      
      // Process request through new agent system
      const executionResult = await this.orchestrator.processRequest(request, {
        taskType: task.type,
        canvasState: task.canvasState
      });
      
      // Store execution mapping
      this.activeExecutions.set(task.id, executionResult.executionId);
      
      // Convert response back to A2A format
      return this.convertToA2AResponse(executionResult, task);
    } catch (error) {
      logger.error('Error in A2A Adapter:', error);
      throw error;
    }
  }

  async executeNextStep(taskId, previousResponse = null) {
    try {
      const executionId = this.activeExecutions.get(taskId);
      if (!executionId) {
        throw new Error('No active execution found for task');
      }
      
      // Get current execution status
      const status = await this.orchestrator.getExecutionStatus(executionId);
      
      // Execute next step
      const stepResult = await this.orchestrator.executeStep(
        executionId,
        status.currentStep,
        previousResponse
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
        analysis: executionResult.analysis,
        questions: executionResult.questions,
        plan: executionResult.executionPlan,
        status: 'INITIALIZED'
      },
      skills: executionResult.analysis.requiredSkills,
      executedAt: new Date(),
      metadata: {
        executionId: executionResult.executionId,
        originalTask: task.type
      }
    };
  }

  convertToA2AStepResponse(stepResult) {
    // Convert step result to A2A format
    return {
      status: stepResult.status,
      response: {
        validation: stepResult.validation,
        followUp: stepResult.followUp,
        progressReport: stepResult.progressReport
      },
      nextStep: stepResult.nextStep,
      completedAt: new Date()
    };
  }
}

module.exports = A2AAdapter; 