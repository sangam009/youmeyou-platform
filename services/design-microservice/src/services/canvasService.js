import mongoose from 'mongoose';
import logger from '/app/src/utils/logger.js';
import Canvas from '/app/src/models/canvasModel.js';
import CanvasContent from '/app/src/models/canvasContentModel.js';
import { v4 as uuidv4 } from 'uuid';
import ProjectMetadataModel from '/app/src/models/projectMetadataModel.js';
import CanvasContentModel from '/app/src/models/canvasContentModel.js';
import AgentOrchestrator from '/app/src/services/agents/AgentOrchestrator.js';

class CanvasService {
  constructor() {
    this.projectMetadataModel = new ProjectMetadataModel();
    this.canvasContentModel = new CanvasContentModel();
    this.agentOrchestrator = new AgentOrchestrator();
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

      // Get initial architecture design
      const design = await this.agentOrchestrator.routeTask(task, context);

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
      if (updates.type === 'code_generation') {
        const task = {
          type: 'code_generation',
          description: updates.description,
          language: updates.language,
          framework: updates.framework
        };

        const result = await this.agentOrchestrator.routeTask(task, context);
        canvas.content.generatedCode = result.code;
        canvas.content.codeAnalysis = result.analysis;
      } 
      else if (updates.type === 'architecture_update') {
        const task = {
          type: 'architecture_design',
          requirements: updates.requirements
        };

        const result = await this.agentOrchestrator.routeTask(task, context);
        canvas.content = {
          ...canvas.content,
          design: result.design,
          diagram: result.diagram,
          documentation: result.documentation,
          analysis: result.analysis
        };
      }
      else if (updates.type === 'database_design') {
        const task = {
          type: 'database_design',
          requirements: updates.requirements,
          currentSchema: canvas.content.databaseSchema
        };

        const result = await this.agentOrchestrator.routeTask(task, context);
        canvas.content = {
          ...canvas.content,
          databaseSchema: result.schema,
          erDiagram: result.erDiagram,
          queryOptimization: result.optimization,
          indexingStrategy: result.indexing,
          migrationPlan: result.migrationPlan,
          schemaValidation: result.validation,
          databaseOptimizations: result.optimizations
        };
      }
      else if (updates.type === 'documentation_update') {
        const task = {
          type: 'documentation',
          content: canvas.content
        };

        const result = await this.agentOrchestrator.routeTask(task, context);
        canvas.content.documentation = result.documentation;
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
        currentDesign: canvas.content.design,
        currentSchema: canvas.content.databaseSchema
      };

      // Analyze current design and schema
      const architectureTask = {
        type: 'code_analysis',
        code: canvas.content.generatedCode
      };

      const databaseTask = {
        type: 'database_design',
        requirements: canvas.requirements,
        currentSchema: canvas.content.databaseSchema
      };

      const [architectureAnalysis, databaseAnalysis] = await Promise.all([
        this.agentOrchestrator.routeTask(architectureTask, context),
        this.agentOrchestrator.routeTask(databaseTask, context)
      ]);
      
      // Update canvas with analysis results
      canvas.content.analysis = {
        architecture: architectureAnalysis,
        database: databaseAnalysis
      };
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

export default CanvasService;