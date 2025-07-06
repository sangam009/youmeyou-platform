import { config } from '../../config/index.js';
import logger from '../../utils/logger.js';
import { LLMAgent } from '../LLMAgent.js';
import { LLMDrivenTaskAnalyzer } from './LLMDrivenTaskAnalyzer.js';
import { ProjectManagerAgent } from './ProjectManagerAgent.js';
import { ArchitectureDesignerAgent } from './ArchitectureDesignerAgent.js';

// Import individual agents - fix imports to match actual exports
import DatabaseDesignerAgent from './DatabaseDesignerAgent.js';
import APIDesignerAgent from './APIDesignerAgent.js';
import CodeGeneratorAgent from './CodeGeneratorAgent.js';
import TechLeadAgent from './TechLeadAgent.js';

/**
 * Orchestrates multi-agent collaboration with optimized LLM usage
 */
export class AgentOrchestrator {
  static instance = null;
  static ANALYSIS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  static analysisCache = new Map();

  constructor() {
    if (AgentOrchestrator.instance) {
      return AgentOrchestrator.instance;
    }

    this.llmAgent = LLMAgent.getInstance();
    this.taskAnalyzer = new LLMDrivenTaskAnalyzer();
    this.projectManager = new ProjectManagerAgent();
    this.architectureDesigner = new ArchitectureDesignerAgent();
    
    // Initialize core agents only
    this.agents = {
      projectManager: this.projectManager,
      architectureDesigner: this.architectureDesigner
    };

    AgentOrchestrator.instance = this;
  }

  static getInstance() {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  /**
   * Get cached analysis
   */
  static getCachedAnalysis(prompt) {
    const cached = this.analysisCache.get(prompt);
    if (cached && Date.now() - cached.timestamp < this.ANALYSIS_CACHE_TTL) {
      logger.info('📦 Using cached task analysis:', {
        promptPreview: prompt.substring(0, 100),
        cacheAge: Math.round((Date.now() - cached.timestamp) / 1000) + 's'
      });
      return cached.analysis;
    }
    return null;
  }

  /**
   * Cache task analysis
   */
  static cacheAnalysis(prompt, analysis) {
    this.analysisCache.set(prompt, {
      analysis,
      timestamp: Date.now()
    });
  }

  /**
   * Execute task with optimized agent collaboration
   */
  async executeTask(prompt, context = {}) {
    try {
      // Check analysis cache first
      let analysis = AgentOrchestrator.getCachedAnalysis(prompt);
      
      if (!analysis) {
        analysis = await this.taskAnalyzer.analyzeTask(prompt);
        AgentOrchestrator.cacheAnalysis(prompt, analysis);
      }

      const { complexity, taskType } = analysis;
      
      logger.info('🎯 Task analysis complete:', {
        complexity,
        taskType,
        hasContext: !!context
      });

      // For simple tasks, use single agent with batched LLM calls
      if (complexity < 0.5) {
        return this.executeSimpleTask(prompt, analysis, context);
      }

      // For complex tasks, use coordinated execution with shared context
      return this.executeCoordinatedTask(prompt, analysis, context);
    } catch (error) {
      logger.error('❌ Task execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute simple task with single agent
   */
  async executeSimpleTask(prompt, analysis, context) {
    const agent = this.selectAgentForTask(analysis);
    
    if (!agent) {
      throw new Error('No suitable agent found for task');
    }

    logger.info('🤖 Executing simple task with agent:', {
      agentType: agent.constructor.name,
      complexity: analysis.complexity
    });

    return agent.execute(prompt, context);
  }

  /**
   * Execute complex task with coordinated agents
   */
  async executeCoordinatedTask(prompt, analysis, context) {
    const agentSelection = await this.selectAgentsForTask(prompt, analysis);
    
    if (!agentSelection || !agentSelection.selectedAgents || agentSelection.selectedAgents.length === 0) {
      logger.warn('⚠️ No agents selected, falling back to project manager');
      agentSelection = {
        selectedAgents: ['projectManager'],
        routingStrategy: 'simple',
        conversationStyle: 'professional'
      };
    }

    logger.info('🤖 Executing complex task with agents:', {
      agentCount: agentSelection.selectedAgents.length,
      agentTypes: agentSelection.selectedAgents,
      complexity: analysis.complexity
    });

    // Create shared context for all agents
    const sharedContext = {
      ...context,
      taskAnalysis: analysis,
      collaboratingAgents: agentSelection.selectedAgents,
      routingStrategy: agentSelection.routingStrategy,
      conversationStyle: agentSelection.conversationStyle
    };

    // Map agent names to actual agent instances
    const agentInstances = agentSelection.selectedAgents
      .map(agentName => this.agents[agentName])
      .filter(agent => agent); // Filter out any undefined agents

    if (agentInstances.length === 0) {
      logger.warn('⚠️ No valid agent instances found, falling back to project manager');
      agentInstances.push(this.agents.projectManager);
    }

    // Execute in parallel with shared context
    const results = await Promise.all(
      agentInstances.map(agent => agent.execute(prompt, sharedContext))
    );

    // Combine results
    return this.combineResults(results, analysis);
  }

  /**
   * Select single agent for task
   */
  selectAgentForTask(analysis) {
    const { taskType, requiredSkills = [] } = analysis;

    if (requiredSkills.includes('architecture')) {
      return this.architectureDesigner;
    }

    return this.projectManager; // Default to project manager
  }

  /**
   * INTELLIGENT agent selection using Intent Classification and CPU Models
   */
  async selectAgentsForTask(userQuery, analysis = {}) {
    try {
      logger.info('🤖 Starting intelligent agent selection for:', userQuery.substring(0, 100) + '...');

      // Use DistilBERT for agent selection
      const { DistilBERTComplexityAnalyzer } = await import('../cpuModels/DistilBERTComplexityAnalyzer.js');
      const analyzer = new DistilBERTComplexityAnalyzer();
      
      // Analyze task requirements and select agents
      const agentSelectionPrompt = `Analyze this task and determine which specialized agents are needed: "${userQuery}"`;
      const agentAnalysis = await analyzer.analyzeComplexity(agentSelectionPrompt);
      
      // Get recommended agents with confidence scores
      const selectedAgents = agentAnalysis.recommendedAgents || ['projectManager'];
      
      logger.info('✅ CPU-based agent selection completed:', {
        selectedAgents,
        confidence: agentAnalysis.confidence,
        complexity: agentAnalysis.complexity
      });

      // Return both agents and metadata for intelligent routing
      return {
        selectedAgents,
        agentAnalysis,
        routingStrategy: agentAnalysis.complexity > 0.7 ? 'coordinated' : 'simple',
        recommendedModel: this.selectOptimalModel(agentAnalysis),
        conversationStyle: 'professional'
      };

    } catch (error) {
      logger.error('❌ Intelligent agent selection failed, using fallback:', error);
      return this.fallbackAgentSelection(analysis);
    }
  }

  /**
   * Select optimal model based on task analysis
   */
  selectOptimalModel(analysis) {
    if (analysis.complexity > 0.8) {
      return 'llm'; // Use main LLM for complex tasks
    }
    
    if (analysis.technicalDomains?.includes('code')) {
      return 'codebert';
    }
    
    return analysis.complexity > 0.5 ? 'llm' : 'distilbert';
  }

  /**
   * Fallback agent selection
   */
  fallbackAgentSelection(analysis) {
    return {
      selectedAgents: ['projectManager'],
      agentAnalysis: {
        complexity: 0.5,
        confidence: 0.3,
        source: 'fallback'
      },
      routingStrategy: 'simple',
      recommendedModel: 'llm',
      conversationStyle: 'professional'
    };
  }

  /**
   * Combine results from multiple agents
   */
  combineResults(results, analysis) {
    return {
      type: 'multi_agent_response',
      results,
      analysis,
      timestamp: new Date().toISOString()
    };
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
}