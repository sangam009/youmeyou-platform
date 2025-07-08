import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * LLM Agent with optimized request handling and multi-key support
 */
export class LLMAgent {
  static instance = null;
  static secondaryInstance = null;
  static requestCache = new Map();
  static batchedRequests = [];
  static batchTimeout = null;
  static BATCH_DELAY = 100; // ms
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(useSecondaryKey = false) {
    if (useSecondaryKey && LLMAgent.secondaryInstance) {
      return LLMAgent.secondaryInstance;
    }
    if (!useSecondaryKey && LLMAgent.instance) {
      return LLMAgent.instance;
    }

    this.model = null;
    this.initialized = false;
    this.isSecondary = useSecondaryKey;

    if (useSecondaryKey) {
      LLMAgent.secondaryInstance = this;
    } else {
      LLMAgent.instance = this;
    }
  }

  static getInstance(useSecondaryKey = false) {
    if (useSecondaryKey) {
      if (!LLMAgent.secondaryInstance) {
        LLMAgent.secondaryInstance = new LLMAgent(true);
      }
      return LLMAgent.secondaryInstance;
    }

    if (!LLMAgent.instance) {
      LLMAgent.instance = new LLMAgent(false);
    }
    return LLMAgent.instance;
  }

  /**
   * Initialize LLM connection
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const apiKey = this.isSecondary ? config.googleAI.secondaryKey : config.googleAI.apiKey;
      
      if (!apiKey) {
        logger.warn(`⚠️ No Google AI API key found for ${this.isSecondary ? 'secondary' : 'primary'} instance, LLM will run in mock mode`);
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.initialized = true;
      
      logger.info(`🤖 GoogleGenerativeAI client created (${this.isSecondary ? 'secondary' : 'primary'} key)`);
      logger.info(`🤖 [LLM INIT] LLMAgent initialized with Gemini 1.5 Flash (${this.isSecondary ? 'secondary' : 'primary'} key) - NO AUTO TEST`);

    } catch (error) {
      logger.error('❌ Failed to initialize LLM:', error);
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
        isSecondary: this.isSecondary,
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
      // Group requests by key type
      const primaryRequests = requests.filter(r => !r.isSecondary);
      const secondaryRequests = requests.filter(r => r.isSecondary);

      // Process each group separately
      const [primaryResults, secondaryResults] = await Promise.all([
        this.processRequestGroup(primaryRequests, false),
        this.processRequestGroup(secondaryRequests, true)
      ]);

      // Combine results
      const results = [...primaryResults, ...secondaryResults];

      // Match results back to original requests
      requests.forEach((request, i) => {
        const result = results[this.findMatchingResult(request, request.isSecondary ? secondaryRequests : primaryRequests)];
        LLMAgent.cacheResponse(request.prompt, request.options, result);
        request.resolve(result);
      });

    } catch (error) {
      requests.forEach(request => request.reject(error));
    }
  }

  /**
   * Process a group of requests (primary or secondary)
   */
  async processRequestGroup(requests, isSecondary) {
    if (requests.length === 0) return [];

    const uniqueRequests = this.deduplicateRequests(requests);
    const instance = LLMAgent.getInstance(isSecondary);
    
    return Promise.all(
      uniqueRequests.map(request => instance.executeSingle(request.prompt, request.options))
    );
  }

  /**
   * Find matching result index for request
   */
  findMatchingResult(request, groupRequests) {
    return groupRequests.findIndex(ur => 
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
      logger.warn(`⚠️ LLM not initialized (${this.isSecondary ? 'secondary' : 'primary'}), returning mock response`);
      return { content: 'Mock LLM response' };
    }

    const requestId = `llm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('📤 [LLM REQUEST] Sending request to Gemini model:', {
        callId: requestId,
        keyType: this.isSecondary ? 'secondary' : 'primary',
        model: 'models/gemini-1.5-flash',
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + '...'
      });

      const startTime = Date.now();
      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      const duration = Date.now() - startTime;
      logger.info('📥 [LLM RESPONSE] Received response from Gemini model:', {
        callId: requestId,
        keyType: this.isSecondary ? 'secondary' : 'primary',
        duration: `${duration}ms`,
        responseLength: response.text().length
      });

      return response;

    } catch (error) {
      logger.error('❌ [LLM ERROR] Error executing LLM request:', {
        callId: requestId,
        keyType: this.isSecondary ? 'secondary' : 'primary',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Collaborate with another agent
   */
  async collaborateWithAgent(agent, task, context = {}) {
    if (!this.model) {
      logger.warn('⚠️ LLM not initialized, returning mock response');
      return {
        content: 'I understand you want help with architecture. Could you tell me more about what you\'re trying to build?',
        metadata: {
          model: 'mock',
          requestId: 'mock-request',
          responseTime: 0
        }
      };
    }

    const prompt = `Task: ${task}\nContext: ${JSON.stringify(context)}`;
    return this.execute(prompt, { agent });
  }
} 