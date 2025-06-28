import express from 'express';
import templatesController from '/app/src/controllers/templatesController.js';
import auth from '/app/src/middleware/auth.js';

const router = express.Router();

// GET /templates - List available templates
router.get('/:projectId/templates', auth, templatesController.listTemplates);

// POST /templates - Create new template
router.post('/:projectId/templates', auth, templatesController.createTemplate);

// PATCH /templates/:id - Update template
router.put('/templates/:id', auth, templatesController.updateTemplate);

// DELETE /templates/:id - Delete template
router.delete('/templates/:id', auth, templatesController.deleteTemplate);

export default router;
