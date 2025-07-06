import logger from '../utils/logger.js';

/**
 * Smart Intent Classification using Multiple CPU Models
 * Routes user queries to appropriate models/agents based on intent
 */
export class IntentClassificationService {
  constructor() {
    this.gatewayEndpoint = process.env.CPU_MODELS_GATEWAY || 'http://cpu-models-gateway-prod:8000';
    this.initialized = false;
    this.modelAvailability = {
      distilbert: false,
      flanT5: false,
      codebert: false
      // Removed mistral: too slow on CPU
    };
    
    this.init();
  }

  async init() {
    try {
      // Check which CPU models are available
      const healthCheck = await fetch(`${this.gatewayEndpoint}/health`);
      if (healthCheck.ok) {
        const status = await healthCheck.json();
        this.modelAvailability = {
          distilbert: status.models?.distilbert || false,
          flanT5: status.models?.['flan-t5'] || false,
          codebert: status.models?.codebert || false
          // Removed mistral: too slow on CPU
        };
        this.initialized = true;
        
        logger.info('🎯 IntentClassificationService initialized:', {
          endpoint: this.gatewayEndpoint,
          availableModels: Object.keys(this.modelAvailability).filter(m => this.modelAvailability[m])
        });
      }
    } catch (error) {
      logger.warn('⚠️ CPU models gateway not available, using fallback classification:', error.message);
    }
  }

  /**
   * MAIN FUNCTION: Classify user intent and determine routing strategy
   */
  async classifyAndRoute(userQuery, context = {}) {
    logger.info('🎯 Starting intent classification for:', userQuery.substring(0, 100) + '...');

    // Step 1: Primary intent classification using DistilBERT
    const primaryIntent = await this.classifyPrimaryIntent(userQuery);
    
    // Step 2: If technical, use specialized models for deeper analysis
    let routingDecision;
    if (primaryIntent.isTechnical) {
      routingDecision = await this.analyzeTechnicalIntent(userQuery, primaryIntent);
    } else {
      routingDecision = await this.analyzeCasualIntent(userQuery, primaryIntent);
    }

    logger.info('✅ Intent classification complete:', {
      primaryIntent: primaryIntent.intent,
      isTechnical: primaryIntent.isTechnical,
      confidence: primaryIntent.confidence,
      routingDecision: routingDecision.strategy
    });

    return {
      primaryIntent,
      routingDecision,
      recommendedModel: this.selectOptimalModel(routingDecision),
      suggestedAgents: routingDecision.suggestedAgents || [],
      conversationStyle: routingDecision.conversationStyle || 'professional'
    };
  }

  /**
   * Step 1: Primary intent classification using DistilBERT
   */
  async classifyPrimaryIntent(userQuery) {
    if (!this.modelAvailability.distilbert) {
      return this.fallbackIntentClassification(userQuery);
    }

    try {
      const response = await fetch(`${this.gatewayEndpoint}/cpu-models/distilbert/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: userQuery,
          classification_categories: [
            'technical_architecture',
            'code_development', 
            'project_management',
            'casual_conversation',
            'question_answer',
            'creative_writing',
            'data_analysis'
          ]
        })
      });

      if (!response.ok) throw new Error(`DistilBERT intent classification failed: ${response.status}`);
      
      const result = await response.json();
      
      const technicalIntents = ['technical_architecture', 'code_development', 'project_management', 'data_analysis'];
      const isTechnical = technicalIntents.includes(result.primary_intent);

      return {
        intent: result.primary_intent,
        confidence: result.confidence,
        isTechnical,
        secondaryIntents: result.secondary_intents || [],
        source: 'distilbert'
      };

    } catch (error) {
      logger.error('❌ DistilBERT intent classification failed:', error);
      return this.fallbackIntentClassification(userQuery);
    }
  }

  /**
   * Step 2a: Analyze technical intent using specialized models
   */
  async analyzeTechnicalIntent(userQuery, primaryIntent) {
    const strategy = {
      type: 'technical',
      strategy: 'multi_agent',
      suggestedAgents: [],
      conversationStyle: 'professional'
    };

    // Use CodeBERT for code-related queries
    if (primaryIntent.intent === 'code_development' && this.modelAvailability.codebert) {
      const codeAnalysis = await this.analyzeWithCodeBERT(userQuery);
      strategy.codeAnalysis = codeAnalysis;
      strategy.suggestedAgents = ['codeGenerator', 'techLead'];
      
      if (codeAnalysis.requiresArchitecture) {
        strategy.suggestedAgents.unshift('architectureDesigner');
      }
    }
    
    // Use DistilBERT for architectural analysis (Mistral removed - too slow on CPU)
    else if (primaryIntent.intent === 'technical_architecture') {
      strategy.suggestedAgents = ['projectManager', 'architectureDesigner'];
      
      // Use secondary intent analysis from DistilBERT to determine additional agents
      if (primaryIntent.secondaryIntents?.includes('database') || 
          userQuery.toLowerCase().includes('database') || 
          userQuery.toLowerCase().includes('data')) {
        strategy.suggestedAgents.push('databaseDesigner');
      }
      if (primaryIntent.secondaryIntents?.includes('api') || 
          userQuery.toLowerCase().includes('api') || 
          userQuery.toLowerCase().includes('endpoint')) {
        strategy.suggestedAgents.push('apiDesigner');
      }
    }
    
    // Default technical routing
    else {
      strategy.suggestedAgents = this.selectAgentsFromIntent(primaryIntent);
    }

    return strategy;
  }

  /**
   * Step 2b: Analyze casual intent for conversational response
   */
  async analyzeCasualIntent(userQuery, primaryIntent) {
    const strategy = {
      type: 'casual',
      strategy: 'conversational',
      conversationStyle: 'friendly',
      suggestedAgents: ['projectManager'], // PM can handle general questions nicely
      responseStyle: 'casual_helpful'
    };

    // Determine if we should redirect to technical topic
    const technicalKeywords = ['architecture', 'code', 'database', 'api', 'system', 'design'];
    const hasTechnicalHints = technicalKeywords.some(keyword => 
      userQuery.toLowerCase().includes(keyword)
    );

    if (hasTechnicalHints) {
      strategy.suggestRedirect = true;
      strategy.redirectMessage = "I notice you might be asking about technical topics. Would you like me to help with architecture, coding, or system design?";
    }

    return strategy;
  }

  /**
   * Analyze code-related queries using CodeBERT
   */
  async analyzeWithCodeBERT(userQuery) {
    try {
      const response = await fetch(`${this.gatewayEndpoint}/cpu-models/codebert/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: userQuery,
          analysis_type: 'code_intent_analysis'
        })
      });

      if (!response.ok) throw new Error(`CodeBERT analysis failed: ${response.status}`);
      
      const result = await response.json();
      return {
        codeType: result.code_type || 'general',
        requiresArchitecture: result.requires_architecture || false,
        complexity: result.complexity || 'medium',
        suggestedLanguages: result.suggested_languages || [],
        source: 'codebert'
      };

    } catch (error) {
      logger.error('❌ CodeBERT analysis failed:', error);
      return {
        codeType: 'general',
        requiresArchitecture: false,
        complexity: 'medium',
        source: 'fallback'
      };
    }
  }



  /**
   * Select optimal model for response generation
   */
  selectOptimalModel(routingDecision) {
    if (routingDecision.type === 'casual') {
      return 'llm'; // Use LLM for casual conversation
    }

    if (routingDecision.codeAnalysis) {
      return 'codebert';
    }

    if (routingDecision.architectureAnalysis) {
      return 'llm'; // Use LLM for architecture (removed slow mistral)
    }

    return 'llm'; // Default to main LLM
  }

  /**
   * Fallback intent classification when models are unavailable
   */
  fallbackIntentClassification(userQuery) {
    const lowerQuery = userQuery.toLowerCase();
    
    const technicalKeywords = [
      'architecture', 'code', 'implement', 'database', 'api', 'system',
      'design', 'build', 'create', 'develop', 'microservice', 'deployment'
    ];
    
    const casualKeywords = [
      'hello', 'hi', 'thanks', 'help', 'how are you', 'what is', 'explain'
    ];

    const technicalScore = technicalKeywords.filter(keyword => 
      lowerQuery.includes(keyword)
    ).length;
    
    const casualScore = casualKeywords.filter(keyword => 
      lowerQuery.includes(keyword)
    ).length;

    const isTechnical = technicalScore > casualScore;
    
    return {
      intent: isTechnical ? 'technical_general' : 'casual_conversation',
      confidence: 0.6,
      isTechnical,
      secondaryIntents: [],
      source: 'fallback'
    };
  }

  /**
   * Select agents based on intent
   */
  selectAgentsFromIntent(primaryIntent) {
    const agentMapping = {
      'technical_architecture': ['projectManager', 'architectureDesigner'],
      'code_development': ['codeGenerator', 'techLead'],
      'project_management': ['projectManager'],
      'data_analysis': ['databaseDesigner', 'architectureDesigner'],
      'casual_conversation': ['projectManager']
    };

    return agentMapping[primaryIntent.intent] || ['projectManager'];
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      endpoint: this.gatewayEndpoint,
      modelAvailability: this.modelAvailability,
      capabilities: [
        'intent_classification',
        'technical_routing',
        'casual_conversation_detection',
        'multi_model_analysis'
      ]
    };
  }
} 