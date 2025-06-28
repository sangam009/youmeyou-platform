import express from 'express';
import templatesController from '../controllers/templatesController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET /templates - List available templates
router.get('/:projectId/templates', auth, templatesController.listTemplates.bind(templatesController));

// POST /templates - Create new template
router.post('/:projectId/templates', auth, templatesController.createTemplate.bind(templatesController));

// PATCH /templates/:id - Update template
router.put('/templates/:id', auth, templatesController.updateTemplate.bind(templatesController));

// DELETE /templates/:id - Delete template
router.delete('/templates/:id', auth, templatesController.deleteTemplate.bind(templatesController));

export default router;
