import Template from '../models/template.js';
import logger from '../utils/logger.js';

class TemplatesController {
  async listTemplates(req, res) {
    try {
      const { projectId } = req.params;
      const templates = await Template.findByProjectId(projectId);
      res.json(templates);
    } catch (error) {
      logger.error('Error listing templates:', error);
      res.status(500).json({ error: 'Failed to list templates' });
    }
  }

  async createTemplate(req, res) {
    try {
      const { projectId } = req.params;
      const { name, content } = req.body;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Template name is required' });
      }
      
      const template = await Template.create({
        name: name.trim(),
        content,
        projectId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      res.status(201).json(template);
    } catch (error) {
      logger.error('Error creating template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  }

  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name, content } = req.body;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Template name is required' });
      }
      
      const template = await Template.update(id, {
        name: name.trim(),
        content,
        updatedAt: new Date()
      });
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      logger.error('Error updating template:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  }

  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const result = await Template.delete(id);
      
      if (!result) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json({ status: 'deleted', id });
    } catch (error) {
      logger.error('Error deleting template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  }
}

const templatesController = new TemplatesController();
export default templatesController;
