import { ChromaClient, Collection } from 'chromadb';
import logger from '../utils/logger.js';

/**
 * Vector Database Service for Conversation History
 * Uses ChromaDB for scalable conversation storage and semantic search
 */
export class VectorDBService {
  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://chromadb:8000'
    });
    this.collections = {
      conversations: null,
      canvasHistory: null,
      codeHistory: null,
      agentActions: null
    };
    this.isInitialized = false;
    this.initializeCollections();
  }

  async initializeCollections() {
    try {
      logger.info('🔧 Initializing VectorDB collections...');
      
      // Create or get collections
      this.collections.conversations = await this.getOrCreateCollection(
        'conversations',
        'Conversation history with semantic search'
      );
      
      this.collections.canvasHistory = await this.getOrCreateCollection(
        'canvas_history',
        'Canvas state changes and updates'
      );
      
      this.collections.codeHistory = await this.getOrCreateCollection(
        'code_history',
        'Generated code and snippets'
      );
      
      this.collections.agentActions = await this.getOrCreateCollection(
        'agent_actions',
        'Agent actions and decisions'
      );

      this.isInitialized = true;
      logger.info('✅ VectorDB collections initialized successfully');
    } catch (error) {
      logger.error('❌ VectorDB initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async getOrCreateCollection(name, description) {
    try {
      return await this.client.getCollection({
        name,
        metadata: { description }
      });
    } catch (error) {
      // Collection doesn't exist, create it
      return await this.client.createCollection({
        name,
        metadata: { description }
      });
    }
  }

  /**
   * Store conversation turn with metadata
   */
  async storeConversationTurn(userId, projectId, turnData) {
    if (!this.isInitialized) {
      logger.warn('VectorDB not initialized, skipping conversation storage');
      return;
    }

    try {
      const {
        turnNumber,
        userMessage,
        agentResponse,
        agentName,
        completionScore,
        context,
        timestamp
      } = turnData;

      const documentId = `${userId}_${projectId}_${turnNumber}_${timestamp}`;
      
      // Combine user message and agent response for semantic search
      const combinedText = `User: ${userMessage}\nAgent: ${agentResponse}`;
      
      await this.collections.conversations.add({
        ids: [documentId],
        documents: [combinedText],
        metadatas: [{
          userId,
          projectId,
          turnNumber,
          agentName,
          completionScore,
          userMessage: userMessage.substring(0, 500), // Truncate for metadata
          agentResponse: agentResponse.substring(0, 500),
          context: JSON.stringify(context),
          timestamp,
          type: 'conversation_turn'
        }]
      });

      logger.info(`💾 Stored conversation turn ${turnNumber} for user ${userId}`);
    } catch (error) {
      logger.error('❌ Error storing conversation turn:', error);
    }
  }

  /**
   * Store canvas update action
   */
  async storeCanvasAction(userId, projectId, actionData) {
    if (!this.isInitialized) return;

    try {
      const {
        actionType,
        canvasState,
        description,
        agentName,
        timestamp
      } = actionData;

      const documentId = `canvas_${userId}_${projectId}_${timestamp}`;
      
      await this.collections.canvasHistory.add({
        ids: [documentId],
        documents: [description],
        metadatas: [{
          userId,
          projectId,
          actionType,
          agentName,
          canvasState: JSON.stringify(canvasState),
          timestamp,
          type: 'canvas_action'
        }]
      });

      logger.info(`🎨 Stored canvas action ${actionType} for user ${userId}`);
    } catch (error) {
      logger.error('❌ Error storing canvas action:', error);
    }
  }

  /**
   * Store code generation action
   */
  async storeCodeAction(userId, projectId, codeData) {
    if (!this.isInitialized) return;

    try {
      const {
        codeType,
        code,
        description,
        agentName,
        timestamp
      } = codeData;

      const documentId = `code_${userId}_${projectId}_${timestamp}`;
      
      await this.collections.codeHistory.add({
        ids: [documentId],
        documents: [code],
        metadatas: [{
          userId,
          projectId,
          codeType,
          agentName,
          description,
          timestamp,
          type: 'code_action'
        }]
      });

      logger.info(`💻 Stored code action ${codeType} for user ${userId}`);
    } catch (error) {
      logger.error('❌ Error storing code action:', error);
    }
  }

  /**
   * Store agent action/decision
   */
  async storeAgentAction(userId, projectId, actionData) {
    if (!this.isInitialized) return;

    try {
      const {
        agentName,
        action,
        decision,
        reasoning,
        timestamp
      } = actionData;

      const documentId = `agent_${userId}_${projectId}_${timestamp}`;
      
      await this.collections.agentActions.add({
        ids: [documentId],
        documents: [reasoning],
        metadatas: [{
          userId,
          projectId,
          agentName,
          action,
          decision,
          timestamp,
          type: 'agent_action'
        }]
      });

      logger.info(`🤖 Stored agent action for ${agentName}`);
    } catch (error) {
      logger.error('❌ Error storing agent action:', error);
    }
  }

  /**
   * Search conversation history semantically
   */
  async searchConversations(userId, projectId, query, limit = 5) {
    if (!this.isInitialized) return [];

    try {
      const results = await this.collections.conversations.query({
        queryTexts: [query],
        nResults: limit,
        where: {
          userId,
          projectId,
          type: 'conversation_turn'
        }
      });

      return results.metadatas[0] || [];
    } catch (error) {
      logger.error('❌ Error searching conversations:', error);
      return [];
    }
  }

  /**
   * Get conversation context for agent
   */
  async getConversationContext(userId, projectId, limit = 10) {
    if (!this.isInitialized) return [];

    try {
      const results = await this.collections.conversations.query({
        queryTexts: ['recent conversation context'],
        nResults: limit,
        where: {
          userId,
          projectId,
          type: 'conversation_turn'
        }
      });

      return results.metadatas[0] || [];
    } catch (error) {
      logger.error('❌ Error getting conversation context:', error);
      return [];
    }
  }

  /**
   * Get canvas history for project
   */
  async getCanvasHistory(userId, projectId, limit = 5) {
    if (!this.isInitialized) return [];

    try {
      const results = await this.collections.canvasHistory.query({
        queryTexts: ['canvas updates'],
        nResults: limit,
        where: {
          userId,
          projectId,
          type: 'canvas_action'
        }
      });

      return results.metadatas[0] || [];
    } catch (error) {
      logger.error('❌ Error getting canvas history:', error);
      return [];
    }
  }

  /**
   * Get code history for project
   */
  async getCodeHistory(userId, projectId, codeType = null, limit = 5) {
    if (!this.isInitialized) return [];

    try {
      const where = {
        userId,
        projectId,
        type: 'code_action'
      };

      if (codeType) {
        where.codeType = codeType;
      }

      const results = await this.collections.codeHistory.query({
        queryTexts: ['code generation'],
        nResults: limit,
        where
      });

      return results.metadatas[0] || [];
    } catch (error) {
      logger.error('❌ Error getting code history:', error);
      return [];
    }
  }

  /**
   * Get agent actions for project
   */
  async getAgentActions(userId, projectId, agentName = null, limit = 10) {
    if (!this.isInitialized) return [];

    try {
      const where = {
        userId,
        projectId,
        type: 'agent_action'
      };

      if (agentName) {
        where.agentName = agentName;
      }

      const results = await this.collections.agentActions.query({
        queryTexts: ['agent decisions'],
        nResults: limit,
        where
      });

      return results.metadatas[0] || [];
    } catch (error) {
      logger.error('❌ Error getting agent actions:', error);
      return [];
    }
  }

  /**
   * Delete project data
   */
  async deleteProjectData(userId, projectId) {
    if (!this.isInitialized) return;

    try {
      // Delete from all collections
      await Promise.all([
        this.collections.conversations.delete({
          where: { userId, projectId }
        }),
        this.collections.canvasHistory.delete({
          where: { userId, projectId }
        }),
        this.collections.codeHistory.delete({
          where: { userId, projectId }
        }),
        this.collections.agentActions.delete({
          where: { userId, projectId }
        })
      ]);

      logger.info(`🗑️ Deleted project data for user ${userId}, project ${projectId}`);
    } catch (error) {
      logger.error('❌ Error deleting project data:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    if (!this.isInitialized) return null;

    try {
      const stats = {};
      
      for (const [name, collection] of Object.entries(this.collections)) {
        const count = await collection.count();
        stats[name] = count;
      }

      return stats;
    } catch (error) {
      logger.error('❌ Error getting storage stats:', error);
      return null;
    }
  }
}

// Singleton instance
export const vectorDB = new VectorDBService(); 