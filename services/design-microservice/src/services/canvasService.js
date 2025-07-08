import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import Canvas from '../models/canvasModel.js';
import CanvasContent from '../models/canvasContentModel.js';
import { v4 as uuidv4 } from 'uuid';
import ProjectMetadataModel from '../models/projectMetadataModel.js';
import CanvasContentModel from '../models/canvasContentModel.js';
class CanvasService {
  constructor() {
    this.projectMetadataModel = new ProjectMetadataModel();
    this.canvasContentModel = new CanvasContentModel();
  }

  async createCanvas(userId, projectId, canvasData) {
    try {
      // Create new canvas
      const canvas = await Canvas.create({
        userId,
        projectId,
        ...canvasData
      });

      // Initialize canvas with architecture design
      const context = {
        userId,
        projectId,
        canvasId: canvas._id,
        requirements: canvasData.requirements || []
      };

      const task = {
        type: 'architecture_design',
        requirements: canvasData.requirements
      };

      // Get initial architecture design using direct agent import
      const { ArchitectureDesignerAgent } = await import('./agents/ArchitectureDesignerAgent.js');
      const architectureAgent = new ArchitectureDesignerAgent();
      const design = await architectureAgent.execute(task.requirements.join(', '), context);

      // Update canvas with design
      canvas.content = {
        design: design.design,
        diagram: design.diagram,
        documentation: design.documentation,
        analysis: design.analysis
      };

      await canvas.save();
      return canvas;
    } catch (error) {
      logger.error('Error creating canvas:', error);
      throw error;
    }
  }

  async updateCanvas(canvasId, updates) {
    try {
      const canvas = await Canvas.findById(canvasId);
      if (!canvas) {
        throw new Error('Canvas not found');
      }

      // Prepare context for agents
      const context = {
        userId: canvas.userId,
        projectId: canvas.projectId,
        canvasId: canvas._id,
        currentDesign: canvas.content.design,
        requirements: updates.requirements || canvas.requirements,
        performance: updates.performance || {}
      };

      // Handle different types of updates
      if (updates.type === 'architecture_update' || 
         updates.type === 'database_design' || 
         updates.type === 'api_design' || 
         updates.type === 'code_generation') {
        const task = {
          type: updates.type,
          requirements: updates.requirements,
          currentState: canvas.content
        };

        const { ArchitectureDesignerAgent } = await import('./agents/ArchitectureDesignerAgent.js');
        const architectureAgent = new ArchitectureDesignerAgent();
        const result = await architectureAgent.execute(updates.requirements.join(', '), {
          ...context,
          taskType: updates.type,
          currentState: canvas.content
        });

        // Update canvas based on task type
        switch(updates.type) {
          case 'architecture_update':
            canvas.content = {
              ...canvas.content,
              design: result.design,
              diagram: result.diagram || 'Architecture diagram',
              documentation: result.documentation,
              analysis: result.analysis
            };
            break;

          case 'database_design':
            canvas.content = {
              ...canvas.content,
              databaseSchema: result.design?.schema || result.design,
              erDiagram: result.design?.diagram || 'ER diagram',
              queryOptimization: result.design?.optimization,
              indexingStrategy: result.design?.indexing,
              schemaValidation: result.design?.validation
            };
            break;

          case 'api_design':
            canvas.content = {
              ...canvas.content,
              apiDesign: result.design?.endpoints || result.design,
              authentication: result.design?.authentication,
              documentation: result.design?.documentation,
              errorHandling: result.design?.errorResponses
            };
            break;

          case 'code_generation':
            canvas.content = {
              ...canvas.content,
              generatedCode: result.design?.code || result.design,
              tests: result.design?.tests,
              documentation: result.design?.documentation,
              dependencies: result.design?.dependencies
            };
            break;
        }
      }
      else if (updates.type === 'documentation_update') {
        const task = {
          type: 'documentation',
          content: canvas.content
        };

        const { ArchitectureDesignerAgent } = await import('./agents/ArchitectureDesignerAgent.js');
        const architectureAgent = new ArchitectureDesignerAgent();
        const result = await architectureAgent.execute('Generate documentation for this project', {
          ...context,
          taskType: 'documentation'
        });
        canvas.content.documentation = result.documentation || result.response;
      }

      // Save updates
      await canvas.save();
      return canvas;
    } catch (error) {
      logger.error('Error updating canvas:', error);
      throw error;
    }
  }

  async analyzeCanvas(canvasId) {
    try {
      const canvas = await Canvas.findById(canvasId);
      if (!canvas) {
        throw new Error('Canvas not found');
      }

      const context = {
        userId: canvas.userId,
        projectId: canvas.projectId,
        canvasId: canvas._id,
        currentState: canvas.content
      };

      const { ArchitectureDesignerAgent } = await import('./agents/ArchitectureDesignerAgent.js');
      const architectureAgent = new ArchitectureDesignerAgent();
      
      // Analyze all aspects of the canvas
      const analysis = await architectureAgent.execute('Analyze current design state', {
        ...context,
        taskType: 'analysis',
        requirements: canvas.requirements
      });

      // Update canvas with analysis results
      canvas.content.analysis = analysis;
      await canvas.save();

      return canvas.content.analysis;
    } catch (error) {
      logger.error('Error analyzing canvas:', error);
      throw error;
    }
  }

  async getCanvas(canvasId) {
    try {
      const canvas = await Canvas.findById(canvasId);
      if (!canvas) {
        throw new Error('Canvas not found');
      }
      return canvas;
    } catch (error) {
      logger.error('Error fetching canvas:', error);
      throw error;
    }
  }

  async deleteCanvas(canvasId) {
    try {
      const result = await Canvas.findByIdAndDelete(canvasId);
      if (!result) {
        throw new Error('Canvas not found');
      }
      return { success: true };
    } catch (error) {
      logger.error('Error deleting canvas:', error);
      throw error;
    }
  }
}

const canvasService = new CanvasService();
export default canvasService;