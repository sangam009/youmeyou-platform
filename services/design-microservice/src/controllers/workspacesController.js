const Workspace = require('../models/workspace');
const logger = require('../utils/logger');

exports.listWorkspaces = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    logger.info(`Listing workspaces for user: ${userId}`);
    
    // Get workspaces from database
    const workspaces = await Workspace.find({ userId });
    
    res.json(workspaces);
  } catch (error) {
    logger.error('Error listing workspaces:', error);
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
};

exports.createWorkspace = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { name } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Workspace name is required' });
    }
    
    logger.info(`Creating workspace "${name}" for user: ${userId}`);
    
    // Create workspace in database
    const workspace = new Workspace({
      name: name.trim(),
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const savedWorkspace = await workspace.save();
    
    res.status(201).json({
      id: savedWorkspace._id,
      name: savedWorkspace.name,
      userId: savedWorkspace.userId,
      createdAt: savedWorkspace.createdAt,
      updatedAt: savedWorkspace.updatedAt
    });
  } catch (error) {
    logger.error('Error creating workspace:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

exports.switchWorkspace = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    logger.info(`Switching to workspace ${id} for user: ${userId}`);
    
    // Verify workspace belongs to user
    const workspace = await Workspace.findOne({ _id: id, userId });
    
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }
    
    res.json({ status: 'switched', workspaceId: id });
  } catch (error) {
    logger.error('Error switching workspace:', error);
    res.status(500).json({ error: 'Failed to switch workspace' });
  }
};

exports.inviteToWorkspace = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { email } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    logger.info(`Inviting ${email} to workspace ${id} by user: ${userId}`);
    
    // Verify workspace belongs to user
    const workspace = await Workspace.findOne({ _id: id, userId });
    
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }
    
    // TODO: Implement email invitation system
    // For now, just return success
    res.json({ status: 'invited', workspaceId: id, email });
  } catch (error) {
    logger.error('Error inviting to workspace:', error);
    res.status(500).json({ error: 'Failed to invite to workspace' });
  }
};
