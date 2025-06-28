const express = require('express');
const router = express.Router();
const workspacesController = require('../controllers/workspacesController');

// GET /workspaces - List user workspaces
router.get('/', workspacesController.listWorkspaces);

// POST /workspaces - Create new workspace
router.post('/', workspacesController.createWorkspace);

// POST /workspaces/:id/switch - Switch active workspace
router.post('/:id/switch', workspacesController.switchWorkspace);

// POST /workspaces/:id/invite - Invite user to workspace (future)
router.post('/:id/invite', workspacesController.inviteToWorkspace);

export default router;
