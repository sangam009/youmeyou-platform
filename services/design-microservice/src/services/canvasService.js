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
      if (updates.type === 'code_generation') {
        const task = {
          type: 'code_generation',
          description: updates.description,
          language: updates.language,
          framework: updates.framework
        };

        const CodeGeneratorAgent = (await import('./agents/CodeGeneratorAgent.js')).default;
        const codeAgent = new CodeGeneratorAgent();
        const result = await codeAgent.execute(`Generate ${updates.language} code for: ${updates.description}`, context);
        canvas.content.generatedCode = result.code || result.response;
        canvas.content.codeAnalysis = result.analysis || 'Code generated';
      } 
      else if (updates.type === 'architecture_update') {
        const task = {
          type: 'architecture_design',
          requirements: updates.requirements
        };

        const { ArchitectureDesignerAgent } = await import('./agents/ArchitectureDesignerAgent.js');
        const architectureAgent = new ArchitectureDesignerAgent();
        const result = await architectureAgent.execute(updates.requirements.join(', '), context);
        canvas.content = {
          ...canvas.content,
          design: result.design || result.response,
          diagram: result.diagram || 'Architecture diagram',
          documentation: result.documentation || 'Architecture documentation',
          analysis: result.analysis || 'Architecture analysis'
        };
      }
      else if (updates.type === 'database_design') {
        const task = {
          type: 'database_design',
          requirements: updates.requirements,
          currentSchema: canvas.content.databaseSchema
        };

        const DatabaseDesignerAgent = (await import('./agents/DatabaseDesignerAgent.js')).default;
        const dbAgent = new DatabaseDesignerAgent();
        const result = await dbAgent.execute(updates.requirements.join(', '), context);
        canvas.content = {
          ...canvas.content,
          databaseSchema: result.schema || result.response,
          erDiagram: result.erDiagram || 'ER diagram',
          queryOptimization: result.optimization || 'Query optimization',
          indexingStrategy: result.indexing || 'Indexing strategy',
          migrationPlan: result.migrationPlan || 'Migration plan',
          schemaValidation: result.validation || 'Schema validation',
          databaseOptimizations: result.optimizations || 'Database optimizations'
        };
      }
      else if (updates.type === 'documentation_update') {
        const task = {
          type: 'documentation',
          content: canvas.content
        };

        const TechLeadAgent = (await import('./agents/TechLeadAgent.js')).default;
        const techLeadAgent = new TechLeadAgent();
        const result = await techLeadAgent.execute('Generate documentation for this project', context);
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

      const CodeGeneratorAgent = (await import('./agents/CodeGeneratorAgent.js')).default;
      const DatabaseDesignerAgent = (await import('./agents/DatabaseDesignerAgent.js')).default;
      
      const codeAgent = new CodeGeneratorAgent();
      const dbAgent = new DatabaseDesignerAgent();
      
      const [architectureAnalysis, databaseAnalysis] = await Promise.all([
        codeAgent.execute(`Analyze this code: ${canvas.content.generatedCode}`, context),
        dbAgent.execute(`Analyze database schema: ${JSON.stringify(canvas.content.databaseSchema)}`, context)
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

const canvasService = new CanvasService();
export default canvasService;