import express from 'express';
import projectsController from '../controllers/projectsController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET /projects - List all projects
router.get('/', auth, projectsController.listProjects.bind(projectsController));

// POST /projects - Create new project
router.post('/', auth, projectsController.createProject.bind(projectsController));

// GET /projects/:id - Get project by ID
router.get('/:id', auth, projectsController.getProject.bind(projectsController));

// PUT /projects/:id - Update project
router.put('/:id', auth, projectsController.updateProject.bind(projectsController));

// DELETE /projects/:id - Delete project
router.delete('/:id', auth, projectsController.deleteProject.bind(projectsController));

export default router;
