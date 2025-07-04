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
      
      // Store the instance
      AgentOrchestrator.instance = this;
      
      logger.info('🎯 AgentOrchestrator initialized with singleton agents');
    }
    
    return AgentOrchestrator.instance;
  }

  /**
   * Analyze task and determine which agents to use
   */
  async analyzeTask(userQuery) {
    try {
      logger.info(`🔍 Analyzing task: ${userQuery.substring(0, 100)}...`);

      // Simple keyword-based analysis for now
      // In production, this would use CPU models for classification
      const query = userQuery.toLowerCase();
      const selectedAgents = [];
      const context = {
        userQuery,
        timestamp: new Date().toISOString(),
        complexity: this.calculateComplexity(query)
      };

      // Determine task type and required agents
      if (query.includes('architecture') || query.includes('system') || query.includes('design')) {
        selectedAgents.push('architectureDesigner');
        context.type = 'ARCHITECTURE_DESIGN';
      }

      if (query.includes('database') || query.includes('schema') || query.includes('data')) {
        selectedAgents.push('databaseDesigner');
        context.type = context.type ? 'FULL_STACK_DESIGN' : 'DATABASE_DESIGN';
      }

      if (query.includes('api') || query.includes('endpoint') || query.includes('rest')) {
        selectedAgents.push('apiDesigner');
        context.type = context.type ? 'FULL_STACK_DESIGN' : 'API_DESIGN';
      }

      if (query.includes('code') || query.includes('implement') || query.includes('generate')) {
        selectedAgents.push('codeGenerator');
        context.type = context.type ? 'FULL_STACK_DESIGN' : 'CODE_GENERATION';
      }

      if (query.includes('project') || query.includes('plan') || query.includes('manage')) {
        selectedAgents.push('projectManager');
        context.type = context.type ? 'FULL_STACK_DESIGN' : 'PROJECT_MANAGEMENT';
      }

      // Always include tech lead for complex tasks
      if (selectedAgents.length > 1) {
        selectedAgents.push('techLead');
      }

      // Default to project manager if no specific agents selected
      if (selectedAgents.length === 0) {
        selectedAgents.push('projectManager');
        context.type = 'GENERAL_INQUIRY';
      }

      logger.info(`🎯 Selected agents: ${selectedAgents.join(', ')} for task type: ${context.type}`);

      return {
        selectedAgents,
        context,
        type: context.type,
        complexity: context.complexity
      };

    } catch (error) {
      logger.error('❌ Error analyzing task:', error);
      
      // Fallback to project manager
      return {
        selectedAgents: ['projectManager'],
        context: {
          userQuery,
          timestamp: new Date().toISOString(),
          complexity: 0.5,
          type: 'FALLBACK'
        },
        type: 'FALLBACK',
        complexity: 0.5
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
      logger.info(`🚀 Executing coordinated task with ${selectedAgents.length} agents`);
      logger.info(`📋 Context passed to agents:`, {
        hasUserId: !!context.userId,
        hasProjectId: !!context.projectId,
        userId: context.userId,
        projectId: context.projectId
      });

      for (const agentName of selectedAgents) {
        const agent = this[agentName];
        
        if (!agent) {
          logger.warn(`⚠️ Agent ${agentName} not found, skipping`);
          continue;
        }

        try {
          logger.info(`🤖 Executing ${agentName} with context:`, {
            userId: context.userId,
            projectId: context.projectId,
            hasStreaming: !!context.streamingEnabled
          });
          
          const result = await agent.execute(userQuery, context);
          results.push({
            agent: agentName,
            result: result,
            timestamp: new Date().toISOString()
          });
          
          logger.info(`✅ ${agentName} completed successfully`);
        } catch (agentError) {
          logger.error(`❌ ${agentName} failed:`, agentError);
          results.push({
            agent: agentName,
            error: agentError.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      return {
        success: true,
        results: results,
        summary: this.generateSummary(results),
        metadata: {
          taskType: context.type,
          agentsUsed: selectedAgents,
          complexity: context.complexity,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ Error in coordinated task execution:', error);
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