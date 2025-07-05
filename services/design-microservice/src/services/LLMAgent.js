import { config } from '../config/index.js';
import logger from '../utils/logger.js';

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

  constructor() {
    if (LLMAgent.instance) {
      return LLMAgent.instance;
    }
    this.model = null;
    this.initialized = false;
    LLMAgent.instance = this;
  }

  static getInstance() {
    if (!LLMAgent.instance) {
      LLMAgent.instance = new LLMAgent();
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
      const apiKey = config.googleAI.apiKey;
      
      if (!apiKey) {
        logger.warn('⚠️ No Google AI API key found, LLM will run in mock mode');
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.initialized = true;
      
      logger.info('🤖 GoogleGenerativeAI client created');
      logger.info('🤖 [LLM INIT] LLMAgent initialized with Gemini 1.5 Flash (quota-optimized) - NO AUTO TEST');

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
} 