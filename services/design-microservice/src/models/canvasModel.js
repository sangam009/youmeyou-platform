import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const canvasSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    index: true
  },
  nodes: [{
    id: String,
    type: String,
    position: {
      x: Number,
      y: Number
    },
    data: mongoose.Schema.Types.Mixed
  }],
  edges: [{
    id: String,
    source: String,
    target: String,
    type: String,
    data: mongoose.Schema.Types.Mixed
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps on save
canvasSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Canvas = mongoose.model('Canvas', canvasSchema);

export default Canvas; 