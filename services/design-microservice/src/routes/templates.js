const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templatesController');

// GET /templates - List available templates
router.get('/:projectId', templatesController.listTemplates);

// POST /templates - Create new template
router.post('/', templatesController.createTemplate);

// PATCH /templates/:id - Update template
router.patch('/:id', templatesController.updateTemplate);

// DELETE /templates/:id - Delete template
router.delete('/:id', templatesController.deleteTemplate);

module.exports = router;
