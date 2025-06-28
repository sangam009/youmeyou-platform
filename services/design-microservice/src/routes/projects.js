import express from 'express';
import projectsController from '/app/src/controllers/projectsController.js';
import auth from '/app/src/middleware/auth.js';

const router = express.Router();

// GET /workspaces/:id/projects - List projects in workspace
router.get('/workspaces/:id/projects', projectsController.listProjects);

// POST /workspaces/:id/projects - Create new project
router.post('/workspaces/:id/projects', projectsController.createProject);

// PATCH /projects/:id - Rename project
router.patch('/:id', projectsController.renameProject);

// DELETE /projects/:id - Delete project
router.delete('/:id', projectsController.deleteProject);

export default router;
