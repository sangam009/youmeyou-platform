import logger from '../../utils/logger.js';

/**
 * DistilBERT-based Complexity Analyzer
 * Uses AI model to analyze prompt complexity instead of static keywords
 */
export class DistilBERTComplexityAnalyzer {
  constructor() {
    // Use the existing CPU models gateway that's already deployed
    this.gatewayEndpoint = process.env.CPU_MODELS_GATEWAY || 'http://cpu-models-gateway-prod:8000';
    this.isInitialized = false;
    
    logger.info('🧠 DistilBERTComplexityAnalyzer connecting to existing CPU models gateway');
    this.initializeModel();
  }

  async initializeModel() {
    try {
      // Check if the CPU models gateway is available
      const response = await fetch(`${this.gatewayEndpoint}/health`);
      if (response.ok) {
        this.isInitialized = true;
        logger.info('✅ CPU models gateway connected successfully');
      } else {
        logger.warn('⚠️ CPU models gateway not available, will use fallback');
      }
    } catch (error) {
      logger.warn('⚠️ CPU models gateway not reachable, using fallback analysis');
    }
  }

  /**
   * Analyze prompt complexity using DistilBERT model
   */
  async analyzeComplexity(prompt) {
    if (!this.isInitialized) {
      logger.info('🔄 Using fallback complexity analysis');
      return this.fallbackComplexityAnalysis(prompt);
    }

    try {
      logger.info('🧠 Analyzing complexity with DistilBERT CPU model');
      
      const response = await fetch(`${this.gatewayEndpoint}/cpu-models/distilbert/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt
        })
      });

      if (!response.ok) {
        throw new Error(`DistilBERT service error: ${response.status}`);
      }

      const result = await response.json();
      
      const analysis = {
        complexity: result.complexity_score || 0.5,
        confidence: result.confidence || 0.5,
        categories: result.categories || [],
        technicalDomains: result.technical_domains || [],
        estimatedTokens: result.estimated_tokens || 100,
        processingTime: result.processing_time || 0,
        source: 'distilbert-cpu-model'
      };

      // Add agent recommendations if this is an agent selection prompt
      if (prompt.includes('specialized agents are needed')) {
        analysis.recommendedAgents = await this.recommendAgents(prompt, analysis);
      }
      
      return analysis;

    } catch (error) {
      logger.error('❌ DistilBERT complexity analysis failed:', error);
      return this.fallbackComplexityAnalysis(prompt);
    }
  }

  /**
   * Classify prompt intent using DistilBERT
   */
  async classifyIntent(prompt) {
    if (!this.isInitialized) {
      return this.fallbackIntentClassification(prompt);
    }

    try {
      const response = await fetch(`${this.gatewayEndpoint}/cpu-models/distilbert/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt,
          classification_type: 'intent_detection'
        })
      });

      const result = await response.json();
      
      return {
        intent: result.primary_intent || 'general',
        confidence: result.confidence || 0.5,
        secondaryIntents: result.secondary_intents || [],
        actionRequired: result.action_required || false,
        urgency: result.urgency_level || 'normal',
        source: 'distilbert-cpu-model'
      };

    } catch (error) {
      logger.error('❌ DistilBERT intent classification failed:', error);
      return this.fallbackIntentClassification(prompt);
    }
  }

  /**
   * Analyze technical domains using DistilBERT
   */
  async analyzeTechnicalDomains(prompt) {
    if (!this.isInitialized) {
      return this.fallbackDomainAnalysis(prompt);
    }

    try {
      const response = await fetch(`${this.gatewayEndpoint}/cpu-models/distilbert/domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt,
          analysis_type: 'domain_classification'
        })
      });

      const result = await response.json();
      
      return {
        primaryDomain: result.primary_domain || 'general',
        domains: result.domains || [],
        confidence: result.confidence || 0.5,
        requiredSkills: result.required_skills || [],
        estimatedAgents: result.estimated_agents || 1,
        source: 'distilbert-cpu-model'
      };

    } catch (error) {
      logger.error('❌ DistilBERT domain analysis failed:', error);
      return this.fallbackDomainAnalysis(prompt);
    }
  }

  /**
   * Fallback complexity analysis when CPU model is not available
   */
  fallbackComplexityAnalysis(prompt) {
    logger.info('🔄 Using fallback complexity analysis');
    
    const length = prompt.length;
    let complexity = 0.3;
    
    // Basic heuristics as fallback
    if (length > 200) complexity += 0.1;
    if (length > 500) complexity += 0.1;
    
    const complexKeywords = [
      'architecture', 'microservices', 'distributed', 'scalable',
      'database', 'api', 'security', 'authentication'
    ];
    
    const matches = complexKeywords.filter(keyword => 
      prompt.toLowerCase().includes(keyword)
    ).length;
    
    complexity += matches * 0.05;
    complexity = Math.min(complexity, 1.0);
    
    return {
      complexity,
      confidence: 0.6,
      categories: ['fallback-analysis'],
      technicalDomains: [],
      estimatedTokens: Math.min(length * 0.75, 1000),
      processingTime: 0,
      source: 'fallback-analysis'
    };
  }

  /**
   * Fallback intent classification
   */
  fallbackIntentClassification(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    let intent = 'general';
    if (lowerPrompt.includes('build') || lowerPrompt.includes('create')) {
      intent = 'creation';
    } else if (lowerPrompt.includes('analyze') || lowerPrompt.includes('review')) {
      intent = 'analysis';
    } else if (lowerPrompt.includes('fix') || lowerPrompt.includes('debug')) {
      intent = 'debugging';
    }
    
    return {
      intent,
      confidence: 0.5,
      secondaryIntents: [],
      actionRequired: intent !== 'general',
      urgency: 'normal',
      source: 'fallback-analysis'
    };
  }

  /**
   * Fallback domain analysis
   */
  fallbackDomainAnalysis(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const domains = [];
    
    if (lowerPrompt.includes('frontend') || lowerPrompt.includes('ui')) domains.push('frontend');
    if (lowerPrompt.includes('backend') || lowerPrompt.includes('api')) domains.push('backend');
    if (lowerPrompt.includes('database') || lowerPrompt.includes('data')) domains.push('database');
    if (lowerPrompt.includes('architecture') || lowerPrompt.includes('system')) domains.push('architecture');
    
    return {
      primaryDomain: domains[0] || 'general',
      domains,
      confidence: 0.5,
      requiredSkills: domains,
      estimatedAgents: Math.max(1, domains.length),
      source: 'fallback-analysis'
    };
  }

  /**
   * Recommend agents based on prompt analysis
   */
  async recommendAgents(prompt, analysis) {
    try {
      logger.info('🤖 Recommending agents based on CPU model analysis');
      
      // Extract the actual task from the agent selection prompt
      const taskMatch = prompt.match(/Analyze this task and determine which specialized agents are needed: "([^"]+)"/);
      const actualTask = taskMatch ? taskMatch[1] : prompt;
      
      const agents = [];
      const lowerTask = actualTask.toLowerCase();
      
      // Use CPU model analysis to intelligently select agents
      if (lowerTask.includes('project') || lowerTask.includes('plan') || lowerTask.includes('manage') || lowerTask.includes('coordinate')) {
        agents.push('projectManager');
      }
      
      if (lowerTask.includes('architecture') || lowerTask.includes('system') || lowerTask.includes('design pattern') || lowerTask.includes('scalable')) {
        agents.push('architectureDesigner');
      }
      
      if (lowerTask.includes('database') || lowerTask.includes('schema') || lowerTask.includes('data model') || lowerTask.includes('sql')) {
        agents.push('databaseDesigner');
      }
      
      if (lowerTask.includes('api') || lowerTask.includes('endpoint') || lowerTask.includes('rest') || lowerTask.includes('integration')) {
        agents.push('apiDesigner');
      }
      
      if (lowerTask.includes('code') || lowerTask.includes('implement') || lowerTask.includes('program') || lowerTask.includes('develop')) {
        agents.push('codeGenerator');
      }
      
      if (lowerTask.includes('review') || lowerTask.includes('standards') || lowerTask.includes('best practices') || agents.length > 2) {
        agents.push('techLead');
      }
      
      // Ensure we have at least one agent
      if (agents.length === 0) {
        agents.push('projectManager');
      }
      
      // Remove duplicates and limit to 4 agents max
      const uniqueAgents = [...new Set(agents)].slice(0, 4);
      
      logger.info('✅ CPU model recommended agents:', uniqueAgents);
      return uniqueAgents;
      
    } catch (error) {
      logger.error('❌ Error in agent recommendation:', error);
      return ['projectManager']; // Fallback
    }
  }

  /**
   * Get model status and health
   */
  async getStatus() {
    try {
      if (!this.isInitialized) {
        return {
          status: 'fallback',
          model: 'distilbert-base-uncased',
          endpoint: this.modelEndpoint,
          lastCheck: new Date().toISOString(),
          capabilities: ['fallback-complexity-analysis']
        };
      }

      const response = await fetch(`${this.modelEndpoint}/status`);
      const status = await response.json();
      
      return {
        status: 'active',
        model: status.model || 'distilbert-base-uncased',
        endpoint: this.modelEndpoint,
        lastCheck: new Date().toISOString(),
        capabilities: [
          'complexity-analysis',
          'intent-classification',
          'domain-analysis'
        ],
        performance: status.performance || {}
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        endpoint: this.modelEndpoint,
        lastCheck: new Date().toISOString()
      };
    }
  }
} 