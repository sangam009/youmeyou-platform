import canvasService from '../services/canvasService.js';
import logger from '../utils/logger.js';

class CanvasController {
  async createCanvas(req, res) {
    try {
      const { projectId, canvasData, name } = req.body;
      const userId = req.user?.userId || 'dummy-user-id'; // From auth middleware
      
      logger.info(`Creating canvas for project ${projectId} by user ${userId}`);
      
      const canvas = await canvasService.createCanvas({
        projectId,
        canvasData,
        name: name || 'Untitled Architecture',
        userId
      });
      
      res.status(201).json({
        status: 'success',
        data: canvas
      });
    } catch (error) {
      logger.error('Error creating canvas:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create canvas'
      });
    }
  }

  async getCanvas(req, res) {
    try {
      const { id } = req.params;
      const canvas = await canvasService.getCanvas(id);
      
      if (!canvas) {
        return res.status(404).json({ error: 'Canvas not found' });
      }
      
      res.json(canvas);
    } catch (error) {
      logger.error('Error getting canvas:', error);
      res.status(500).json({ error: 'Failed to get canvas' });
    }
  }

  async updateCanvas(req, res) {
    try {
      const { id } = req.params;
      const canvas = await canvasService.updateCanvas(id, req.body);
      
      if (!canvas) {
        return res.status(404).json({ error: 'Canvas not found' });
      }
      
      res.json(canvas);
    } catch (error) {
      logger.error('Error updating canvas:', error);
      res.status(500).json({ error: 'Failed to update canvas' });
    }
  }

  async deleteCanvas(req, res) {
    try {
      const { id } = req.params;
      const result = await canvasService.deleteCanvas(id);
      
      if (!result) {
        return res.status(404).json({ error: 'Canvas not found' });
      }
      
      res.json({ status: 'deleted', id });
    } catch (error) {
      logger.error('Error deleting canvas:', error);
      res.status(500).json({ error: 'Failed to delete canvas' });
    }
  }

  async getProjectCanvases(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.userId || 'dummy-user-id';
      
      logger.info(`Getting canvases for project ${projectId} by user ${userId}`);
      
      const canvases = await canvasService.getCanvasesByProject(projectId, userId);
      
      res.json({
        status: 'success',
        data: canvases
      });
    } catch (error) {
      logger.error('Error getting project canvases:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get project canvases'
      });
    }
  }

  async duplicateCanvas(req, res) {
    try {
      const { canvasId } = req.params;
      const { name } = req.body;
      const userId = req.user?.userId || 'dummy-user-id';
      
      logger.info(`Duplicating canvas ${canvasId} by user ${userId}`);
      
      const canvas = await canvasService.duplicateCanvas(canvasId, {
        name: name || 'Copy of Architecture',
        userId
      });
      
      if (!canvas) {
        return res.status(404).json({
          status: 'error',
          message: 'Canvas not found'
        });
      }
      
      res.status(201).json({
        status: 'success',
        data: canvas
      });
    } catch (error) {
      logger.error('Error duplicating canvas:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to duplicate canvas'
      });
    }
  }

  async getCanvasVersions(req, res) {
    try {
      const { canvasId } = req.params;
      const userId = req.user?.userId || 'dummy-user-id';
      
      logger.info(`Getting versions for canvas ${canvasId} by user ${userId}`);
      
      const versions = await canvasService.getCanvasVersions(canvasId, userId);
      
      res.json({
        status: 'success',
        data: versions
      });
    } catch (error) {
      logger.error('Error getting canvas versions:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get canvas versions'
      });
    }
  }

  async exportCanvas(req, res) {
    try {
      const { canvasId } = req.params;
      const { format } = req.query; // json, docker-compose, etc.
      const userId = req.user?.userId || 'dummy-user-id';
      
      logger.info(`Exporting canvas ${canvasId} in format ${format} by user ${userId}`);
      
      const exportData = await canvasService.exportCanvas(canvasId, format || 'json', userId);
      
      if (!exportData) {
        return res.status(404).json({
          status: 'error',
          message: 'Canvas not found'
        });
      }
      
      res.json({
        status: 'success',
        data: exportData
      });
    } catch (error) {
      logger.error('Error exporting canvas:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to export canvas'
      });
    }
  }
}

const canvasController = new CanvasController();
export default canvasController; 