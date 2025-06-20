const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// GET /api/health
router.get('/', healthController.healthCheck);

module.exports = router; 