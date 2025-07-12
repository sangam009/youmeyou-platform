import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import { SimpleGeminiService } from './SimpleGeminiService.js';
import TaskPromptService from './TaskPromptService.js';
import { SimpleActionExecutor } from './SimpleActionExecutor.js';

/**
 * Enhanced Gemini Service - Handles intent classification and processing
 */
export class EnhancedGeminiService extends SimpleGeminiService {
  constructor() {
    super();
    this.taskPromptService = new TaskPromptService();
    
    logger.info('🚀 EnhancedGeminiService initialized');
  }

  /**
   * Classify intent of the prompt
   */
  async classifyIntent(prompt) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const classificationPrompt = `
Analyze this user prompt and classify its intent. Determine if it's casual conversation or technical work.

User Prompt: "${prompt}"

Please classify this prompt and return your response in this exact JSON format:
{
  "intent": "casual" or "technical",
  "confidence": 0.8,
  "reasoning": "Brief explanation of why this is classified as casual or technical",
  "subcategory": "specific subcategory if applicable"
}

Classification guidelines:
- CASUAL: Greetings, small talk, personal questions, general inquiries, casual conversation
- TECHNICAL: System design, architecture, coding, database design, API design, project planning, technical problem-solving

IMPORTANT: Only return the JSON object, nothing else.
`;

      logger.info('🎯 Classifying intent for prompt:', { 
        promptLength: prompt.length,
        preview: prompt.substring(0, 100) + '...'
      });

      const result = await this.model.generateContent(classificationPrompt);
      const responseText = result.response.text().trim();
      
      // Try to extract JSON from response
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const intentData = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!intentData.intent || !['casual', 'technical'].includes(intentData.intent)) {
        throw new Error('Invalid intent classification');
      }

      logger.info('✅ Intent classified successfully:', {
        intent: intentData.intent,
        confidence: intentData.confidence,
        subcategory: intentData.subcategory
      });

      return {
        success: true,
        data: intentData
      };

    } catch (error) {
      logger.error('❌ Failed to classify intent:', error);
      
      // Default to technical if classification fails
      return {
        success: false,
        data: {
          intent: 'technical',
          confidence: 0.5,
          reasoning: 'Classification failed, defaulting to technical',
          subcategory: 'general'
        },
        error: error.message
      };
    }
  }

  /**
   * Process casual conversation
   */
  async processCasualConversation(prompt, res) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const casualPrompt = `
You are a friendly and helpful AI assistant. The user is having a casual conversation with you.

User: "${prompt}"

Please respond in a casual, friendly, and helpful manner. Keep your response natural and conversational. If the user seems to be asking about technical topics, you can gently guide them towards more specific technical help.

Response:
`;

      logger.info('💬 Processing casual conversation:', { 
        promptLength: prompt.length
      });

      // Send intent classification event
      res.write(`event: intent\ndata: ${JSON.stringify({
        type: 'intent_classified',
        intent: 'casual',
        message: 'This looks like casual conversation. Let me chat with you!'
      })}\n\n`);

      // Stream the casual response
      const result = await this.model.generateContentStream(casualPrompt);
      let fullResponse = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;

        // Send text chunk to client
        res.write(`event: message\ndata: ${JSON.stringify({
          type: 'text',
          content: chunkText
        })}\n\n`);
      }

      // Send completion event
      res.write(`event: complete\ndata: ${JSON.stringify({
        type: 'complete',
        fullResponse: fullResponse.trim(),
        intent: 'casual'
      })}\n\n`);

      res.end();

      logger.info('✅ Casual conversation processed successfully');

    } catch (error) {
      logger.error('❌ Failed to process casual conversation:', error);
      
      // Try switching keys and retry once
      if (error.message.includes('API key') || error.message.includes('quota')) {
        logger.info('🔄 Retrying casual conversation with alternate key...');
        this.switchKey();
        
        try {
          await this.initialize();
          return this.processCasualConversation(prompt, res);
        } catch (retryError) {
          logger.error('❌ Casual conversation retry failed:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Process technical prompt with sub-task breakdown
   */
  async processTechnicalPrompt(prompt, res, canvasState = {}, userId = null) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      logger.info('🔧 Processing technical prompt:', { 
        promptLength: prompt.length,
        hasCanvasState: Object.keys(canvasState).length > 0,
        userId
      });

      // Send intent classification event
      res.write(`event: intent\ndata: ${JSON.stringify({
        type: 'intent_classified',
        intent: 'technical',
        message: 'This is a technical request. Let me break it down into manageable tasks.'
      })}\n\n`);

      // Step 1: Divide prompt into sub-prompts
      const subPromptResult = await this.taskPromptService.divideIntoSubPrompts(prompt, {
        canvasState,
        userId
      });

      if (!subPromptResult.success) {
        logger.warn('⚠️ Sub-prompt division failed, processing as single task');
      }

      const subPrompts = subPromptResult.data.subPrompts;
      const executionOrder = this.taskPromptService.getExecutionOrder(subPrompts);

      // Send task breakdown event
      res.write(`event: task_breakdown\ndata: ${JSON.stringify({
        type: 'task_breakdown',
        tasks: executionOrder.map(sp => ({
          id: sp.id,
          title: sp.title,
          sequence: sp.sequence
        })),
        totalTasks: executionOrder.length,
        executionStrategy: subPromptResult.data.executionStrategy
      })}\n\n`);

      // Step 2: Process each sub-prompt
      const actionExecutor = new SimpleActionExecutor(canvasState, userId);
      const completedResults = [];

      for (const subPrompt of executionOrder) {
        try {
          // Send task start event
          res.write(`event: task_start\ndata: ${JSON.stringify({
            type: 'task_start',
            task: {
              id: subPrompt.id,
              title: subPrompt.title,
              sequence: subPrompt.sequence
            }
          })}\n\n`);

          // Process sub-prompt
          const processResult = await this.taskPromptService.processSubPrompt(
            subPrompt,
            executionOrder,
            completedResults,
            actionExecutor.getCurrentCanvasState()
          );

          if (!processResult.success) {
            throw new Error(`Failed to process sub-prompt: ${processResult.error}`);
          }

          // Stream the sub-prompt response
          await this.streamSubPromptResponse(
            processResult.enhancedPrompt,
            subPrompt,
            res,
            actionExecutor
          );

          // Mark as completed
          completedResults.push({
            id: subPrompt.id,
            title: subPrompt.title,
            result: 'Completed successfully',
            timestamp: new Date().toISOString()
          });

          // Send task completion event
          res.write(`event: task_complete\ndata: ${JSON.stringify({
            type: 'task_complete',
            task: {
              id: subPrompt.id,
              title: subPrompt.title,
              sequence: subPrompt.sequence
            },
            completedTasks: completedResults.length,
            totalTasks: executionOrder.length
          })}\n\n`);

        } catch (subPromptError) {
          logger.error(`❌ Sub-prompt ${subPrompt.id} failed:`, subPromptError);
          
          // Send task error event
          res.write(`event: task_error\ndata: ${JSON.stringify({
            type: 'task_error',
            task: {
              id: subPrompt.id,
              title: subPrompt.title,
              sequence: subPrompt.sequence
            },
            error: subPromptError.message
          })}\n\n`);
        }
      }

      // Send final completion event
      res.write(`event: complete\ndata: ${JSON.stringify({
        type: 'complete',
        intent: 'technical',
        completedTasks: completedResults.length,
        totalTasks: executionOrder.length,
        canvasState: actionExecutor.getCurrentCanvasState(),
        executionHistory: actionExecutor.getExecutionHistory()
      })}\n\n`);

      res.end();

      logger.info('✅ Technical prompt processed successfully:', {
        completedTasks: completedResults.length,
        totalTasks: executionOrder.length
      });

    } catch (error) {
      logger.error('❌ Failed to process technical prompt:', error);
      
      // Try switching keys and retry once
      if (error.message.includes('API key') || error.message.includes('quota')) {
        logger.info('🔄 Retrying technical prompt with alternate key...');
        this.switchKey();
        
        try {
          await this.initialize();
          return this.processTechnicalPrompt(prompt, res, canvasState, userId);
        } catch (retryError) {
          logger.error('❌ Technical prompt retry failed:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Stream sub-prompt response with action detection
   */
  async streamSubPromptResponse(enhancedPrompt, subPrompt, res, actionExecutor) {
    try {
      // Start streaming
      const result = await this.model.generateContentStream(enhancedPrompt);
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
            content: processedChunk.textToSend,
            taskId: subPrompt.id,
            taskTitle: subPrompt.title
          })}\n\n`);
        }

        // Send action updates if any
        if (processedChunk.actions && processedChunk.actions.length > 0) {
          for (const action of processedChunk.actions) {
            res.write(`event: action\ndata: ${JSON.stringify({
              ...action,
              taskId: subPrompt.id,
              taskTitle: subPrompt.title
            })}\n\n`);
          }
        }
      }

      return {
        success: true,
        fullResponse: fullResponse.trim()
      };

    } catch (error) {
      logger.error('❌ Failed to stream sub-prompt response:', error);
      throw error;
    }
  }

  /**
   * Main processing method - handles both casual and technical prompts
   */
  async processPrompt(prompt, res, canvasState = {}, userId = null) {
    try {
      // Step 1: Classify intent
      const intentResult = await this.classifyIntent(prompt);
      
      if (!intentResult.success) {
        logger.warn('⚠️ Intent classification failed, defaulting to technical');
      }

      const intent = intentResult.data.intent;

      // Step 2: Process based on intent
      if (intent === 'casual') {
        await this.processCasualConversation(prompt, res);
      } else {
        await this.processTechnicalPrompt(prompt, res, canvasState, userId);
      }

    } catch (error) {
      logger.error('❌ Failed to process prompt:', error);
      
      // Send error event
      res.write(`event: error\ndata: ${JSON.stringify({
        type: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.end();
      throw error;
    }
  }
}

export default EnhancedGeminiService; 