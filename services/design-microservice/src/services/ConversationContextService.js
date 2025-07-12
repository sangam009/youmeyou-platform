import logger from '../utils/logger.js';

/**
 * Manages conversation context with intelligent pruning
 */
export class ConversationContextService {
  static instance = null;
  static MAX_TURNS = 3; // Only keep last 3 turns
  static MAX_CONTEXT_SIZE = 2000; // Characters

  constructor() {
    if (ConversationContextService.instance) {
      return ConversationContextService.instance;
    }
    ConversationContextService.instance = this;
  }

  static getInstance() {
    if (!ConversationContextService.instance) {
      ConversationContextService.instance = new ConversationContextService();
    }
    return ConversationContextService.instance;
  }

  /**
   * Get relevant conversation context
   */
  async getContext(userId, projectId) {
    try {
      logger.info('📚 Retrieving conversation context for:', { userId, projectId });

      // Get last N turns
      const turns = await this.getLastNTurns(userId, projectId, ConversationContextService.MAX_TURNS);

      // Prune and optimize context
      const prunedContext = this.pruneContext(turns);

      logger.info('📚 Retrieved conversation context:', {
        turnCount: prunedContext.length,
        contextSize: JSON.stringify(prunedContext).length
      });

      return prunedContext;
    } catch (error) {
      logger.error('❌ Failed to get conversation context:', error);
      return [];
    }
  }

  /**
   * Get last N conversation turns
   */
  async getLastNTurns(userId, projectId, n) {
    // TODO: Implement actual DB/vector store query
    // For now return mock data
    return [];
  }

  /**
   * Intelligently prune conversation context
   */
  pruneContext(turns) {
    if (!turns || turns.length === 0) return [];

    // Keep only essential fields
    const prunedTurns = turns.map(turn => ({
      userMessage: turn.userMessage,
      agentResponse: turn.agentResponse,
      timestamp: turn.timestamp,
      intent: turn.intent
    }));

    // Limit context size
    let context = prunedTurns;
    let totalSize = JSON.stringify(context).length;

    while (totalSize > ConversationContextService.MAX_CONTEXT_SIZE && context.length > 1) {
      context = context.slice(1); // Remove oldest turn
      totalSize = JSON.stringify(context).length;
    }

    return context;
  }

  /**
   * Add new conversation turn
   */
  async addTurn(userId, projectId, turn) {
    try {
      // Validate turn data
      if (!turn.userMessage || !turn.agentResponse) {
        throw new Error('Invalid turn data');
      }

      // TODO: Implement actual storage
      logger.info('📝 Added new conversation turn:', {
        userId,
        projectId,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logger.error('❌ Failed to add conversation turn:', error);
      return false;
    }
  }
} 