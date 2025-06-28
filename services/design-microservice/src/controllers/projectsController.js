import Project from '../models/project.js';
import logger from '../utils/logger.js';

class ProjectsController {
  async listProjects(req, res) {
    try {
      const userId = req.user?.userId;
      const { id: workspaceId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      logger.info(`Listing projects for workspace ${workspaceId} and user: ${userId}`);
      
      const projects = await Project.findByWorkspaceId(workspaceId);
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
      
      const project = await Project.create({
        name: name.trim(),
        workspaceId,
        userId,
        template,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      res.status(201).json(project);
    } catch (error) {
      logger.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async getProject(req, res) {
    try {
      const { id } = req.params;
      const project = await Project.findById(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      logger.error('Error getting project:', error);
      res.status(500).json({ error: 'Failed to get project' });
    }
  }

  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Project name is required' });
      }
      
      const project = await Project.update(id, {
        name: name.trim(),
        updatedAt: new Date()
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      logger.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  async deleteProject(req, res) {
    try {
      const { id } = req.params;
      const result = await Project.delete(id);
      
      if (!result) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json({ status: 'deleted', id });
    } catch (error) {
      logger.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
}

const projectsController = new ProjectsController();
export default projectsController;
