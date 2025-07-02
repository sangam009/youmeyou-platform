import logger from '../utils/logger.js';
import { vectorDB } from './VectorDBService.js';
import canvasService from './canvasService.js';

/**
 * Action Executor Service
 * Handles agent actions like canvas updates and code generation
 */
export class ActionExecutor {
  constructor() {
    this.actionHandlers = {
      'update_canvas': this.handleCanvasUpdate.bind(this),
      'create_canvas': this.handleCanvasCreation.bind(this),
      'generate_code': this.handleCodeGeneration.bind(this),
      'update_architecture': this.handleArchitectureUpdate.bind(this),
      'create_diagram': this.handleDiagramCreation.bind(this)
    };
  }

  /**
   * Execute action based on agent response
   */
  async executeAction(userId, projectId, actionData, context = {}) {
    try {
      const { actionType, payload, agentName } = actionData;
      
      logger.info(`🎯 Executing action: ${actionType} for user ${userId}, project ${projectId}`);

      // Store action in vector DB
      await vectorDB.storeAgentAction(userId, projectId, {
        agentName,
        action: actionType,
        decision: 'execute',
        reasoning: `Executing ${actionType} action`,
        timestamp: new Date().toISOString()
      });

      // Execute the action
      const handler = this.actionHandlers[actionType];
      if (!handler) {
        throw new Error(`Unknown action type: ${actionType}`);
      }

      const result = await handler(userId, projectId, payload, context);
      
      logger.info(`✅ Action ${actionType} executed successfully`);
      return result;

    } catch (error) {
      logger.error(`❌ Error executing action ${actionData.actionType}:`, error);
      
      // Store failed action
      await vectorDB.storeAgentAction(userId, projectId, {
        agentName: actionData.agentName,
        action: actionData.actionType,
        decision: 'failed',
        reasoning: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Handle canvas update action
   */
  async handleCanvasUpdate(userId, projectId, payload, context) {
    try {
      const { canvasId, updates, description } = payload;
      
      logger.info(`🎨 Updating canvas ${canvasId} for project ${projectId}`);

      // Get current canvas state
      const currentCanvas = await canvasService.getCanvas(canvasId);
      if (!currentCanvas) {
        throw new Error(`Canvas ${canvasId} not found`);
      }

      // Apply updates
      const updatedCanvas = await canvasService.updateCanvas(canvasId, {
        ...currentCanvas,
        ...updates,
        lastModified: new Date(),
        modifiedBy: userId
      });

      // Store canvas action in vector DB
      await vectorDB.storeCanvasAction(userId, projectId, {
        actionType: 'update_canvas',
        canvasState: updatedCanvas,
        description: description || 'Canvas updated by agent',
        agentName: context.agentName || 'unknown',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        canvasId,
        updatedCanvas,
        action: 'canvas_updated'
      };

    } catch (error) {
      logger.error('❌ Error updating canvas:', error);
      throw error;
    }
  }

  /**
   * Handle canvas creation action
   */
  async handleCanvasCreation(userId, projectId, payload, context) {
    try {
      const { canvasData, description } = payload;
      
      logger.info(`🎨 Creating new canvas for project ${projectId}`);

      // Create new canvas
      const newCanvas = await canvasService.createCanvas({
        ...canvasData,
        projectId,
        createdBy: userId,
        createdAt: new Date(),
        lastModified: new Date()
      });

      // Store canvas action in vector DB
      await vectorDB.storeCanvasAction(userId, projectId, {
        actionType: 'create_canvas',
        canvasState: newCanvas,
        description: description || 'New canvas created by agent',
        agentName: context.agentName || 'unknown',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        canvasId: newCanvas.id,
        newCanvas,
        action: 'canvas_created'
      };

    } catch (error) {
      logger.error('❌ Error creating canvas:', error);
      throw error;
    }
  }

  /**
   * Handle code generation action
   */
  async handleCodeGeneration(userId, projectId, payload, context) {
    try {
      const { codeType, code, description, fileName, language } = payload;
      
      logger.info(`💻 Generating ${codeType} code for project ${projectId}`);

      // Store code in vector DB
      await vectorDB.storeCodeAction(userId, projectId, {
        codeType,
        code,
        description: description || `${codeType} code generated`,
        agentName: context.agentName || 'unknown',
        timestamp: new Date().toISOString()
      });

      // TODO: Save code to file system or database
      // This would integrate with your existing code storage system

      return {
        success: true,
        codeType,
        fileName: fileName || `${codeType}_${Date.now()}.${language || 'js'}`,
        codeLength: code.length,
        action: 'code_generated'
      };

    } catch (error) {
      logger.error('❌ Error generating code:', error);
      throw error;
    }
  }

  /**
   * Handle architecture update action
   */
  async handleArchitectureUpdate(userId, projectId, payload, context) {
    try {
      const { architectureData, description } = payload;
      
      logger.info(`🏗️ Updating architecture for project ${projectId}`);

      // Update project architecture
      // This would integrate with your project management system
      const updatedArchitecture = {
        ...architectureData,
        updatedAt: new Date(),
        updatedBy: userId
      };

      // Store in vector DB
      await vectorDB.storeAgentAction(userId, projectId, {
        agentName: context.agentName || 'unknown',
        action: 'update_architecture',
        decision: 'architecture_updated',
        reasoning: description || 'Architecture updated by agent',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        architecture: updatedArchitecture,
        action: 'architecture_updated'
      };

    } catch (error) {
      logger.error('❌ Error updating architecture:', error);
      throw error;
    }
  }

  /**
   * Handle diagram creation action
   */
  async handleDiagramCreation(userId, projectId, payload, context) {
    try {
      const { diagramType, diagramData, description } = payload;
      
      logger.info(`📊 Creating ${diagramType} diagram for project ${projectId}`);

      // Create diagram (this could be Mermaid, PlantUML, etc.)
      const diagram = {
        type: diagramType,
        data: diagramData,
        createdAt: new Date(),
        createdBy: userId,
        projectId
      };

      // Store in vector DB
      await vectorDB.storeAgentAction(userId, projectId, {
        agentName: context.agentName || 'unknown',
        action: 'create_diagram',
        decision: 'diagram_created',
        reasoning: description || `${diagramType} diagram created`,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        diagram,
        action: 'diagram_created'
      };

    } catch (error) {
      logger.error('❌ Error creating diagram:', error);
      throw error;
    }
  }

  /**
   * Parse LLM response for actions
   */
  parseActionsFromLLMResponse(llmResponse) {
    try {
      const actions = [];
      
      // Look for action patterns in LLM response
      const actionPatterns = [
        /\[ACTION:(\w+)\](.*?)\[\/ACTION\]/gs,
        /```action\s+(\w+)\s*\n(.*?)\n```/gs,
        /ACTION_(\w+):\s*(.*?)(?=\n|$)/gs
      ];

      for (const pattern of actionPatterns) {
        let match;
        while ((match = pattern.exec(llmResponse)) !== null) {
          const actionType = match[1].toLowerCase();
          const payload = this.parseActionPayload(match[2]);
          
          if (payload) {
            actions.push({
              actionType,
              payload,
              confidence: 0.8
            });
          }
        }
      }

      return actions;
    } catch (error) {
      logger.error('❌ Error parsing actions from LLM response:', error);
      return [];
    }
  }

  /**
   * Parse action payload from text
   */
  parseActionPayload(payloadText) {
    try {
      // Try to parse as JSON first
      if (payloadText.trim().startsWith('{')) {
        return JSON.parse(payloadText);
      }

      // Parse structured text
      const payload = {};
      const lines = payloadText.split('\n');
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          payload[key.trim()] = value;
        }
      }

      return Object.keys(payload).length > 0 ? payload : null;
    } catch (error) {
      logger.error('❌ Error parsing action payload:', error);
      return null;
    }
  }

  /**
   * Get available actions
   */
  getAvailableActions() {
    return Object.keys(this.actionHandlers).map(actionType => ({
      actionType,
      description: this.getActionDescription(actionType)
    }));
  }

  /**
   * Get action description
   */
  getActionDescription(actionType) {
    const descriptions = {
      'update_canvas': 'Update existing canvas with new content or structure',
      'create_canvas': 'Create a new canvas for the project',
      'generate_code': 'Generate code files or snippets',
      'update_architecture': 'Update project architecture and design',
      'create_diagram': 'Create visual diagrams (Mermaid, PlantUML, etc.)'
    };
    
    return descriptions[actionType] || 'Unknown action type';
  }
}

// Singleton instance
export const actionExecutor = new ActionExecutor(); 