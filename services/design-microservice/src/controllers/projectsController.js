import Project from '/app/src/models/project.js';
import logger from '/app/src/utils/logger.js';

class ProjectsController {
  async listProjects(req, res) {
    try {
      const userId = req.user?.userId;
      const { id: workspaceId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      logger.info(`Listing projects for workspace ${workspaceId} and user: ${userId}`);
      
      // Get projects from database for this workspace and user
      const projects = await Project.find({ 
        workspaceId, 
        userId 
      });
      
      res.json(projects);
    } catch (error) {
      logger.error('Error listing projects:', error);
      res.status(500).json({ error: 'Failed to list projects' });
    }
  }

  async createProject(req, res) {
    try {
      const userId = req.user?.userId;
      const { id: workspaceId } = req.params;
      const { name, template = 'blank' } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Project name is required' });
      }
      
      logger.info(`Creating project "${name}" with template "${template}" for workspace ${workspaceId} and user: ${userId}`);
      
      // Template configurations with production-ready defaults
      const templateConfigs = {
        'social-media-platform': {
          components: ['API Gateway', 'User Service', 'Post Service', 'Notification Service', 'Media Storage', 'Database', 'Cache', 'Message Queue'],
          estimatedCost: '$2000/month',
          complexity: 'High',
          defaultNodes: [
            { type: 'api-gateway', label: 'API Gateway', position: { x: 400, y: 100 } },
            { type: 'microservice', label: 'User Service', position: { x: 200, y: 200 } },
            { type: 'microservice', label: 'Post Service', position: { x: 600, y: 200 } },
            { type: 'database', label: 'User DB', position: { x: 200, y: 350 } },
            { type: 'database', label: 'Posts DB', position: { x: 600, y: 350 } },
            { type: 'cache', label: 'Redis Cache', position: { x: 400, y: 300 } }
          ]
        },
        'ecommerce-marketplace': {
          components: ['API Gateway', 'Product Service', 'Order Service', 'Payment Service', 'Inventory Service', 'User Service', 'Database Cluster', 'Search Engine'],
          estimatedCost: '$3500/month',
          complexity: 'High',
          defaultNodes: [
            { type: 'api-gateway', label: 'API Gateway', position: { x: 400, y: 100 } },
            { type: 'microservice', label: 'Product Service', position: { x: 150, y: 200 } },
            { type: 'microservice', label: 'Order Service', position: { x: 400, y: 200 } },
            { type: 'microservice', label: 'Payment Service', position: { x: 650, y: 200 } },
            { type: 'database', label: 'Product DB', position: { x: 150, y: 350 } },
            { type: 'database', label: 'Order DB', position: { x: 400, y: 350 } },
            { type: 'search', label: 'Search Engine', position: { x: 650, y: 350 } }
          ]
        },
        'api-service': {
          components: ['API Gateway', 'Service', 'Database', 'Cache'],
          estimatedCost: '$500/month',
          complexity: 'Low',
          defaultNodes: [
            { type: 'api-gateway', label: 'API Gateway', position: { x: 400, y: 150 } },
            { type: 'microservice', label: 'API Service', position: { x: 400, y: 250 } },
            { type: 'database', label: 'Database', position: { x: 300, y: 350 } },
            { type: 'cache', label: 'Cache', position: { x: 500, y: 350 } }
          ]
        },
        'blank': {
          components: [],
          estimatedCost: '$0/month',
          complexity: 'Custom',
          defaultNodes: []
        }
      };
      
      const templateConfig = templateConfigs[template] || templateConfigs['blank'];
      
      // Create new project in database
      const project = new Project({
        name: name.trim(),
        workspaceId,
        userId,
        template,
        templateConfig,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const savedProject = await project.save();
      
      logger.info('Project created successfully:', savedProject._id);
      
      res.status(201).json({
        id: savedProject._id,
        name: savedProject.name,
        workspaceId: savedProject.workspaceId,
        userId: savedProject.userId,
        template: savedProject.template,
        templateConfig: savedProject.templateConfig,
        createdAt: savedProject.createdAt,
        updatedAt: savedProject.updatedAt
      });
    } catch (error) {
      logger.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async renameProject(req, res) {
    try {
      const userId = req.user?.userId;
      const { id: projectId } = req.params;
      const { name } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Project name is required' });
      }
      
      logger.info(`Renaming project ${projectId} to: ${name} for user: ${userId}`);
      
      // Update project in database
      const updatedProject = await Project.findOneAndUpdate(
        { _id: projectId, userId }, // Ensure user owns the project
        { 
          name: name.trim(),
          updatedAt: new Date()
        },
        { new: true } // Return updated document
      );
      
      if (!updatedProject) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }
      
      res.json({
        id: updatedProject._id,
        name: updatedProject.name,
        updatedAt: updatedProject.updatedAt
      });
    } catch (error) {
      logger.error('Error renaming project:', error);
      res.status(500).json({ error: 'Failed to rename project' });
    }
  }

  async deleteProject(req, res) {
    try {
      const userId = req.user?.userId;
      const { id: projectId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      logger.info(`Deleting project ${projectId} for user: ${userId}`);
      
      // Delete project from database
      const deletedProject = await Project.findOneAndDelete({ 
        _id: projectId, 
        userId 
      });
      
      if (!deletedProject) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }
      
      // TODO: Also delete associated canvas data, templates, etc.
      
      res.json({ status: 'deleted', id: projectId });
    } catch (error) {
      logger.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
}

const projectsController = new ProjectsController();
export default projectsController;
