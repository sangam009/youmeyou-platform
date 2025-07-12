import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Simple Gemini Service - Direct API calls with streaming and dual key support
 */
export class SimpleGeminiService {
  constructor() {
    this.primaryKey = process.env.GEMINI_API_KEY;
    this.secondaryKey = process.env.GEMINI_API_KEY_2 || 'AIzaSyDZCyoI4FFZPnsM7aysk5EIRuJsuN4F0Fs';
    this.currentKeyIndex = 0;
    this.model = null;
    this.initialized = false;
    
    logger.info('🤖 SimpleGeminiService initialized with dual key support');
  }

  /**
   * Initialize Gemini client with current key
   */
  async initialize() {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const currentKey = this.getCurrentKey();
      
      if (!currentKey) {
        throw new Error('No Gemini API key available');
      }

      const genAI = new GoogleGenerativeAI(currentKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.initialized = true;
      
      logger.info(`🤖 Gemini client initialized with key ${this.currentKeyIndex + 1}`);
    } catch (error) {
      logger.error('❌ Failed to initialize Gemini:', error);
      throw error;
    }
  }

  /**
   * Get current API key
   */
  getCurrentKey() {
    return this.currentKeyIndex === 0 ? this.primaryKey : this.secondaryKey;
  }

  /**
   * Switch to next available key
   */
  switchKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % 2;
    this.initialized = false;
    logger.info(`🔄 Switched to key ${this.currentKeyIndex + 1}`);
  }

  /**
   * Stream response with real-time action detection
   */
  async streamWithActions(prompt, res, actionExecutor) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      logger.info('📤 Starting Gemini stream:', {
        promptLength: prompt.length,
        keyIndex: this.currentKeyIndex + 1
      });

      // Start streaming
      const result = await this.model.generateContentStream(prompt);
      let fullResponse = '';
      let actionBuffer = '';
      let inAction = false;

      // Process stream chunks
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;

        // Check for actions in the chunk
        const processedChunk = await this.processChunkForActions(
          chunkText, 
          actionExecutor, 
          { actionBuffer, inAction }
        );

        actionBuffer = processedChunk.actionBuffer;
        inAction = processedChunk.inAction;

        // Send text chunk to client
        if (processedChunk.textToSend) {
          res.write(`event: message\ndata: ${JSON.stringify({
            type: 'text',
            content: processedChunk.textToSend
          })}\n\n`);
        }

        // Send action updates if any
        if (processedChunk.actions && processedChunk.actions.length > 0) {
          for (const action of processedChunk.actions) {
            res.write(`event: action\ndata: ${JSON.stringify(action)}\n\n`);
          }
        }
      }

      // Send completion event
      res.write(`event: complete\ndata: ${JSON.stringify({
        type: 'complete',
        fullResponse: fullResponse.trim()
      })}\n\n`);

      res.end();

      logger.info('✅ Gemini stream completed successfully');

    } catch (error) {
      logger.error('❌ Gemini streaming error:', error);
      
      // Try switching keys and retry once
      if (error.message.includes('API key') || error.message.includes('quota')) {
        logger.info('🔄 Retrying with alternate key...');
        this.switchKey();
        
        try {
          await this.initialize();
          return this.streamWithActions(prompt, res, actionExecutor);
        } catch (retryError) {
          logger.error('❌ Retry failed:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Process chunk for actions and extract text
   */
  async processChunkForActions(chunkText, actionExecutor, state) {
    let { actionBuffer, inAction } = state;
    let textToSend = '';
    let actions = [];

    // Process character by character to detect actions
    for (let i = 0; i < chunkText.length; i++) {
      const char = chunkText[i];

      if (!inAction && chunkText.substring(i).startsWith('ACTION:')) {
        inAction = true;
        actionBuffer = '';
        i += 6; // Skip "ACTION:"
        continue;
      }

      if (inAction) {
        actionBuffer += char;
        
        // Try to parse action when we have a complete JSON object
        if (char === '}' && this.isValidJSON(actionBuffer.trim())) {
          try {
            const actionData = JSON.parse(actionBuffer.trim());
            
            // Execute action immediately
            const executionResult = await actionExecutor.executeAction(actionData);
            
            actions.push({
              type: 'action_executed',
              action: actionData,
              result: executionResult
            });

            // Reset action parsing
            inAction = false;
            actionBuffer = '';
          } catch (parseError) {
            // Continue building action buffer if JSON is incomplete
            logger.debug('Action JSON incomplete, continuing...');
          }
        }
      } else {
        textToSend += char;
      }
    }

    return {
      textToSend,
      actions,
      actionBuffer,
      inAction
    };
  }

  /**
   * Check if string is valid JSON
   */
  isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }
} 