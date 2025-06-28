import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const projectMetadataSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'completed', 'archived'],
    default: 'draft'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  tags: [String],
  createdBy: {
    type: String,
    required: true
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
projectMetadataSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Add indexes
projectMetadataSchema.index({ createdBy: 1 });
projectMetadataSchema.index({ tags: 1 });
projectMetadataSchema.index({ status: 1 });
projectMetadataSchema.index({ createdAt: -1 });
projectMetadataSchema.index({ updatedAt: -1 });

const ProjectMetadata = mongoose.model('ProjectMetadata', projectMetadataSchema);

export default ProjectMetadata; 