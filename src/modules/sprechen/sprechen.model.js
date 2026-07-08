const mongoose = require('mongoose');

const sprechenRecordingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId: { type: String, required: true },
  teil: { type: String, required: true }, // "teil1", "teil2a", "teil2b", "teil3"
  audioUrl: { type: String, required: true },
  publicId: { type: String, required: true }, // Cloudinary public_id for deletion
  duration: { type: Number, default: 0 }, // seconds
}, { timestamps: true });

sprechenRecordingSchema.index({ userId: 1, moduleId: 1, teil: 1 });

module.exports = mongoose.model('SprechenRecording', sprechenRecordingSchema);
