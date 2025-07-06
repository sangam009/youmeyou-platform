import logger from '../../utils/logger.js';
import { ConversationalAgent } from './ConversationalAgent.js';
import { LLMAgent } from '../LLMAgent.js';

/**
 * Agent specifically designed for casual, non-technical conversations
 */
export class CasualConversationAgent extends ConversationalAgent {
  constructor() {
    super('Casual Assistant', 'Friendly Conversation Expert');
    this.llmAgent = LLMAgent.getInstance();
    logger.info('👋 CasualConversationAgent initialized for friendly chats');
  }

  /**
   * Handle casual conversations with appropriate tone and style
   */
  async execute(userQuery, context = {}) {
    try {
      logger.info('👋 Starting casual conversation:', {
        query: userQuery.substring(0, 100),
        hasContext: !!context
      });

      // Stream initial status if streaming enabled
      if (context.streamingEnabled && context.streamingCallback) {
        context.streamingCallback({
          type: 'agent_start',
          agent: this.agentName,
          status: 'Starting friendly chat...',
          completionScore: 0,
          timestamp: new Date().toISOString()
        });
      }

      // Generate casual conversation prompt
      const prompt = `You are a friendly AI assistant named ${this.agentName}.
      Respond to this casual message: "${userQuery}"
      
      Guidelines:
      - Keep it natural and conversational
      - Be friendly and approachable
      - Keep responses brief and to the point
      - Don't do any technical analysis
      - Match the user's tone and energy
      - If they're saying hello, greet them back warmly
      
      Previous context (if any):
      ${context.conversationContext || 'No previous context'}`;

      // Get LLM response with streaming if enabled
      const llmResponse = await this.llmAgent.collaborateWithAgent(
        this.agentName,
        prompt,
        context
      );

      // Stream completion if streaming enabled
      if (context.streamingEnabled && context.streamingCallback) {
        context.streamingCallback({
          type: 'agent_complete',
          agent: this.agentName,
          status: 'Chat complete!',
          completionScore: 100,
          timestamp: new Date().toISOString()
        });
      }

      return {
        agentId: 'casual-conversation',
        agentName: this.agentName,
        response: {
          content: llmResponse.response,
          analysis: userQuery,
          suggestions: []
        },
        executedAt: new Date(),
        metadata: {
          conversationType: 'casual',
          executionType: 'simple'
        }
      };

    } catch (error) {
      logger.error('❌ Error in casual conversation:', error);
      throw error;
    }
  }
} 