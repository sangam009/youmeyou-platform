import logger from '../utils/logger.js';
import canvasService from './canvasService.js';

/**
 * Simple Action Executor - Handles real-time canvas updates and component actions
 */
export class SimpleActionExecutor {
  constructor(canvasState, userId) {
    this.canvasState = canvasState || {};
    this.userId = userId;
    this.executedActions = [];
    
    logger.info('🎯 SimpleActionExecutor initialized:', {
      userId,
      hasCanvasState: !!canvasState
    });
  }

  /**
   * Execute action based on type
   */
  async executeAction(actionData) {
    try {
      const { type, data } = actionData;
      
      logger.info('⚡ Executing action:', {
        type,
        dataKeys: Object.keys(data || {})
      });

      let result;
      
      switch (type) {
        case 'canvas_update':
          result = await this.updateCanvas(data);
          break;
          
        case 'add_component':
          result = await this.addComponent(data);
          break;
          
        case 'update_component':
          result = await this.updateComponent(data);
          break;
          
        case 'remove_component':
          result = await this.removeComponent(data);
          break;
          
        case 'add_connection':
          result = await this.addConnection(data);
          break;
          
        case 'update_metadata':
          result = await this.updateMetadata(data);
          break;
          
        default:
          logger.warn('⚠️ Unknown action type:', type);
          result = { success: false, message: `Unknown action type: ${type}` };
      }

      // Track executed action
      this.executedActions.push({
        type,
        data,
        result,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      logger.error('❌ Action execution failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update canvas state
   */
  async updateCanvas(data) {
    try {
      // Update local canvas state
      this.canvasState = {
        ...this.canvasState,
        ...data
      };

      // If we have a canvas ID, update in database
      if (this.canvasState.canvasId) {
        await canvasService.updateCanvas(this.canvasState.canvasId, data);
      }

      logger.info('✅ Canvas updated successfully');
      return {
        success: true,
        message: 'Canvas updated successfully',
        updatedFields: Object.keys(data)
      };

    } catch (error) {
      logger.error('❌ Canvas update failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add component to canvas
   */
  async addComponent(data) {
    try {
      const {
        name,
        type,
        position = { x: 100, y: 100 },
        properties = {},
        connections = []
      } = data;

      const component = {
        id: `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        type,
        position,
        properties,
        connections,
        createdAt: new Date().toISOString()
      };

      // Add to local canvas state
      if (!this.canvasState.components) {
        this.canvasState.components = [];
      }
      this.canvasState.components.push(component);

      // Update in database if canvas exists
      if (this.canvasState.canvasId) {
        await canvasService.updateCanvas(this.canvasState.canvasId, {
          components: this.canvasState.components
        });
      }

      logger.info('✅ Component added successfully:', component.id);
      return {
        success: true,
        message: 'Component added successfully',
        component
      };

    } catch (error) {
      logger.error('❌ Add component failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update existing component
   */
  async updateComponent(data) {
    try {
      const { id, ...updates } = data;
      
      if (!this.canvasState.components) {
        return {
          success: false,
          error: 'No components found in canvas'
        };
      }

      const componentIndex = this.canvasState.components.findIndex(c => c.id === id);
      
      if (componentIndex === -1) {
        return {
          success: false,
          error: `Component with id ${id} not found`
        };
      }

      // Update component
      this.canvasState.components[componentIndex] = {
        ...this.canvasState.components[componentIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Update in database if canvas exists
      if (this.canvasState.canvasId) {
        await canvasService.updateCanvas(this.canvasState.canvasId, {
          components: this.canvasState.components
        });
      }

      logger.info('✅ Component updated successfully:', id);
      return {
        success: true,
        message: 'Component updated successfully',
        component: this.canvasState.components[componentIndex]
      };

    } catch (error) {
      logger.error('❌ Update component failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove component from canvas
   */
  async removeComponent(data) {
    try {
      const { id } = data;
      
      if (!this.canvasState.components) {
        return {
          success: false,
          error: 'No components found in canvas'
        };
      }

      const initialLength = this.canvasState.components.length;
      this.canvasState.components = this.canvasState.components.filter(c => c.id !== id);

      if (this.canvasState.components.length === initialLength) {
        return {
          success: false,
          error: `Component with id ${id} not found`
        };
      }

      // Update in database if canvas exists
      if (this.canvasState.canvasId) {
        await canvasService.updateCanvas(this.canvasState.canvasId, {
          components: this.canvasState.components
        });
      }

      logger.info('✅ Component removed successfully:', id);
      return {
        success: true,
        message: 'Component removed successfully',
        removedId: id
      };

    } catch (error) {
      logger.error('❌ Remove component failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add connection between components
   */
  async addConnection(data) {
    try {
      const { from, to, type = 'default', properties = {} } = data;

      const connection = {
        id: `connection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from,
        to,
        type,
        properties,
        createdAt: new Date().toISOString()
      };

      // Add to local canvas state
      if (!this.canvasState.connections) {
        this.canvasState.connections = [];
      }
      this.canvasState.connections.push(connection);

      // Update in database if canvas exists
      if (this.canvasState.canvasId) {
        await canvasService.updateCanvas(this.canvasState.canvasId, {
          connections: this.canvasState.connections
        });
      }

      logger.info('✅ Connection added successfully:', connection.id);
      return {
        success: true,
        message: 'Connection added successfully',
        connection
      };

    } catch (error) {
      logger.error('❌ Add connection failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update canvas metadata
   */
  async updateMetadata(data) {
    try {
      // Update local canvas state metadata
      if (!this.canvasState.metadata) {
        this.canvasState.metadata = {};
      }
      
      this.canvasState.metadata = {
        ...this.canvasState.metadata,
        ...data,
        updatedAt: new Date().toISOString()
      };

      // Update in database if canvas exists
      if (this.canvasState.canvasId) {
        await canvasService.updateCanvas(this.canvasState.canvasId, {
          metadata: this.canvasState.metadata
        });
      }

      logger.info('✅ Metadata updated successfully');
      return {
        success: true,
        message: 'Metadata updated successfully',
        metadata: this.canvasState.metadata
      };

    } catch (error) {
      logger.error('❌ Update metadata failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory() {
    return this.executedActions;
  }

  /**
   * Get current canvas state
   */
  getCurrentCanvasState() {
    return this.canvasState;
  }
} 