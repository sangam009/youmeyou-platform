import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utils/logger.js';
import { apiMonitor } from '../../utils/apiMonitor.js';

// Constants
const GEMINI_MODEL = 'gemini-1.5-flash';
const RATE_LIMIT = {
  maxCallsPerMinute: 60,
  requestsPerMinute: 60,
  totalCalls: 0,
  callsThisMinute: 0,
  lastReset: Date.now(),
  resetTime: Date.now() + 60000,
  requestQueue: []
};

// Gemini model configuration - Updated to use available models
const GOOGLE_GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
const GEMINI_PRO_MODEL = "gemini-1.5-flash"; // Use flash model for better quota management
const GEMINI_FLASH_MODEL = "gemini-1.5-flash"; // Faster alternative
const GEMINI_PRO_VISION_MODEL = "gemini-1.5-pro"; // Vision capabilities
let genAI = null;

// Global connection test flag to prevent multiple tests
let connectionTested = false;
let connectionStatus = false;

function generateGoogleGeminiClient() {
    if (!genAI) {
        genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
        logger.info('🤖 GoogleGenerativeAI client created');
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
        
        const callId = `llm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const requestStart = Date.now();
        
        try {
            logger.info('📤 [LLM REQUEST] Sending request to Gemini model:', {
                model: model.model,
                promptLength: prompt.length,
                promptPreview: prompt.substring(0, 100) + '...',
                timestamp: new Date().toISOString(),
                callId
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const requestTime = Date.now() - requestStart;
            
            let finalResponse = response.text().replace(/```json|```/g, '').trim();
            
            logger.info('📥 [LLM RESPONSE] Received response from Gemini model:', {
                model: model.model,
                responseLength: finalResponse.length,
                responsePreview: finalResponse.substring(0, 200) + '...',
                requestTime: `${requestTime}ms`,
                timestamp: new Date().toISOString(),
                callId
            });

            // Track successful call
            apiMonitor.trackLLMCall({
                requestId: callId,
                model: model.model,
                promptLength: prompt.length,
                success: true,
                responseTime: requestTime
            });

            // Try to parse as JSON, if it fails return as text
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(finalResponse);
                logger.info('✅ [LLM PARSE] Successfully parsed JSON response');
            } catch (parseError) {
                logger.warn('⚠️ [LLM PARSE] Response is not valid JSON, returning as text');
                parsedResponse = finalResponse;
            }

            return resolve({
                "promptResponse": parsedResponse
            });
        } catch (error) {
            const requestTime = Date.now() - requestStart;
            
            logger.error('❌ [LLM ERROR] Error in Gemini model response:', {
                error: error.message,
                model: model.model,
                timestamp: new Date().toISOString(),
                callId,
                requestTime: `${requestTime}ms`
            });

            // Track failed call
            apiMonitor.trackLLMCall({
                requestId: callId,
                model: model.model,
                promptLength: prompt.length,
                success: false,
                error: error.message,
                responseTime: requestTime
            });

            return reject(error);
        }
    });
}

/**
 * Stream LLM response progressively - chunks are sent as they are generated
 */
async function* getPromptResponseStream(model, prompt, streamingCallback = null) {
    if (!model) {
        throw new Error("model is not defined");
    }
    if (!prompt) {
        throw new Error("prompt is empty");
    }
    
    const callId = `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const requestStart = Date.now();
    
    try {
        logger.info('📤 [LLM STREAM] Starting streaming request to Gemini model:', {
            model: model.model,
            promptLength: prompt.length,
            promptPreview: prompt.substring(0, 100) + '...',
            timestamp: new Date().toISOString(),
            callId
        });

        const result = await model.generateContentStream(prompt);
        let fullResponse = '';
        let chunkCount = 0;
        
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            chunkCount++;
            fullResponse += chunkText;
            
            // Send chunk via streaming callback if provided
            if (streamingCallback) {
                streamingCallback({
                    type: 'llm_chunk',
                    content: chunkText,
                    fullContent: fullResponse,
                    chunkNumber: chunkCount,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Yield the chunk for generator consumers
            yield chunkText;
        }
        
        const requestTime = Date.now() - requestStart;
        
        logger.info('📥 [LLM STREAM] Completed streaming response:', {
            model: model.model,
            responseLength: fullResponse.length,
            chunkCount,
            responsePreview: fullResponse.substring(0, 200) + '...',
            requestTime: `${requestTime}ms`,
            timestamp: new Date().toISOString(),
            callId
        });

        // Track successful call
        apiMonitor.trackLLMCall({
            requestId: callId,
            model: model.model,
            promptLength: prompt.length,
            success: true,
            responseTime: requestTime
        });

        // Try to parse as JSON, if it fails return as text
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(fullResponse.replace(/```json|```/g, '').trim());
            logger.info('✅ [LLM STREAM PARSE] Successfully parsed JSON response');
        } catch (parseError) {
            logger.warn('⚠️ [LLM STREAM PARSE] Response is not valid JSON, returning as text');
            parsedResponse = fullResponse;
        }

        return {
            "promptResponse": parsedResponse,
            "fullResponse": fullResponse,
            "chunkCount": chunkCount
        };

    } catch (error) {
        const requestTime = Date.now() - requestStart;
        
        logger.error('❌ [LLM STREAM ERROR] Error in streaming response:', {
            error: error.message,
            model: model.model,
            timestamp: new Date().toISOString(),
            callId,
            requestTime: `${requestTime}ms`
        });

        // Track failed call
        apiMonitor.trackLLMCall({
            requestId: callId,
            model: model.model,
            promptLength: prompt.length,
            success: false,
            error: error.message,
            responseTime: requestTime
        });

        throw error;
    }
}

/**
 * LLM Agent with optimized request handling
 */
export class LLMAgent {
  static instance = null;
  static requestCache = new Map();
  static batchedRequests = [];
  static batchTimeout = null;
  static BATCH_DELAY = 100; // ms
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  static conversationHistory = new Map();

  constructor() {
    if (LLMAgent.instance) {
      return LLMAgent.instance;
    }

    // Initialize immediately in constructor
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      logger.warn('⚠️ No Gemini API key found (GEMINI_API_KEY), LLM will run in mock mode');
      this.apiKeyMissing = true;
      this.model = null;
      this.initialized = false;
    } else {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        this.initialized = true;
        this.apiKeyMissing = false;
        logger.info(`🤖 LLMAgent initialized with ${GEMINI_MODEL}`);
      } catch (error) {
        logger.error('❌ Failed to initialize LLM in constructor:', error);
        this.model = null;
        this.initialized = false;
        this.apiKeyMissing = true;
      }
    }

    this.conversationHistory = new Map();
    LLMAgent.instance = this;
  }

  static getInstance() {
    if (!LLMAgent.instance) {
      LLMAgent.instance = new LLMAgent();
    }
    return LLMAgent.instance;
  }

  /**
   * Initialize or reinitialize LLM connection
   */
  async initialize() {
    if (this.initialized && this.model) {
      logger.info('🔄 LLM already initialized');
      return;
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      
      if (!apiKey) {
        logger.warn('⚠️ No Gemini API key found (GEMINI_API_KEY), LLM will run in mock mode');
        this.apiKeyMissing = true;
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      this.initialized = true;
      this.apiKeyMissing = false;
      
      logger.info(`🤖 LLMAgent reinitialized with ${GEMINI_MODEL}`);

    } catch (error) {
      logger.error('❌ Failed to initialize LLM:', error);
      this.model = null;
      this.initialized = false;
      this.apiKeyMissing = true;
      throw error;
    }
  }

  /**
   * Get cache key for request
   */
  static getCacheKey(prompt, options = {}) {
    return `${prompt}_${JSON.stringify(options)}`;
  }

  /**
   * Check if response is cached
   */
  static getCachedResponse(prompt, options = {}) {
    const key = this.getCacheKey(prompt, options);
    const cached = this.requestCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      logger.info('📦 Using cached LLM response:', {
        promptPreview: prompt.substring(0, 100),
        cacheAge: Math.round((Date.now() - cached.timestamp) / 1000) + 's'
      });
      return cached.response;
    }
    
    return null;
  }

  /**
   * Cache response
   */
  static cacheResponse(prompt, options = {}, response) {
    const key = this.getCacheKey(prompt, options);
    this.requestCache.set(key, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Execute LLM request with batching and caching
   */
  async execute(prompt, options = {}) {
    // Check cache first
    const cached = LLMAgent.getCachedResponse(prompt, options);
    if (cached) return cached;

    // Initialize if needed
    if (!this.initialized) {
      await this.initialize();
    }

    // Add request to batch
    return new Promise((resolve, reject) => {
      LLMAgent.batchedRequests.push({
        prompt,
        options,
        resolve,
        reject
      });

      // Set timeout to process batch
      if (!LLMAgent.batchTimeout) {
        LLMAgent.batchTimeout = setTimeout(() => this.processBatch(), LLMAgent.BATCH_DELAY);
      }
    });
  }

  /**
   * Process batched requests
   */
  async processBatch() {
    const requests = [...LLMAgent.batchedRequests];
    LLMAgent.batchedRequests = [];
    LLMAgent.batchTimeout = null;

    try {
      // Combine similar requests
      const uniqueRequests = this.deduplicateRequests(requests);
      
      // Execute requests in parallel with rate limiting
      const results = await Promise.all(
        uniqueRequests.map(request => this.executeSingle(request.prompt, request.options))
      );

      // Match results back to original requests
      requests.forEach((request, i) => {
        const result = results[this.findMatchingResult(request, uniqueRequests)];
        LLMAgent.cacheResponse(request.prompt, request.options, result);
        request.resolve(result);
      });

    } catch (error) {
      requests.forEach(request => request.reject(error));
    }
  }

  /**
   * Find matching result index for request
   */
  findMatchingResult(request, uniqueRequests) {
    return uniqueRequests.findIndex(ur => 
      ur.prompt === request.prompt && 
      JSON.stringify(ur.options) === JSON.stringify(request.options)
    );
  }

  /**
   * Deduplicate similar requests
   */
  deduplicateRequests(requests) {
    const unique = new Map();
    
    requests.forEach(request => {
      const key = LLMAgent.getCacheKey(request.prompt, request.options);
      if (!unique.has(key)) {
        unique.set(key, request);
      }
    });

    return Array.from(unique.values());
  }

  /**
   * Execute single LLM request
   */
  async executeSingle(prompt, options = {}) {
    if (!this.model) {
      logger.warn('⚠️ LLM not initialized, returning mock response');
      return { content: 'Mock LLM response' };
    }

    const requestId = `llm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('📤 [LLM REQUEST] Sending request to Gemini model:', {
        callId: requestId,
        model: 'models/gemini-1.5-flash',
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + '...'
      });

      const startTime = Date.now();
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseTime = Date.now() - startTime;

      const responseText = response.text();
      
      logger.info('📥 [LLM RESPONSE] Received response from Gemini model:', {
        callId: requestId,
        model: 'models/gemini-1.5-flash',
        requestTime: `${responseTime}ms`,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 100) + '...'
      });

      return {
        content: responseText,
        metadata: {
          model: 'models/gemini-1.5-flash',
          requestId,
          responseTime
        }
      };

    } catch (error) {
      logger.error('❌ LLM request failed:', {
        callId: requestId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize LLM connection - CALL THIS ONLY ONCE AT APPLICATION STARTUP
   */
  static async initializeConnection() {
    if (connectionTested) {
      logger.info('🔄 [LLM INIT] Connection already tested, skipping');
      return connectionStatus;
    }

    logger.info('🔍 [LLM INIT] Starting ONE-TIME LLM connection test at application startup...');
    
    // Get singleton instance
    const instance = LLMAgent.getInstance();
    
    // Check if API key is missing
    if (instance.apiKeyMissing) {
      logger.warn('⚠️ [LLM INIT] Cannot test connection - API key missing');
      connectionTested = true;
      connectionStatus = false;
      return false;
    }
    
    // Delay to avoid quota issues during startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return await instance.testConnection();
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
    
    logger.info('📊 [LLM STATS] Call Statistics:', {
      totalCalls: RATE_LIMIT.totalCalls,
      callsThisMinute: RATE_LIMIT.callsThisMinute,
      remainingThisMinute: RATE_LIMIT.requestsPerMinute - RATE_LIMIT.callsThisMinute,
      quotaStatus: RATE_LIMIT.callsThisMinute >= RATE_LIMIT.requestsPerMinute ? 'EXCEEDED' : 'OK'
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
      logger.warn(`⏳ [LLM RATE_LIMIT] Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Add current request to queue and update counter
    RATE_LIMIT.requestQueue.push(now);
    this.updateCallCounter();
    
    // Execute request
    return await requestFn();
  }

  async testConnection() {
    if (connectionTested) {
      logger.info('🔄 [LLM TEST] Connection already tested, skipping');
      return connectionStatus;
    }

    connectionTested = true;
    
    try {
      logger.info('🔍 [LLM TEST] Testing LLM connection (SINGLE TEST ONLY)...');
      
      const result = await this.rateLimitedRequest(async () => {
        return await getPromptResponse(this.model, 'Test');
      });

      logger.info('✅ [LLM TEST] LLM connection test successful:', result);
      connectionStatus = true;
      return true;
    } catch (error) {
      logger.error('❌ [LLM TEST] LLM connection test failed:', error);
      connectionStatus = false;
      
      if (error.message.includes('PERMISSION_DENIED')) {
        logger.error('🔑 [LLM TEST] API key validation failed. Please check your GEMINI_API_KEY.');
      } else if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429')) {
        logger.error('⚠️ [LLM TEST] API quota exceeded. Using CPU models only until quota resets.');
        // Don't try fallback models when quota is exceeded
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        logger.error('🔍 [LLM TEST] Model not found. Trying fallback model...');
        try {
          const legacyGenAI = generateGoogleGeminiClient();
          const legacyModel = legacyGenAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const legacyResult = await getPromptResponse(legacyModel, 'Test');
          logger.info('✅ [LLM TEST] LLM legacy connection successful:', legacyResult);
          this.model = legacyModel; // Use legacy model as primary
          connectionStatus = true;
          return true;
        } catch (legacyError) {
          logger.error('❌ [LLM TEST] Legacy model also failed:', legacyError);
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
      // Check if API key is missing
      if (this.apiKeyMissing) {
        logger.warn('⚠️ [LLM EXECUTE] LLM execution skipped - API key missing');
        return {
          content: 'LLM functionality is currently unavailable due to missing API key. Please configure GEMINI_API_KEY environment variable.',
          analysis: 'API key missing - LLM disabled',
          suggestions: ['Configure GEMINI_API_KEY environment variable', 'Restart the service after adding the API key'],
          metadata: {
            model: 'none',
            tokens: 0,
            timestamp: new Date().toISOString(),
            callCount: 0,
            status: 'api_key_missing'
          }
        };
      }

      logger.info('🧠 [LLM EXECUTE] LLMAgent executing task:', {
        queryLength: userQuery.length,
        queryPreview: userQuery.substring(0, 100) + '...',
        contextKeys: Object.keys(context),
        model: this.model.model
      });
      
      const result = await this.rateLimitedRequest(async () => {
        return await getPromptResponse(this.model, userQuery);
      });
      
      const response = result.promptResponse || result;
      
      logger.info('✅ [LLM EXECUTE] LLM execution completed:', {
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
      logger.error('❌ [LLM EXECUTE] LLMAgent execution error:', error);
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

      // Check if API key is missing
      if (this.apiKeyMissing) {
        logger.warn(`⚠️ [LLM COLLAB] LLM collaboration skipped for ${agentName} - API key missing`);
        return {
          agentCollaboration: agentName,
          response: `LLM functionality is currently unavailable for ${agentName} due to missing API key. Please configure GEMINI_API_KEY environment variable.`,
          analysis: 'API key missing - LLM disabled',
          nextSteps: ['Configure GEMINI_API_KEY environment variable', 'Restart the service after adding the API key'],
          metadata: {
            collaboratingAgent: agentName,
            model: 'none',
            timestamp: new Date().toISOString(),
            responseLength: 0,
            callCount: 0,
            status: 'api_key_missing'
          }
        };
      }

      logger.info(`🤝 [LLM COLLAB] LLMAgent collaborating with ${agentName}:`, {
        taskLength: task.length,
        taskPreview: task.substring(0, 200) + '...',
        contextKeys: Object.keys(context),
        model: this.model.model,
        streamingEnabled: context.streamingEnabled || false
      });

      // Generate dynamic collaboration prompt
      const collaborationPrompt = await this.buildCollaborationPrompt(agentName, task, context);
      
      // Check if streaming is enabled
      if (context.streamingEnabled && context.streamingCallback) {
        return await this.collaborateWithAgentStreaming(agentName, collaborationPrompt, context);
      }

      const result = await this.rateLimitedRequest(async () => {
        return await getPromptResponse(this.model, collaborationPrompt);
      });

      const response = result.promptResponse || result;
      const responseText = typeof response === 'string' ? response : JSON.stringify(response);
      
      logger.info(`✅ [LLM COLLAB] LLM collaboration complete for ${agentName}:`, {
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

      logger.info(`📊 [LLM COLLAB] Collaboration result for ${agentName}:`, {
        analysis: collaborationResult.analysis,
        nextSteps: collaborationResult.nextSteps,
        metadata: collaborationResult.metadata
      });

      return collaborationResult;
      
    } catch (error) {
      logger.error(`❌ [LLM COLLAB] Error collaborating with ${agentName}:`, error);
      throw error;
    }
  }

  /**
   * Collaborate with specialized agents using streaming
   */
  async collaborateWithAgentStreaming(agentName, task, context = {}) {
    try {
      logger.info(`🌊 [LLM STREAM COLLAB] Starting streaming collaboration with ${agentName}:`, {
        taskLength: task.length,
        taskPreview: task.substring(0, 200) + '...',
        model: this.model.model
      });

      let fullResponse = '';
      let chunkCount = 0;
      
      // Create streaming callback that forwards chunks to the frontend
      const streamingCallback = (chunkData) => {
        chunkCount++;
        fullResponse += chunkData.content;
        
        // Send progressive content to frontend
        if (context.streamingCallback) {
          context.streamingCallback({
            type: 'message',
            agent: agentName,
            content: chunkData.content,
            fullContent: fullResponse,
            chunkNumber: chunkCount,
            status: `Generating response... (${chunkCount} chunks)`,
            timestamp: new Date().toISOString()
          });
        }
      };

      // Use rate-limited streaming request
      const result = await this.rateLimitedRequest(async () => {
        const streamGenerator = getPromptResponseStream(this.model, task, streamingCallback);
        
        // Consume the stream to get the full response
        for await (const chunk of streamGenerator) {
          // The streaming callback already handles each chunk
          // This loop just consumes the generator
        }
        
        // Return the final result
        return {
          promptResponse: fullResponse,
          fullResponse: fullResponse,
          chunkCount: chunkCount
        };
      });

      const responseText = result.fullResponse || result.promptResponse || fullResponse;
      
      logger.info(`✅ [LLM STREAM COLLAB] Streaming collaboration complete for ${agentName}:`, {
        responseLength: responseText.length,
        chunkCount: chunkCount,
        responsePreview: responseText.substring(0, 200) + '...'
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
          chunkCount: chunkCount,
          callCount: RATE_LIMIT.totalCalls,
          streamingEnabled: true
        }
      };

      return collaborationResult;
      
    } catch (error) {
      logger.error(`❌ [LLM STREAM COLLAB] Error in streaming collaboration with ${agentName}:`, error);
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
        const genAI = generateGoogleGeminiClient();
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        return await getPromptResponse(model, contextPrompt);
      });

      const response = result.promptResponse || result;
      
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
  async buildCollaborationPrompt(agentName, task, context) {
    try {
      // Use dynamic prompt generation for collaboration prompts
      const { DynamicPromptGenerationService } = await import('../DynamicPromptGenerationService.js');
      const promptGenerator = new DynamicPromptGenerationService();
      
      const dynamicPrompt = await promptGenerator.getAgentCollaborationPrompt(agentName, task, {
        domain: context.domain || 'software_development',
        complexity: context.complexity || 'medium',
        integrationNeeds: context.integrationNeeds || 'standard',
        userContext: context.userContext || {},
        requirements: context.requirements || 'general'
      });
      
      logger.info('✅ Dynamic collaboration prompt generated for:', agentName);
      return dynamicPrompt;
      
    } catch (error) {
      logger.error('❌ Dynamic prompt generation failed, using fallback:', error);
      return this.buildFallbackCollaborationPrompt(agentName, task, context);
    }
  }

  buildFallbackCollaborationPrompt(agentName, task, context) {
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
      model: 'gemini-1.5-flash',
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
      const result = await this.rateLimitedRequest(async () => {
        return await getPromptResponse(this.model, prompt);
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