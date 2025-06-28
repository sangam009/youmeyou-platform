import express from 'express';
import workspacesController from '../controllers/workspacesController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET /workspaces - List user workspaces
router.get('/', auth, workspacesController.listWorkspaces.bind(workspacesController));

// POST /workspaces - Create new workspace
router.post('/', auth, workspacesController.createWorkspace.bind(workspacesController));

// PUT /workspaces/:id - Update workspace
router.put('/:id', auth, workspacesController.updateWorkspace.bind(workspacesController));

// DELETE /workspaces/:id - Delete workspace
router.delete('/:id', auth, workspacesController.deleteWorkspace.bind(workspacesController));

export default router;
