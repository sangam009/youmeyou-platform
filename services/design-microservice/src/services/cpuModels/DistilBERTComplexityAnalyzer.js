import logger from '../../utils/logger.js';
import { apiMonitor } from '../../utils/apiMonitor.js';

/**
 * DistilBERT-based Complexity Analyzer
 * Uses AI model to analyze prompt complexity instead of static keywords
 */
export class DistilBERTComplexityAnalyzer {
  constructor() {
    // Use the existing CPU models gateway that's already deployed
    this.gatewayEndpoint = process.env.CPU_MODELS_GATEWAY || 'http://cpu-models-gateway-prod:7000';
    this.isInitialized = false;
    this.requestCount = 0;
    this.successCount = 0;
    this.fallbackCount = 0;
    this.initRetries = 0;
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
    
    logger.info('🧠 DistilBERTComplexityAnalyzer connecting to CPU models gateway:', {
      endpoint: this.gatewayEndpoint
    });
    this.initializeModel();
  }

  async initializeModel() {
    while (this.initRetries < this.maxRetries) {
      try {
        logger.info('🔍 Checking CPU models gateway availability:', {
          attempt: this.initRetries + 1,
          maxRetries: this.maxRetries
        });
        
        // Check if the CPU models gateway is available
        const response = await fetch(`${this.gatewayEndpoint}/health`);
        if (response.ok) {
          const status = await response.json();
          
          // Verify DistilBERT service is available
          if (status.services?.distilbert?.status === 'healthy') {
            this.isInitialized = true;
            logger.info('✅ CPU models gateway connected successfully:', {
              endpoint: this.gatewayEndpoint,
              status: response.status,
              services: status.services
            });
            return;
          } else {
            throw new Error('DistilBERT service not healthy');
          }
        } else {
          throw new Error(`Gateway returned status ${response.status}`);
        }
      } catch (error) {
        this.initRetries++;
        logger.warn('⚠️ CPU models gateway connection failed:', {
          endpoint: this.gatewayEndpoint,
          error: error.message,
          attempt: this.initRetries,
          maxRetries: this.maxRetries
        });
        
        if (this.initRetries < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.retryDelay *= 2; // Exponential backoff
        }
      }
    }
    
    logger.warn('⚠️ CPU models gateway not available after retries, will use fallback:', {
      endpoint: this.gatewayEndpoint,
      attempts: this.initRetries
    });
  }

  /**
   * Analyze prompt complexity using DistilBERT model
   */
  async analyzeComplexity(prompt) {
    this.requestCount++;
    const requestId = `cpu-complexity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const requestStart = Date.now();
    
    logger.info('🧠 [CPU REQUEST] Starting complexity analysis:', {
      requestId,
      requestCount: this.requestCount,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + '...',
      isInitialized: this.isInitialized,
      endpoint: this.gatewayEndpoint,
      timestamp: new Date().toISOString()
    });

    if (!this.isInitialized) {
      logger.warn('⚠️ [CPU BYPASS] CPU model not initialized, using fallback analysis', {
        requestId,
        reason: 'not_initialized'
      });
      this.fallbackCount++;
      
      // Track fallback call
      apiMonitor.trackCPUCall({
        requestId,
        endpoint: this.gatewayEndpoint,
        requestType: 'complexity_analysis',
        success: false,
        fallback: true,
        error: 'CPU model not initialized'
      });
      
      return this.fallbackComplexityAnalysis(prompt, requestId);
    }

    try {
      logger.info('🧠 [CPU REQUEST] Analyzing complexity with DistilBERT CPU model:', {
        requestId,
        endpoint: `${this.gatewayEndpoint}/route`,
        requestPayload: {
          textLength: prompt.length,
          textPreview: prompt.substring(0, 100) + '...'
        }
      });
      
      // Log the complete prompt being sent to DistilBERT
      logger.info('📝 [DISTILBERT PROMPT] Complete prompt being sent to DistilBERT:', {
        requestId,
        fullPrompt: prompt,
        promptLength: prompt.length
      });
      
      const response = await fetch(`${this.gatewayEndpoint}/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt,
          task: 'complexity_analysis'
        })
      });

      const requestTime = Date.now() - requestStart;

      if (!response.ok) {
        throw new Error(`DistilBERT service error: ${response.status}`);
      }

      const result = await response.json();
      
      // Log the complete response from DistilBERT
      logger.info('📄 [DISTILBERT RESPONSE] Complete response from DistilBERT:', {
        requestId,
        fullResponse: result,
        responseTime: `${requestTime}ms`
      });
      this.successCount++;
      
      // Track successful call
      apiMonitor.trackCPUCall({
        requestId,
        endpoint: `${this.gatewayEndpoint}/route`,
        requestType: 'complexity_analysis',
        success: true,
        responseTime: requestTime
      });
      
      logger.info('✅ [CPU RESPONSE] CPU model analysis completed successfully:', {
        requestId,
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
        requestId,
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
      const requestTime = Date.now() - requestStart;
      
      // Track failed call
      apiMonitor.trackCPUCall({
        requestId,
        endpoint: `${this.gatewayEndpoint}/route`,
        requestType: 'complexity_analysis',
        success: false,
        error: error.message,
        responseTime: requestTime,
        fallback: true
      });
      
      logger.error('❌ [CPU ERROR] DistilBERT complexity analysis failed:', {
        requestId,
        error: error.message,
        endpoint: this.gatewayEndpoint,
        fallbackCount: this.fallbackCount + 1,
        requestTime: `${requestTime}ms`
      });
      this.fallbackCount++;
      return this.fallbackComplexityAnalysis(prompt, requestId);
    }
  }

  /**
   * Classify prompt intent using DistilBERT
   */
  async classifyIntent(prompt) {
    this.requestCount++;
    const requestId = `cpu-intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('🎯 [CPU REQUEST] Starting intent classification:', {
      requestId,
      requestCount: this.requestCount,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + '...',
      isInitialized: this.isInitialized
    });

    if (!this.isInitialized) {
      logger.warn('⚠️ [CPU BYPASS] CPU model not initialized, using fallback intent classification', {
        requestId,
        reason: 'not_initialized'
      });
      this.fallbackCount++;
      return this.fallbackIntentClassification(prompt);
    }

    try {
      logger.info('🎯 [CPU REQUEST] Classifying intent with DistilBERT CPU model:', {
        requestId,
        endpoint: `${this.gatewayEndpoint}/route`
      });

      // Log the complete prompt being sent for intent classification
      logger.info('📝 [DISTILBERT INTENT PROMPT] Complete prompt being sent for intent classification:', {
        requestId,
        fullPrompt: prompt,
        promptLength: prompt.length
      });

      const requestStart = Date.now();
      const response = await fetch(`${this.gatewayEndpoint}/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt,
          task: 'intent_classification'
        })
      });

      const requestTime = Date.now() - requestStart;

      if (!response.ok) {
        throw new Error(`DistilBERT intent service error: ${response.status}`);
      }

      const result = await response.json();
      
      // Log the complete response from DistilBERT intent classification
      logger.info('📄 [DISTILBERT INTENT RESPONSE] Complete response from DistilBERT intent classification:', {
        requestId,
        fullResponse: result,
        responseTime: `${requestTime}ms`
      });
      this.successCount++;
      
      logger.info('✅ [CPU RESPONSE] Intent classification completed successfully:', {
        requestId,
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
        requestId,
        metadata: {
          endpoint: this.gatewayEndpoint,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ [CPU ERROR] DistilBERT intent classification failed:', {
        requestId,
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
    const requestId = `cpu-domains-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('🔧 [CPU REQUEST] Starting technical domain analysis:', {
      requestId,
      requestCount: this.requestCount,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + '...',
      isInitialized: this.isInitialized
    });

    if (!this.isInitialized) {
      logger.warn('⚠️ [CPU BYPASS] CPU model not initialized, using fallback domain analysis', {
        requestId,
        reason: 'not_initialized'
      });
      this.fallbackCount++;
      return this.fallbackDomainAnalysis(prompt);
    }

    try {
      logger.info('🔧 [CPU REQUEST] Analyzing domains with DistilBERT CPU model:', {
        requestId,
        endpoint: `${this.gatewayEndpoint}/route`
      });

      const requestStart = Date.now();
      const response = await fetch(`${this.gatewayEndpoint}/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: prompt,
          task: 'domain_classification'
        })
      });

      const requestTime = Date.now() - requestStart;

      if (!response.ok) {
        throw new Error(`DistilBERT domain service error: ${response.status}`);
      }

      const result = await response.json();
      this.successCount++;
      
      logger.info('✅ [CPU RESPONSE] Domain analysis completed successfully:', {
        requestId,
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
        requestId,
        metadata: {
          endpoint: this.gatewayEndpoint,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ [CPU ERROR] DistilBERT domain analysis failed:', {
        requestId,
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
  fallbackComplexityAnalysis(prompt, requestId = 'fallback') {
    logger.warn('🔄 [CPU FALLBACK] Using fallback complexity analysis - CPU model bypassed:', {
      requestId,
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
      requestId,
      metadata: {
        keywordMatches: matches,
        matchedKeywords: complexKeywords.filter(keyword => 
          prompt.toLowerCase().includes(keyword)
        ),
        timestamp: new Date().toISOString()
      }
    };

    logger.info('📊 [CPU FALLBACK] Fallback analysis result:', fallbackResult);
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

      // Define agent capabilities for DistilBERT to analyze
      const agentCapabilities = {
        projectManager: {
          skills: ['project planning', 'task coordination', 'resource management', 'timeline estimation'],
          domains: ['project management', 'agile', 'team coordination']
        },
        architectureDesigner: {
          skills: ['system design', 'scalability planning', 'design patterns', 'architectural decisions'],
          domains: ['software architecture', 'system integration', 'microservices']
        },
        databaseDesigner: {
          skills: ['data modeling', 'schema design', 'query optimization', 'data relationships'],
          domains: ['databases', 'data storage', 'data access']
        },
        apiDesigner: {
          skills: ['API design', 'endpoint planning', 'authentication', 'integration patterns'],
          domains: ['web services', 'REST', 'GraphQL', 'service integration']
        },
        codeGenerator: {
          skills: ['code implementation', 'testing', 'debugging', 'optimization'],
          domains: ['software development', 'programming', 'testing']
        },
        techLead: {
          skills: ['code review', 'best practices', 'technical guidance', 'standards enforcement'],
          domains: ['software quality', 'technical leadership', 'mentoring']
        }
      };

      // Use DistilBERT to analyze task requirements
      const taskAnalysis = await this.analyzeTaskRequirements(actualTask);
      
      // Match task requirements with agent capabilities
      const agentScores = {};
      for (const [agentName, capability] of Object.entries(agentCapabilities)) {
        const skillMatch = await this.matchCapabilities(taskAnalysis.requiredSkills, capability.skills);
        const domainMatch = await this.matchCapabilities(taskAnalysis.domains, capability.domains);
        agentScores[agentName] = (skillMatch + domainMatch) / 2;
      }

      // Select agents with high confidence scores
      const selectedAgents = Object.entries(agentScores)
        .filter(([_, score]) => score >= 0.7) // Only select agents with high confidence
        .sort((a, b) => b[1] - a[1]) // Sort by score descending
        .map(([agent]) => agent)
        .slice(0, 4); // Limit to 4 agents max

      // Ensure we have at least one agent
      if (selectedAgents.length === 0) {
        selectedAgents.push('projectManager'); // Default fallback
      }

      logger.info('✅ CPU model recommended agents:', {
        selectedAgents,
        scores: agentScores
      });
      
      return selectedAgents;

    } catch (error) {
      logger.error('❌ Error in agent recommendation:', error);
      return ['projectManager']; // Fallback
    }
  }

  /**
   * Analyze task requirements using DistilBERT
   */
  async analyzeTaskRequirements(task) {
    try {
      const response = await fetch(`${this.gatewayEndpoint}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: task,
          task: 'analyze_task_requirements'
        })
      });

      if (!response.ok) throw new Error(`DistilBERT analysis failed: ${response.status}`);
      
      const result = await response.json();
      return {
        requiredSkills: result.required_skills || [],
        domains: result.domains || [],
        confidence: result.confidence || 0.5
      };

    } catch (error) {
      logger.error('❌ Task requirement analysis failed:', error);
      return {
        requiredSkills: [],
        domains: [],
        confidence: 0.3
      };
    }
  }

  /**
   * Match capabilities using DistilBERT similarity
   */
  async matchCapabilities(required, available) {
    try {
      const response = await fetch(`${this.gatewayEndpoint}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_texts: required,
          target_texts: available,
          task: 'similarity'
        })
      });

      if (!response.ok) throw new Error(`DistilBERT similarity failed: ${response.status}`);
      
      const result = await response.json();
      return result.similarity_score || 0.5;

    } catch (error) {
      logger.error('❌ Capability matching failed:', error);
      return 0.3;
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