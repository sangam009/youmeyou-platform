import express from 'express';
import workspacesController from '/app/src/controllers/workspacesController.js';
import auth from '/app/src/middleware/auth.js';

const router = express.Router();

// GET /workspaces - List user workspaces
router.get('/', auth, workspacesController.listWorkspaces);

// POST /workspaces - Create new workspace
router.post('/', auth, workspacesController.createWorkspace);

// POST /workspaces/:id/switch - Switch active workspace
router.post('/:id/switch', workspacesController.switchWorkspace);

// POST /workspaces/:id/invite - Invite user to workspace (future)
router.post('/:id/invite', workspacesController.inviteToWorkspace);

export default router;
