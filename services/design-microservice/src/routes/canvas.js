const express = require('express');
const router = express.Router();
const canvasController = require('../controllers/canvasController');
const auth = require('../middleware/auth');

// Canvas CRUD operations
router.post('/', auth, canvasController.createCanvas);
router.get('/:canvasId', auth, canvasController.getCanvas);
router.put('/:canvasId', auth, canvasController.updateCanvas);
router.delete('/:canvasId', auth, canvasController.deleteCanvas);

// Canvas utility operations
router.post('/:canvasId/duplicate', auth, canvasController.duplicateCanvas);
router.get('/:canvasId/versions', auth, canvasController.getCanvasVersions);
router.get('/:canvasId/export', auth, canvasController.exportCanvas);

// Project-related canvas operations
router.get('/project/:projectId', auth, canvasController.getProjectCanvases);

module.exports = router; 