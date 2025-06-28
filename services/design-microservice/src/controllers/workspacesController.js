import Workspace from '../models/workspace.js';
import logger from '../utils/logger.js';

class WorkspacesController {
  async listWorkspaces(req, res) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const workspaces = await Workspace.findByUserId(userId);
      res.json(workspaces);
    } catch (error) {
      logger.error('Error listing workspaces:', error);
      res.status(500).json({ error: 'Failed to list workspaces' });
    }
  }

  async createWorkspace(req, res) {
    try {
      const userId = req.user?.userId;
      const { name } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Workspace name is required' });
      }
      
      const workspace = await Workspace.create({
        name: name.trim(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      res.status(201).json(workspace);
    } catch (error) {
      logger.error('Error creating workspace:', error);
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  }

  async updateWorkspace(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Workspace name is required' });
      }
      
      const workspace = await Workspace.update(id, {
        name: name.trim(),
        updatedAt: new Date()
      });
      
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      res.json(workspace);
    } catch (error) {
      logger.error('Error updating workspace:', error);
      res.status(500).json({ error: 'Failed to update workspace' });
    }
  }

  async deleteWorkspace(req, res) {
    try {
      const { id } = req.params;
      const result = await Workspace.delete(id);
      
      if (!result) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      res.json({ status: 'deleted', id });
    } catch (error) {
      logger.error('Error deleting workspace:', error);
      res.status(500).json({ error: 'Failed to delete workspace' });
    }
  }
}

const workspacesController = new WorkspacesController();
export default workspacesController;
