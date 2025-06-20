const Template = require('../models/template');

exports.listTemplates = async (req, res) => {
  const userId = req.session.userId;
  const { projectId } = req.params;
  const templates = await Template.findByProjectId(projectId);
  res.json(templates);
};

exports.createTemplate = async (req, res) => {
  const userId = req.session.userId;
  const { projectId } = req.body;
  const { name, data } = req.body;
  const template = await Template.create({ name, projectId, data });
  res.status(201).json(template);
};

exports.updateTemplate = async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;
  const template = await Template.findById(id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  const updatedTemplate = await Template.update(id, { name: req.body.name, data: req.body.data });
  res.json(updatedTemplate);
};

exports.deleteTemplate = async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;
  const template = await Template.findById(id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  await Template.delete(id);
  res.json({ status: 'deleted', id });
};
