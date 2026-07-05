const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId: { type: String, required: true }, // e.g. "m1", "m2"
  sections: { type: mongoose.Schema.Types.Mixed, default: {} },   // answers per section
  texts: { type: mongoose.Schema.Types.Mixed, default: {} },      // schreiben texts
  done: { type: mongoose.Schema.Types.Mixed, default: {} },       // done states
  highlights: { type: [{ text: String, color: String }], default: [] }, // text highlights
}, { timestamps: true });

// One progress document per user per module
progressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
