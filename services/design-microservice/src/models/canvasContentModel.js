import mongoose from 'mongoose';

const canvasContentSchema = new mongoose.Schema({
  canvasId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canvas', required: true },
  content: { type: Object, required: true },
  version: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CanvasContent = mongoose.model('CanvasContent', canvasContentSchema);
export default CanvasContent; 