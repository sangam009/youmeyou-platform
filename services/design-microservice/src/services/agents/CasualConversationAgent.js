import logger from '../../utils/logger.js';
import { LLMAgent } from '../LLMAgent.js';
import { ConversationalAgent } from './ConversationalAgent.js';

/**
 * Specialized agent for handling casual, non-technical conversations
 */
export class CasualConversationAgent extends ConversationalAgent {
  constructor(geminiKey) {
    super('Casual Conversation', 'friendly_chat');
    this.llmAgent = LLMAgent.getInstance(geminiKey);
    this.conversationHistory = new Map(); // Store conversation history by user
    logger.info('👋 CasualConversationAgent initialized');
  }

  /**
   * Handle casual conversations with appropriate tone and context
   */
  async execute(userQuery, context = {}) {
    try {
      logger.info('👋 Starting casual conversation:', {
        query: userQuery.substring(0, 100),
        hasContext: !!context
      });

      // Get user's conversation history
      const userId = context.userId || 'default';
      const history = this.getConversationHistory(userId);

      // Generate dynamic prompt based on conversation context
      const prompt = await this.generateConversationalPrompt(userQuery, history, context);

      // Get LLM response
      const response = await this.llmAgent.execute(prompt, {
        ...context,
        conversationType: 'casual',
        style: 'friendly'
      });

      // Update conversation history
      this.updateConversationHistory(userId, userQuery, response.content);

      return {
        content: response.content,
        type: 'casual_conversation',
        metadata: {
          conversationType: 'casual',
          tone: 'friendly',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ Error in casual conversation:', error);
      throw error;
    }
  }

  /**
   * Generate contextual conversation prompt
   */
  async generateConversationalPrompt(userQuery, history, context) {
    const recentHistory = history.slice(-3); // Get last 3 exchanges
    
    let prompt = `You are a friendly AI assistant engaging in casual conversation. 
Maintain a warm, approachable tone while staying professional.

Conversation history:
${recentHistory.map(h => `User: ${h.query}\nAssistant: ${h.response}\n`).join('\n')}

Current query: ${userQuery}

Guidelines:
1. Keep responses concise and natural
2. Show empathy and understanding
3. Stay within casual conversation boundaries
4. If technical questions arise, acknowledge them but suggest speaking with the technical team
5. Maintain consistent personality across conversations

Please provide a friendly, conversational response.`;

    return prompt;
  }

  /**
   * Get conversation history for user
   */
  getConversationHistory(userId) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    return this.conversationHistory.get(userId);
  }

  /**
   * Update conversation history
   */
  updateConversationHistory(userId, query, response) {
    const history = this.getConversationHistory(userId);
    history.push({
      query,
      response,
      timestamp: new Date().toISOString()
    });

    // Keep only last 10 exchanges
    if (history.length > 10) {
      history.shift();
    }

    this.conversationHistory.set(userId, history);
  }

  /**
   * Check if we should redirect to technical agents
   */
  shouldRedirectToTechnical(userQuery) {
    const technicalIndicators = [
      'architecture',
      'system',
      'design',
      'database',
      'api',
      'code',
      'project',
      'implementation',
      'technical'
    ];

    const query = userQuery.toLowerCase();
    return technicalIndicators.some(indicator => query.includes(indicator));
  }
} 