import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utils/logger.js';

// Rate limiting configuration with call counter
const RATE_LIMIT = {
  requestsPerMinute: 100, // Higher limit for gemini models
  requestQueue: [],
  lastRequestTime: null,
  minRequestInterval: 60000 / 100,
  totalCalls: 0,
  callsThisMinute: 0,
  resetTime: Date.now() + 60000
};

// Gemini model configuration - Updated to use available models
const GOOGLE_GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
const GEMINI_PRO_MODEL = "gemini-1.5-pro"; // Updated to available model
const GEMINI_FLASH_MODEL = "gemini-1.5-flash"; // Faster alternative
const GEMINI_PRO_VISION_MODEL = "gemini-1.5-pro"; // Vision capabilities
let genAI = null;

function generateGoogleGeminiClient() {
    if (!genAI) {
        genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
    }
    return genAI;
}

function getGeminiProModel() {
    return genAI.getGenerativeModel({ model: GEMINI_PRO_MODEL });
}

function getGeminiFlashModel() {
    return genAI.getGenerativeModel({ model: GEMINI_FLASH_MODEL });
}

function getGeminiProVisionModel() {
    return genAI.getGenerativeModel({ 
        model: GEMINI_PRO_VISION_MODEL, 
        generationConfig: { 
            temperature: 0.2, 
            maxOutputTokens: 8192 // Updated to realistic limit
        } 
    });
}

function getPromptResponse(model, prompt) {
    return new Promise(async (resolve, reject) => {
        if (!model) {
            return reject(new Error("model is not defined"));
        }
        if (!prompt) {
            return reject(new Error("prompt is empty"));
        }
        try {
            logger.info('📤 Sending request to Gemini model:', {
                model: model.model,
                promptLength: prompt.length,
                promptPreview: prompt.substring(0, 200) + '...'
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let finalResponse = response.text().replace(/```json|```/g, '').trim();
            
            logger.info('📥 Received response from Gemini model:', {
                responseLength: finalResponse.length,
                responsePreview: finalResponse.substring(0, 200) + '...'
            });

            // Try to parse as JSON, if it fails return as text
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(finalResponse);
            } catch (parseError) {
                logger.warn('⚠️ Response is not valid JSON, returning as text');
                parsedResponse = finalResponse;
            }

            return resolve({
                "promptResponse": parsedResponse
            });
        } catch (error) {
            logger.error('❌ Error in Gemini model response:', error);
            return reject(error);
        }
    });
}

/**
 * LLM Agent - Powered by Gemini 1.5 Pro for reliable responses with higher rate limits
 * This agent is used by specialized agents for LLM-powered tasks
 * Implements singleton pattern to prevent multiple instances
 */
export class LLMAgent {
  static #instance = null;

  static getInstance() {
    if (!LLMAgent.#instance) {
      LLMAgent.#instance = new LLMAgent();
    }
    return LLMAgent.#instance;
  }

  constructor() {
    // Prevent multiple instances
    if (LLMAgent.#instance) {
      return LLMAgent.#instance;
    }

    // Initialize Gemini LLM connection
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY or GOOGLE_AI_KEY environment variable is required for LLMAgent');
    }

    this.genAI = generateGoogleGeminiClient();
    this.model = getGeminiProModel();
    this.flashModel = getGeminiFlashModel(); // Faster model for simple tasks
    
    // Conversation memory for context continuity
    this.conversationHistory = new Map();
    
    logger.info('🤖 LLMAgent initialized with Gemini 1.5 Pro and Flash models');
    this.testConnection();

    LLMAgent.#instance = this;
  }

  // Update call counter
  updateCallCounter() {
    const now = Date.now();
    
    // Reset minute counter if needed
    if (now > RATE_LIMIT.resetTime) {
      RATE_LIMIT.callsThisMinute = 0;
      RATE_LIMIT.resetTime = now + 60000;
    }
    
    RATE_LIMIT.totalCalls++;
    RATE_LIMIT.callsThisMinute++;
    
    logger.info('📊 LLM Call Statistics:', {
      totalCalls: RATE_LIMIT.totalCalls,
      callsThisMinute: RATE_LIMIT.callsThisMinute,
      remainingThisMinute: RATE_LIMIT.requestsPerMinute - RATE_LIMIT.callsThisMinute
    });
  }

  async rateLimitedRequest(requestFn) {
    const now = Date.now();
    
    // Clean up old requests
    RATE_LIMIT.requestQueue = RATE_LIMIT.requestQueue.filter(
      time => now - time < 60000
    );
    
    // Check if we're over the limit
    if (RATE_LIMIT.requestQueue.length >= RATE_LIMIT.requestsPerMinute) {
      const oldestRequest = RATE_LIMIT.requestQueue[0];
      const waitTime = 60000 - (now - oldestRequest);
      logger.warn(`⏳ Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Add current request to queue and update counter
    RATE_LIMIT.requestQueue.push(now);
    this.updateCallCounter();
    
    // Execute request
    return await requestFn();
  }

  async testConnection() {
    try {
      logger.info('🔍 Testing LLM connection...');
      
      // First, try to list available models for debugging
      try {
        const models = await this.genAI.listModels();
        logger.info('📋 Available models:', {
          models: models.map(m => m.name),
          count: models.length
        });
      } catch (listError) {
        logger.warn('⚠️ Could not list models:', listError.message);
      }
      
      const result = await this.rateLimitedRequest(async () => {
        return await getPromptResponse(this.model, 'Respond with "LLM connection successful"');
      });

      logger.info('✅ LLM connection test successful:', result);
      return true;
    } catch (error) {
      logger.error('❌ LLM connection test failed:', error);
      if (error.message.includes('PERMISSION_DENIED')) {
        logger.error('🔑 API key validation failed. Please check your GEMINI_API_KEY.');
      } else if (error.message.includes('RESOURCE_EXHAUSTED')) {
        logger.error('⚠️ API quota exceeded. Please check your usage limits.');
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        logger.error('🔍 Model not found. Trying fallback model...');
        // Try with flash model as fallback
        try {
          const fallbackResult = await getPromptResponse(this.flashModel, 'Respond with "LLM fallback connection successful"');
          logger.info('✅ LLM fallback connection successful:', fallbackResult);
          this.model = this.flashModel; // Use flash model as primary
          return true;
        } catch (fallbackError) {
          logger.error('❌ Fallback model also failed:', fallbackError);
          
          // Try with legacy gemini-pro model as last resort
          try {
            const legacyModel = this.genAI.getGenerativeModel({ model: "gemini-pro" });
            const legacyResult = await getPromptResponse(legacyModel, 'Respond with "LLM legacy connection successful"');
            logger.info('✅ LLM legacy connection successful:', legacyResult);
            this.model = legacyModel; // Use legacy model as primary
            return true;
          } catch (legacyError) {
            logger.error('❌ Legacy model also failed:', legacyError);
          }
        }
      }
      return false;
    }
  }

  /**
   * Main execution method for LLM-powered tasks
   */
  async execute(userQuery, context = {}) {
    try {
      logger.info('🧠 LLMAgent executing task:', {
        queryLength: userQuery.length,
        queryPreview: userQuery.substring(0, 100) + '...',
        contextKeys: Object.keys(context),
        model: this.model.model
      });
      
      const result = await this.rateLimitedRequest(async () => {
        return await getPromptResponse(this.model, userQuery);
      });
      
      const response = result.promptResponse || result;
      
      logger.info('✅ LLM execution completed:', {
        responseType: typeof response,
        responseLength: JSON.stringify(response).length,
        responsePreview: JSON.stringify(response).substring(0, 200) + '...'
      });
      
      return {
        content: response,
        analysis: 'LLM-powered analysis completed',
        suggestions: this.extractSuggestions(JSON.stringify(response)),
        metadata: {
          model: this.model.model,
          tokens: JSON.stringify(response).length,
          timestamp: new Date().toISOString(),
          callCount: RATE_LIMIT.totalCalls
        }
      };
      
    } catch (error) {
      logger.error('❌ LLMAgent execution error:', error);
      throw error;
    }
  }

  /**
   * Collaborate with specialized agents
   */
  async collaborateWithAgent(agentName, task, context = {}) {
    try {
      if (!task || typeof task !== 'string') {
        throw new Error('Task must be a non-empty string');
      }

      logger.info(`🤝 LLMAgent collaborating with ${agentName}:`, {
        taskLength: task.length,
        taskPreview: task.substring(0, 200) + '...',
        contextKeys: Object.keys(context),
        model: this.model.model
      });

      const result = await this.rateLimitedRequest(async () => {
        return await getPromptResponse(this.model, task);
      });

      const response = result.promptResponse || result;
      const responseText = typeof response === 'string' ? response : JSON.stringify(response);
      
      logger.info(`✅ LLM collaboration complete for ${agentName}:`, {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200) + '...',
        responseType: typeof response
      });
      
      // Store conversation for context
      this.storeConversation(agentName, task, responseText);
      
      const collaborationResult = {
        agentCollaboration: agentName,
        response: responseText,
        analysis: this.analyzeResponse(responseText, agentName),
        nextSteps: this.generateNextSteps(responseText, agentName),
        metadata: {
          collaboratingAgent: agentName,
          model: this.model.model,
          timestamp: new Date().toISOString(),
          responseLength: responseText.length,
          callCount: RATE_LIMIT.totalCalls
        }
      };

      logger.info(`📊 Collaboration result for ${agentName}:`, {
        analysis: collaborationResult.analysis,
        nextSteps: collaborationResult.nextSteps,
        metadata: collaborationResult.metadata
      });

      return collaborationResult;
      
    } catch (error) {
      logger.error(`❌ Error collaborating with ${agentName}:`, error);
      throw error;
    }
  }

  /**
   * Multi-turn conversation with context memory
   */
  async continueConversation(agentName, newPrompt, context = {}) {
    try {
      logger.info(`💬 Continuing conversation with ${agentName}`);
      
      // Get conversation history
      const history = this.getConversationHistory(agentName);
      
      // Build context-aware prompt
      const contextPrompt = this.buildContextualPrompt(newPrompt, history, context);
      
      const config = {
        thinkingConfig: {
          thinkingBudget: -1,
        },
        responseMimeType: 'text/plain',
      };

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: contextPrompt,
            },
          ],
        },
      ];

      const result = await this.rateLimitedRequest(async () => {
        return await this.genAI.models.generateContentStream({
          model: 'gemini-2.5-pro',
          config,
          contents,
        });
      });

      let response = '';
      for await (const chunk of result) {
        response += chunk.text;
      }
      
      // Update conversation history
      this.updateConversationHistory(agentName, newPrompt, response);
      
      return {
        response: response,
        conversationTurn: history.length + 1,
        analysis: this.analyzeConversationProgress(history, response),
        metadata: {
          agentName,
          conversationLength: history.length,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error(`❌ Error in conversation with ${agentName}:`, error);
      throw error;
    }
  }

  /**
   * Build enhanced prompt with context
   */
  buildEnhancedPrompt(userQuery, context) {
    const systemContext = this.buildSystemContext(context);
    
    return `${systemContext}

USER REQUEST:
${userQuery}

INSTRUCTIONS:
1. Analyze the request thoroughly
2. Provide specific, actionable guidance
3. Consider the project context and constraints
4. Suggest next steps and improvements
5. Format response clearly with sections

Please provide a comprehensive response that addresses all aspects of the request.`;
  }

  /**
   * Build collaboration prompt for agent interaction
   */
  buildCollaborationPrompt(agentName, task, context) {
    const agentPersonas = {
      'architectureDesigner': 'You are a Senior System Architect with expertise in scalable system design, microservices, and architectural patterns.',
      'databaseDesigner': 'You are a Database Architect specializing in schema design, optimization, and data modeling.',
      'apiDesigner': 'You are an API Architect focused on RESTful design, API security, and integration patterns.',
      'codeGenerator': 'You are a Senior Software Engineer specializing in clean code, testing, and implementation best practices.',
      'projectManager': 'You are a Technical Project Manager with expertise in agile methodologies and team coordination.',
      'techLead': 'You are a Technical Lead responsible for architectural decisions, code quality, and team guidance.'
    };

    const persona = agentPersonas[agentName] || 'You are a technical expert.';
    const systemContext = this.buildSystemContext(context);

    return `${persona}

${systemContext}

COLLABORATION TASK:
${task}

COLLABORATION GUIDELINES:
1. Focus on your area of expertise (${agentName})
2. Provide specific, implementable recommendations
3. Consider integration with other system components
4. Identify potential issues and solutions
5. Suggest concrete next steps

Please provide your expert analysis and recommendations for this task.`;
  }

  /**
   * Build system context from provided context
   */
  buildSystemContext(context) {
    let systemContext = 'SYSTEM CONTEXT:\n';
    
    if (context.complexity) {
      systemContext += `- Task Complexity: ${context.complexity}\n`;
    }
    
    if (context.taskType) {
      systemContext += `- Task Type: ${context.taskType}\n`;
    }
    
    if (context.canvasState && context.canvasState.nodes) {
      systemContext += `- Current Canvas: ${context.canvasState.nodes.length} components\n`;
    }
    
    if (context.requiredSkills && context.requiredSkills.length > 0) {
      systemContext += `- Required Skills: ${context.requiredSkills.join(', ')}\n`;
    }
    
    if (context.subTasks && context.subTasks.length > 0) {
      systemContext += `- Sub-tasks: ${context.subTasks.length} identified\n`;
    }
    
    return systemContext;
  }

  /**
   * Extract suggestions from response
   */
  extractSuggestions(responseText) {
    const suggestions = [];
    
    // Look for numbered lists or bullet points
    const lines = responseText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^\d+\./) || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const suggestion = trimmed.replace(/^\d+\./, '').replace(/^[-•]\s*/, '').trim();
        if (suggestion.length > 10) {
          suggestions.push(suggestion);
        }
      }
    }
    
    // Fallback: extract sentences that sound like recommendations
    if (suggestions.length === 0) {
      const sentences = responseText.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes('recommend') || 
            sentence.toLowerCase().includes('suggest') ||
            sentence.toLowerCase().includes('should')) {
          suggestions.push(sentence.trim());
        }
      }
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Analyze response based on agent type
   */
  analyzeResponse(responseText, agentName) {
    const analysisKeywords = {
      'architectureDesigner': ['scalability', 'performance', 'architecture', 'pattern'],
      'databaseDesigner': ['schema', 'optimization', 'data', 'query'],
      'apiDesigner': ['endpoint', 'authentication', 'integration', 'rest'],
      'codeGenerator': ['implementation', 'testing', 'clean code', 'best practices'],
      'projectManager': ['timeline', 'resources', 'coordination', 'planning'],
      'techLead': ['quality', 'standards', 'architecture', 'guidance']
    };

    const keywords = analysisKeywords[agentName] || [];
    const foundKeywords = keywords.filter(keyword => 
      responseText.toLowerCase().includes(keyword)
    );

    return `${agentName} analysis completed. Covered areas: ${foundKeywords.join(', ')}`;
  }

  /**
   * Generate next steps based on response
   */
  generateNextSteps(responseText, agentName) {
    const nextSteps = [];
    
    // Extract action items from response
    const actionWords = ['implement', 'create', 'design', 'build', 'configure', 'setup', 'develop'];
    const sentences = responseText.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const hasActionWord = actionWords.some(word => 
        sentence.toLowerCase().includes(word)
      );
      
      if (hasActionWord && sentence.length > 20) {
        nextSteps.push(sentence.trim());
      }
    }
    
    return nextSteps.slice(0, 3); // Limit to 3 next steps
  }

  /**
   * Store conversation for context
   */
  storeConversation(agentName, prompt, response) {
    if (!this.conversationHistory.has(agentName)) {
      this.conversationHistory.set(agentName, []);
    }
    
    const history = this.conversationHistory.get(agentName);
    history.push({
      prompt,
      response,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 exchanges to manage memory
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get conversation history for an agent
   */
  getConversationHistory(agentName) {
    return this.conversationHistory.get(agentName) || [];
  }

  /**
   * Update conversation history
   */
  updateConversationHistory(agentName, prompt, response) {
    this.storeConversation(agentName, prompt, response);
  }

  /**
   * Build contextual prompt with history
   */
  buildContextualPrompt(newPrompt, history, context) {
    let contextualPrompt = 'CONVERSATION HISTORY:\n';
    
    // Add recent history for context
    const recentHistory = history.slice(-3); // Last 3 exchanges
    for (const exchange of recentHistory) {
      contextualPrompt += `Previous: ${exchange.prompt.substring(0, 100)}...\n`;
      contextualPrompt += `Response: ${exchange.response.substring(0, 100)}...\n\n`;
    }
    
    contextualPrompt += `NEW REQUEST:\n${newPrompt}\n\n`;
    contextualPrompt += `Please continue the conversation considering the previous context.`;
    
    return contextualPrompt;
  }

  /**
   * Analyze conversation progress
   */
  analyzeConversationProgress(history, newResponse) {
    const totalExchanges = history.length + 1;
    const progressIndicators = ['progress', 'complete', 'done', 'finished', 'ready'];
    
    const hasProgress = progressIndicators.some(indicator => 
      newResponse.toLowerCase().includes(indicator)
    );
    
    return `Conversation turn ${totalExchanges}. Progress: ${hasProgress ? 'advancing' : 'continuing'}`;
  }

  /**
   * Clear conversation history for an agent
   */
  clearConversationHistory(agentName) {
    this.conversationHistory.delete(agentName);
    logger.info(`🧹 Cleared conversation history for ${agentName}`);
  }

  /**
   * Get agent status and capabilities
   */
  getStatus() {
    return {
      status: 'active',
      model: 'gemini-2.5-pro',
      activeConversations: this.conversationHistory.size,
      capabilities: [
        'complex reasoning',
        'code generation',
        'architecture analysis',
        'multi-turn conversations',
        'agent collaboration'
      ],
      lastActivity: new Date().toISOString()
    };
  }

  /**
   * Generate content using Gemini
   */
  async generateContent(prompt, config = {}) {
    const startTime = Date.now();
    logger.info('🤖 Starting LLM content generation', {
      promptLength: prompt.length,
      config: config
    });

    try {
      const contents = [{
        role: 'user',
        parts: [{ text: prompt }]
      }];

      const model = this.genAI.models.geminiPro();
      const result = await model.generateContentStream({
        contents,
        ...config
      });

      const responseTime = Date.now() - startTime;
      logger.info('⏱️ LLM generation completed', {
        timeSpentMs: responseTime,
        status: 'success'
      });

      return result;
    } catch (error) {
      const errorTime = Date.now() - startTime;
      logger.error('❌ Error in LLM generation:', {
        error: error.message,
        timeSpentMs: errorTime
      });
      throw error;
    }
  }
} 