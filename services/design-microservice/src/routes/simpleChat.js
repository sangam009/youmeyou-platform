import express from 'express';
import simpleChatController from '../controllers/simpleChatController.js';

const router = express.Router();

/**
 * Simple Chat Routes - Simplified streaming chat endpoint
 */

// Main streaming chat endpoint
router.post('/stream', simpleChatController.streamChat);

// Health check endpoint
router.get('/health', simpleChatController.healthCheck);

// Get capabilities endpoint
router.get('/capabilities', simpleChatController.getCapabilities);

// Test/debug endpoint
router.post('/test', simpleChatController.testProcess);

export default router; 