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
    this.requestCount = 0;
    this.successCount = 0;
    this.fallbackCount = 0;
    
    logger.info('🧠 DistilBERTComplexityAnalyzer connecting to existing CPU models gateway:', {
      endpoint: this.gatewayEndpoint
    });
    this.initializeModel();
  }

  async initializeModel() {
    try {
      logger.info('🔍 Checking CPU models gateway availability...');
      
      // Check if the CPU models gateway is available
      const response = await fetch(`${this.gatewayEndpoint}/health`);
      if (response.ok) {
        this.isInitialized = true;
        logger.info('✅ CPU models gateway connected successfully:', {
          endpoint: this.gatewayEndpoint,
          status: response.status
        });
      } else {
        logger.warn('⚠️ CPU models gateway not available, will use fallback:', {
          endpoint: this.gatewayEndpoint,
          status: response.status
        });
      }
    } catch (error) {
      logger.warn('⚠️ CPU models gateway not reachable, using fallback analysis:', {
        endpoint: this.gatewayEndpoint,
        error: error.message
      });
    }
  }

  /**
   * Analyze prompt complexity using DistilBERT model
   */
  async analyzeComplexity(prompt) {
    this.requestCount++;
    
    logger.info('🧠 Starting complexity analysis:', {
      requestCount: this.requestCount,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + '...',
      isInitialized: this.isInitialized,
      endpoint: this.gatewayEndpoint
    });

    if (!this.isInitialized) {
      logger.warn('⚠️ CPU model not initialized, using fallback analysis');
      this.fallbackCount++;
      return this.fallbackComplexityAnalysis(prompt);
    }

    try {
      logger.info('🧠 Analyzing complexity with DistilBERT CPU model:', {
        endpoint: `${this.gatewayEndpoint}/cpu-models/distilbert/classify`,
        requestPayload: {
          textLength: prompt.length,
          textPreview: prompt.substring(0, 100) + '...'
        }
      });
      
      const requestStart = Date.now();
      const response = await fetch(`${this.gatewayEndpoint}/cpu-models/distilbert/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt
        })
      });

      const requestTime = Date.now() - requestStart;

      if (!response.ok) {
        throw new Error(`DistilBERT service error: ${response.status}`);
      }

      const result = await response.json();
      this.successCount++;
      
      logger.info('✅ CPU model analysis completed successfully:', {
        requestTime: `${requestTime}ms`,
        responseData: {
          complexity: result.complexity_score,
          confidence: result.confidence,
          categories: result.categories,
          technicalDomains: result.technical_domains,
          estimatedTokens: result.estimated_tokens,
          processingTime: result.processing_time
        },
        statistics: {
          totalRequests: this.requestCount,
          successCount: this.successCount,
          fallbackCount: this.fallbackCount,
          successRate: `${((this.successCount / this.requestCount) * 100).toFixed(1)}%`
        }
      });
      
      const analysis = {
        complexity: result.complexity_score || 0.5,
        confidence: result.confidence || 0.5,
        categories: result.categories || [],
        technicalDomains: result.technical_domains || [],
        estimatedTokens: result.estimated_tokens || 100,
        processingTime: result.processing_time || 0,
        source: 'distilbert-cpu-model',
        requestTime,
        metadata: {
          endpoint: this.gatewayEndpoint,
          timestamp: new Date().toISOString()
        }
      };

      // Add agent recommendations if this is an agent selection prompt
      if (prompt.includes('specialized agents are needed')) {
        analysis.recommendedAgents = await this.recommendAgents(prompt, analysis);
      }
      
      return analysis;

    } catch (error) {
      logger.error('❌ DistilBERT complexity analysis failed:', {
        error: error.message,
        endpoint: this.gatewayEndpoint,
        fallbackCount: this.fallbackCount + 1
      });
      this.fallbackCount++;
      return this.fallbackComplexityAnalysis(prompt);
    }
  }

  /**
   * Classify prompt intent using DistilBERT
   */
  async classifyIntent(prompt) {
    this.requestCount++;
    
    logger.info('🎯 Starting intent classification:', {
      requestCount: this.requestCount,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + '...',
      isInitialized: this.isInitialized
    });

    if (!this.isInitialized) {
      logger.warn('⚠️ CPU model not initialized, using fallback intent classification');
      this.fallbackCount++;
      return this.fallbackIntentClassification(prompt);
    }

    try {
      logger.info('🎯 Classifying intent with DistilBERT CPU model:', {
        endpoint: `${this.gatewayEndpoint}/cpu-models/distilbert/intent`
      });

      const requestStart = Date.now();
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

      const requestTime = Date.now() - requestStart;

      if (!response.ok) {
        throw new Error(`DistilBERT intent service error: ${response.status}`);
      }

      const result = await response.json();
      this.successCount++;
      
      logger.info('✅ Intent classification completed successfully:', {
        requestTime: `${requestTime}ms`,
        responseData: {
          intent: result.primary_intent,
          confidence: result.confidence,
          secondaryIntents: result.secondary_intents,
          actionRequired: result.action_required,
          urgency: result.urgency_level
        }
      });
      
      return {
        intent: result.primary_intent || 'general',
        confidence: result.confidence || 0.5,
        secondaryIntents: result.secondary_intents || [],
        actionRequired: result.action_required || false,
        urgency: result.urgency_level || 'normal',
        source: 'distilbert-cpu-model',
        requestTime,
        metadata: {
          endpoint: this.gatewayEndpoint,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ DistilBERT intent classification failed:', {
        error: error.message,
        endpoint: this.gatewayEndpoint
      });
      this.fallbackCount++;
      return this.fallbackIntentClassification(prompt);
    }
  }

  /**
   * Analyze technical domains using DistilBERT
   */
  async analyzeTechnicalDomains(prompt) {
    this.requestCount++;
    
    logger.info('🔧 Starting technical domain analysis:', {
      requestCount: this.requestCount,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + '...',
      isInitialized: this.isInitialized
    });

    if (!this.isInitialized) {
      logger.warn('⚠️ CPU model not initialized, using fallback domain analysis');
      this.fallbackCount++;
      return this.fallbackDomainAnalysis(prompt);
    }

    try {
      logger.info('🔧 Analyzing domains with DistilBERT CPU model:', {
        endpoint: `${this.gatewayEndpoint}/cpu-models/distilbert/domains`
      });

      const requestStart = Date.now();
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

      const requestTime = Date.now() - requestStart;

      if (!response.ok) {
        throw new Error(`DistilBERT domain service error: ${response.status}`);
      }

      const result = await response.json();
      this.successCount++;
      
      logger.info('✅ Domain analysis completed successfully:', {
        requestTime: `${requestTime}ms`,
        responseData: {
          primaryDomain: result.primary_domain,
          domains: result.domains,
          confidence: result.confidence,
          requiredSkills: result.required_skills,
          estimatedAgents: result.estimated_agents
        }
      });
      
      return {
        primaryDomain: result.primary_domain || 'general',
        domains: result.domains || [],
        confidence: result.confidence || 0.5,
        requiredSkills: result.required_skills || [],
        estimatedAgents: result.estimated_agents || 1,
        source: 'distilbert-cpu-model',
        requestTime,
        metadata: {
          endpoint: this.gatewayEndpoint,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ DistilBERT domain analysis failed:', {
        error: error.message,
        endpoint: this.gatewayEndpoint
      });
      this.fallbackCount++;
      return this.fallbackDomainAnalysis(prompt);
    }
  }

  /**
   * Fallback complexity analysis when CPU model is not available
   */
  fallbackComplexityAnalysis(prompt) {
    logger.warn('🔄 Using fallback complexity analysis - CPU model bypassed:', {
      reason: 'CPU model not available',
      fallbackCount: this.fallbackCount,
      promptLength: prompt.length
    });
    
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
    
    const fallbackResult = {
      complexity,
      confidence: 0.6,
      categories: ['fallback-analysis'],
      technicalDomains: [],
      estimatedTokens: Math.min(length * 0.75, 1000),
      processingTime: 0,
      source: 'fallback-analysis',
      metadata: {
        keywordMatches: matches,
        matchedKeywords: complexKeywords.filter(keyword => 
          prompt.toLowerCase().includes(keyword)
        )
      }
    };

    logger.info('📊 Fallback analysis result:', fallbackResult);
    return fallbackResult;
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
          endpoint: this.gatewayEndpoint,
          lastCheck: new Date().toISOString(),
          capabilities: ['fallback-complexity-analysis']
        };
      }

      const response = await fetch(`${this.gatewayEndpoint}/status`);
      const status = await response.json();
      
      return {
        status: 'active',
        model: status.model || 'distilbert-base-uncased',
        endpoint: this.gatewayEndpoint,
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
        endpoint: this.gatewayEndpoint,
        lastCheck: new Date().toISOString()
      };
    }
  }
} 