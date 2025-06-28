import Template from '/app/src/models/template.js';
import logger from '/app/src/utils/logger.js';

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
      const { name, data } = req.body;
      const template = await Template.create({ name, projectId, data });
      res.status(201).json(template);
    } catch (error) {
      logger.error('Error creating template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  }

  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name, data } = req.body;
      const template = await Template.update(id, { name, data });
      res.json(template);
    } catch (error) {
      logger.error('Error updating template:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  }

  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      await Template.delete(id);
      res.json({ status: 'deleted', id });
    } catch (error) {
      logger.error('Error deleting template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  }
}

const templatesController = new TemplatesController();
export default templatesController;
