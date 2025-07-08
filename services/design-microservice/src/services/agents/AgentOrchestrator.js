import { config } from '../../config/index.js';
import logger from '../../utils/logger.js';
import { LLMAgent } from '../LLMAgent.js';
import { LLMDrivenTaskAnalyzer } from './LLMDrivenTaskAnalyzer.js';
import { ProjectManagerAgent } from './ProjectManagerAgent.js';
import { ArchitectureDesignerAgent } from './ArchitectureDesignerAgent.js';
import { CasualConversationAgent } from './CasualConversationAgent.js';

// Gemini API key configuration
const GEMINI_KEYS = {
  KEY1: process.env.GEMINI_API_KEY, // Primary key
  KEY2: 'AIzaSyDZCyoI4FFZPnsM7aysk5EIRuJsuN4F0Fs' // Secondary key
};

// Agent-specific key mapping
const AGENT_KEY_MAP = {
  'projectManager': 'KEY1',
  'architectureDesigner': 'KEY2',
  'casualConversation': 'KEY1' // Use primary key for casual conversations
};

/**
 * Orchestrates streamlined agent collaboration with optimized LLM usage
 */
export class AgentOrchestrator {
  static instance = null;
  static ANALYSIS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  static analysisCache = new Map();
  static ANALYSIS_THRESHOLD = 0.8;

  constructor() {
    if (AgentOrchestrator.instance) {
      return AgentOrchestrator.instance;
    }

    // Initialize core agents with specific Gemini keys
    this.projectManager = new ProjectManagerAgent(GEMINI_KEYS[AGENT_KEY_MAP['projectManager']]);
    this.architectureDesigner = new ArchitectureDesignerAgent(GEMINI_KEYS[AGENT_KEY_MAP['architectureDesigner']]);
    this.casualConversation = new CasualConversationAgent(GEMINI_KEYS[AGENT_KEY_MAP['casualConversation']]);

    // Initialize task analyzer with primary key
    this.llmAgent = LLMAgent.getInstance(GEMINI_KEYS.KEY1);
    this.taskAnalyzer = new LLMDrivenTaskAnalyzer();

    // Core agent mapping
    this.agents = {
      projectManager: this.projectManager,
      architectureDesigner: this.architectureDesigner,
      casualConversation: this.casualConversation
    };

    AgentOrchestrator.instance = this;
    logger.info('🎯 AgentOrchestrator initialized with core agents and multi-key strategy');
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
    try {
      // Use the agents already selected during analysis
      let selectedAgents = analysis.selectedAgents || [];
      
      // Fallback to project manager if no agents were selected
      if (!selectedAgents || selectedAgents.length === 0) {
        logger.warn('⚠️ No agents selected in analysis, falling back to project manager');
        selectedAgents = ['projectManager'];
      }

      logger.info('🤖 Executing complex task with pre-selected agents:', {
        agentCount: selectedAgents.length,
        agentTypes: selectedAgents,
        complexity: analysis.complexity
      });

      // Create shared context for all agents
      const sharedContext = {
        ...context,
        taskAnalysis: analysis,
        collaboratingAgents: selectedAgents,
        routingStrategy: analysis.complexity > 0.7 ? 'coordinated' : 'simple',
        conversationStyle: 'professional'
      };

      // Map agent names to actual agent instances
      const agentInstances = selectedAgents
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
      
    } catch (error) {
      logger.error('❌ Coordinated task execution failed:', error);
      // Fallback to project manager on error
      return this.agents.projectManager.execute(prompt, {
        ...context,
        error: error.message,
        fallback: true
      });
    }
  }

  /**
   * Select single agent for task
   */
  selectAgentForTask(analysis) {
    const { taskType, primaryIntent, requiredSkills = [] } = analysis;

    // For casual conversations, use the dedicated agent
    if (primaryIntent === 'casual_conversation') {
      logger.info('👋 Selected CasualConversationAgent for casual chat');
      return this.casualConversation;
    }

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

      // Check for casual conversation first
      if (analysis.primaryIntent === 'casual_conversation') {
        logger.info('👋 Selected CasualConversationAgent for casual chat:', {
          intent: 'casual_conversation',
          confidence: analysis.confidence || 0.6
        });
        
        return {
          selectedAgents: ['casualConversation'],
          agentAnalysis: {
            ...analysis,
            complexity: 0.3,
            confidence: analysis.confidence || 0.6,
            source: 'intent-classification'
          },
          routingStrategy: 'simple',
          recommendedModel: 'distilbert',
          conversationStyle: 'friendly'
        };
      }

      // If we already have recommended agents from enhanced analysis, use them
      if (analysis.recommendedAgents && analysis.recommendedAgents.length > 0) {
        logger.info('✅ Using pre-analyzed agent recommendations:', {
          agents: analysis.recommendedAgents,
          source: 'enhanced-analysis'
        });
        
        return {
          selectedAgents: analysis.recommendedAgents,
          agentAnalysis: analysis,
          routingStrategy: analysis.complexity > 0.7 ? 'coordinated' : 'simple',
          recommendedModel: this.selectOptimalModel(analysis),
          conversationStyle: 'professional'
        };
      }

      // Use DistilBERT for agent selection if no recommendations exist
      const { DistilBERTComplexityAnalyzer } = await import('../cpuModels/DistilBERTComplexityAnalyzer.js');
      const analyzer = new DistilBERTComplexityAnalyzer();
      
      // Generate agent selection prompt using DynamicPromptGenerationService
      const { DynamicPromptGenerationService } = await import('../DynamicPromptGenerationService.js');
      const promptGenerator = new DynamicPromptGenerationService();
      
      const agentSelectionPrompt = await promptGenerator.generatePrompt('agent_selection', {
        userQuery,
        taskAnalysis: analysis,
        availableAgents: this.getAvailableAgents()
      });
      
      // Analyze with DistilBERT
      const agentAnalysis = await analyzer.analyzeComplexity(agentSelectionPrompt);

      // Check for casual conversation again based on DistilBERT analysis
      if (agentAnalysis.type === 'conversation' || agentAnalysis.complexity < 0.3 || this.hasCasualIndicators(userQuery)) {
        logger.info('👋 Selected CasualConversationAgent based on analysis:', {
          type: agentAnalysis.type,
          complexity: agentAnalysis.complexity,
          hasCasualIndicators: this.hasCasualIndicators(userQuery)
        });
        
        return {
          selectedAgents: ['casualConversation'],
          agentAnalysis: {
            ...agentAnalysis,
            complexity: 0.3,
            confidence: 0.6,
            source: 'distilbert-analysis'
          },
          routingStrategy: 'simple',
          recommendedModel: 'distilbert',
          conversationStyle: 'friendly'
        };
      }
      
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
    // Check for casual conversation even in fallback
    if (analysis.primaryIntent === 'casual_conversation' || this.hasCasualIndicators(analysis.userQuery || '')) {
      return {
        selectedAgents: ['casualConversation'],
        agentAnalysis: {
          complexity: 0.3,
          confidence: 0.4,
          source: 'fallback-casual'
        },
        routingStrategy: 'simple',
        recommendedModel: 'distilbert',
        conversationStyle: 'friendly'
      };
    }

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
   * Get available agents with their capabilities
   */
  getAvailableAgents() {
    return {
      projectManager: {
        skills: ['project planning', 'task breakdown', 'coordination', 'general problem solving'],
        description: 'Handles overall project management and task coordination'
      },
      architectureDesigner: {
        skills: ['system design', 'architecture planning', 'scalability analysis', 'technical decision making'],
        description: 'Specializes in system architecture and technical design decisions'
      },
      casualConversation: {
        skills: ['user interaction', 'requirement gathering', 'general assistance'],
        description: 'Handles casual conversations and initial requirement gathering'
      }
    };
  }

  /**
   * Detect if query is a casual conversation
   */
  async detectConversationType(query) {
    // Use DistilBERT for quick classification
    const { DistilBERTComplexityAnalyzer } = await import('../cpuModels/DistilBERTComplexityAnalyzer.js');
    const analyzer = new DistilBERTComplexityAnalyzer();
    
    const classification = await analyzer.analyzeComplexity(query);
    
    // Check if this is a casual conversation
    const isCasual = classification.type === 'conversation' || 
                    classification.complexity < 0.3 ||
                    this.hasCasualIndicators(query);

    return {
      isCasual,
      classification
    };
  }

  /**
   * Check for casual conversation indicators
   */
  hasCasualIndicators(query) {
    const casualIndicators = [
      'hello',
      'hi',
      'hey',
      'how are you',
      'what\'s up',
      'good morning',
      'good afternoon',
      'good evening',
      'thanks',
      'thank you',
      'bye',
      'goodbye',
      'chat',
      'talk'
    ];

    const normalizedQuery = query.toLowerCase();
    return casualIndicators.some(indicator => normalizedQuery.includes(indicator)) ||
           // Check for questions about the agent itself
           normalizedQuery.includes('who are you') ||
           normalizedQuery.includes('what can you do') ||
           normalizedQuery.includes('tell me about yourself');
  }

  /**
   * Analyze task and determine which core agent to use
   */
  async analyzeTask(userQuery) {
    try {
      logger.info(`🔍 [ORCHESTRATOR] Analyzing task: ${userQuery.substring(0, 100)}...`);

      // First, detect if this is a casual conversation
      const { isCasual, classification } = await this.detectConversationType(userQuery);
      
      if (isCasual) {
        logger.info('👋 [ORCHESTRATOR] Detected casual conversation');
        return {
          selectedAgents: ['casualConversation'],
          context: {
            userQuery,
            timestamp: new Date().toISOString(),
            complexity: classification.complexity,
            type: 'CASUAL_CONVERSATION'
          },
          type: 'CASUAL_CONVERSATION',
          complexity: classification.complexity
        };
      }

      const query = userQuery.toLowerCase();
      const selectedAgents = [];
      const context = {
        userQuery,
        timestamp: new Date().toISOString(),
        complexity: classification.complexity
      };

      // Technical design tasks (architecture, API, database, code)
      if (query.includes('architecture') || 
          query.includes('system') || 
          query.includes('design') ||
          query.includes('database') ||
          query.includes('api') ||
          query.includes('code')) {
        selectedAgents.push('architectureDesigner');
        context.type = 'TECHNICAL_DESIGN';
      }

      // Project management tasks
      if (query.includes('project') || 
          query.includes('plan') || 
          query.includes('manage') ||
          selectedAgents.length === 0) { // Default to project manager
        selectedAgents.push('projectManager');
        context.type = selectedAgents.length > 1 ? 'FULL_PROJECT_DESIGN' : 'PROJECT_MANAGEMENT';
      }

      logger.info(`🎯 [ORCHESTRATOR] Selected agents: ${selectedAgents.join(', ')} for task type: ${context.type}`);

      return {
        selectedAgents,
        context,
        type: context.type,
        complexity: context.complexity
      };

    } catch (error) {
      logger.error('❌ [ORCHESTRATOR] Error analyzing task:', error);
      return {
        selectedAgents: ['projectManager'], // Fallback to project manager
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