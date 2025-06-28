const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projectsController');

// GET /workspaces/:id/projects - List projects in workspace
router.get('/workspaces/:id/projects', projectsController.listProjects);

// POST /workspaces/:id/projects - Create new project
router.post('/workspaces/:id/projects', projectsController.createProject);

// PATCH /projects/:id - Rename project
router.patch('/:id', projectsController.renameProject);

// DELETE /projects/:id - Delete project
router.delete('/:id', projectsController.deleteProject);

export default router;
