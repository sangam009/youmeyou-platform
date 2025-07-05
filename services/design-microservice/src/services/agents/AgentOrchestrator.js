import { config } from '../../config/index.js';
import logger from '../../utils/logger.js';

// Import individual agents - fix imports to match actual exports
import { ArchitectureDesignerAgent } from './ArchitectureDesignerAgent.js';
import DatabaseDesignerAgent from './DatabaseDesignerAgent.js';
import APIDesignerAgent from './APIDesignerAgent.js';
import CodeGeneratorAgent from './CodeGeneratorAgent.js';
import TechLeadAgent from './TechLeadAgent.js';
import ProjectManagerAgent from './ProjectManagerAgent.js';

/**
 * Agent Orchestrator - Coordinates multiple agents for complex tasks
 * No longer needs A2A client as it's part of the A2A server
 */
export class AgentOrchestrator {
  constructor() {
    // Initialize agents only once
    if (!AgentOrchestrator.instance) {
      this.projectManager = new ProjectManagerAgent();
      this.architectureDesigner = new ArchitectureDesignerAgent();
      
      // Note: Other agents not initialized yet to avoid complexity
      // They can be added later when needed
      
      // Store the instance
      AgentOrchestrator.instance = this;
      
      logger.info('🎯 [ORCHESTRATOR] AgentOrchestrator initialized with core agents (ProjectManager, ArchitectureDesigner)');
    }
    
    return AgentOrchestrator.instance;
  }

  /**
   * Get available agents (only return initialized ones)
   */
  getAvailableAgents() {
    const availableAgents = [];
    
    if (this.projectManager) availableAgents.push('projectManager');
    if (this.architectureDesigner) availableAgents.push('architectureDesigner');
    if (this.databaseDesigner) availableAgents.push('databaseDesigner');
    if (this.apiDesigner) availableAgents.push('apiDesigner');
    if (this.codeGenerator) availableAgents.push('codeGenerator');
    if (this.techLead) availableAgents.push('techLead');
    
    return availableAgents;
  }

  /**
   * Analyze task and determine which agents to use
   */
  async analyzeTask(userQuery) {
    try {
      logger.info(`🔍 [ORCHESTRATOR] Analyzing task: ${userQuery.substring(0, 100)}...`);

      // Simple keyword-based analysis for now
      // In production, this would use CPU models for classification
      const query = userQuery.toLowerCase();
      const selectedAgents = [];
      const availableAgents = this.getAvailableAgents();
      
      const context = {
        userQuery,
        timestamp: new Date().toISOString(),
        complexity: this.calculateComplexity(query)
      };

      // Determine task type and required agents (only if available)
      if (query.includes('architecture') || query.includes('system') || query.includes('design')) {
        if (availableAgents.includes('architectureDesigner')) {
          selectedAgents.push('architectureDesigner');
        }
        context.type = 'ARCHITECTURE_DESIGN';
      }

      if (query.includes('database') || query.includes('schema') || query.includes('data')) {
        if (availableAgents.includes('databaseDesigner')) {
          selectedAgents.push('databaseDesigner');
        }
        context.type = context.type ? 'FULL_STACK_DESIGN' : 'DATABASE_DESIGN';
      }

      if (query.includes('api') || query.includes('endpoint') || query.includes('rest')) {
        if (availableAgents.includes('apiDesigner')) {
          selectedAgents.push('apiDesigner');
        }
        context.type = context.type ? 'FULL_STACK_DESIGN' : 'API_DESIGN';
      }

      if (query.includes('code') || query.includes('implement') || query.includes('generate')) {
        if (availableAgents.includes('codeGenerator')) {
          selectedAgents.push('codeGenerator');
        }
        context.type = context.type ? 'FULL_STACK_DESIGN' : 'CODE_GENERATION';
      }

      if (query.includes('project') || query.includes('plan') || query.includes('manage')) {
        if (availableAgents.includes('projectManager')) {
          selectedAgents.push('projectManager');
        }
        context.type = context.type ? 'FULL_STACK_DESIGN' : 'PROJECT_MANAGEMENT';
      }

      // Add tech lead for complex tasks (only if available)
      if (selectedAgents.length > 1 && availableAgents.includes('techLead')) {
        selectedAgents.push('techLead');
      }

      // Default to project manager if no specific agents selected and available
      if (selectedAgents.length === 0 && availableAgents.includes('projectManager')) {
        selectedAgents.push('projectManager');
        context.type = 'GENERAL_INQUIRY';
      }

      // If no agents available, log warning
      if (selectedAgents.length === 0) {
        logger.warn('⚠️ [ORCHESTRATOR] No suitable agents available for task');
        context.type = 'NO_AGENTS_AVAILABLE';
      }

      logger.info(`🎯 [ORCHESTRATOR] Selected agents: ${selectedAgents.join(', ')} for task type: ${context.type}`);
      logger.info(`📊 [ORCHESTRATOR] Available agents: ${availableAgents.join(', ')}`);

      return {
        selectedAgents,
        context,
        type: context.type,
        complexity: context.complexity,
        availableAgents
      };

    } catch (error) {
      logger.error('❌ [ORCHESTRATOR] Error analyzing task:', error);
      
      // Fallback to project manager if available
      const availableAgents = this.getAvailableAgents();
      const fallbackAgent = availableAgents.includes('projectManager') ? ['projectManager'] : [];
      
      return {
        selectedAgents: fallbackAgent,
        context: {
          userQuery,
          timestamp: new Date().toISOString(),
          complexity: 0.5,
          type: 'FALLBACK'
        },
        type: 'FALLBACK',
        complexity: 0.5,
        availableAgents
      };
    }
  }

  /**
   * Calculate task complexity (0-1 scale)
   */
  calculateComplexity(query) {
    let complexity = 0.3; // Base complexity

    // Increase complexity based on keywords
    const complexKeywords = [
      'microservices', 'distributed', 'scalable', 'enterprise',
      'real-time', 'streaming', 'authentication', 'security',
      'deployment', 'monitoring', 'testing', 'optimization'
    ];

    const simpleKeywords = [
      'simple', 'basic', 'quick', 'small', 'minimal'
    ];

    complexKeywords.forEach(keyword => {
      if (query.includes(keyword)) {
        complexity += 0.1;
      }
    });

    simpleKeywords.forEach(keyword => {
      if (query.includes(keyword)) {
        complexity -= 0.1;
      }
    });

    // Increase complexity based on query length
    if (query.length > 200) complexity += 0.1;
    if (query.length > 500) complexity += 0.1;

    return Math.max(0.1, Math.min(1.0, complexity));
  }

  /**
   * Execute a coordinated task with multiple agents
   */
  async executeCoordinatedTask(selectedAgents, userQuery, context) {
    const results = [];
    
    try {
      logger.info(`🚀 [ORCHESTRATOR] Executing coordinated task with ${selectedAgents.length} agents`);
      logger.info(`📋 [ORCHESTRATOR] Context passed to agents:`, {
        hasUserId: !!context.userId,
        hasProjectId: !!context.projectId,
        userId: context.userId,
        projectId: context.projectId
      });

      for (const agentName of selectedAgents) {
        const agent = this[agentName];
        
        if (!agent) {
          logger.warn(`⚠️ [ORCHESTRATOR] Agent ${agentName} not found or not initialized, skipping`);
          results.push({
            agent: agentName,
            error: 'Agent not available',
            status: 'skipped',
            timestamp: new Date().toISOString()
          });
          continue;
        }

        try {
          logger.info(`🤖 [ORCHESTRATOR] Executing ${agentName} with context:`, {
            userId: context.userId,
            projectId: context.projectId,
            hasStreaming: !!context.streamingEnabled
          });
          
          const result = await agent.execute(userQuery, context);
          results.push({
            agent: agentName,
            result: result,
            status: 'completed',
            timestamp: new Date().toISOString()
          });
          
          logger.info(`✅ [ORCHESTRATOR] ${agentName} completed successfully`);
        } catch (agentError) {
          logger.error(`❌ [ORCHESTRATOR] ${agentName} failed:`, agentError);
          results.push({
            agent: agentName,
            error: agentError.message,
            status: 'failed',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Check if any agents actually executed successfully
      const successfulResults = results.filter(r => r.status === 'completed');
      const success = successfulResults.length > 0;

      logger.info(`📊 [ORCHESTRATOR] Task execution summary: ${successfulResults.length}/${results.length} agents succeeded`);

      return {
        success: success,
        results: results,
        summary: this.generateSummary(results),
        metadata: {
          taskType: context.type,
          agentsUsed: selectedAgents,
          agentsSucceeded: successfulResults.length,
          agentsFailed: results.filter(r => r.status === 'failed').length,
          agentsSkipped: results.filter(r => r.status === 'skipped').length,
          complexity: context.complexity,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ [ORCHESTRATOR] Error in coordinated task execution:', error);
      throw error;
    }
  }

  /**
   * Generate a summary of all agent results
   */
  generateSummary(results) {
    const successful = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);

    let summary = `Task completed with ${successful.length} successful agents`;
    
    if (failed.length > 0) {
      summary += ` and ${failed.length} failed agents`;
    }

    if (successful.length > 0) {
      summary += '\n\nResults:\n';
      successful.forEach(result => {
        if (result.result && result.result.content) {
          summary += `\n${result.agent}: ${result.result.content.substring(0, 200)}...`;
        }
      });
    }

    return summary;
  }

  /**
   * Execute task with appropriate agent(s)
   */
  async executeTask(content, context) {
    const startTime = Date.now();
    
    try {
      // For simple tasks, use project manager
      if (context.complexity < 0.5) {
        logger.info('🎯 Executing simple task with ProjectManager');
        const result = await this.projectManager.handleTask(content, context);
        
        logger.info('⏱️ Simple task execution completed', {
          timeSpentMs: Date.now() - startTime,
          complexity: context.complexity
        });
        
        return result;
      }
      
      // For complex tasks, coordinate multiple agents
      logger.info('🎯 Executing complex task with multiple agents');
      
      // Execute agents in parallel where possible
      const [projectManagerResult, architectureResult] = await Promise.all([
        this.projectManager.handleTask(content, context),
        this.architectureDesigner.handleTask(content, context)
      ]);
      
      // Combine results
      const result = {
        ...projectManagerResult,
        architecture: architectureResult
      };
      
      logger.info('⏱️ Complex task execution completed', {
        timeSpentMs: Date.now() - startTime,
        complexity: context.complexity
      });
      
      return result;
    } catch (error) {
      logger.error('❌ Error in task execution:', {
        error: error.message,
        timeSpentMs: Date.now() - startTime
      });
      throw error;
    }
  }
}