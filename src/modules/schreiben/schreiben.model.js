const mongoose = require('mongoose');

const schreibenVersionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId: { type: String, required: true },       // e.g. "m1"
  aufgabeId: { type: Number, required: true },      // 1, 2, or 3
  text: { type: String, required: true, maxlength: 1000 },
  wordCount: { type: Number, default: 0 },
}, { timestamps: true });

schreibenVersionSchema.index({ userId: 1, moduleId: 1, aufgabeId: 1 });

module.exports = mongoose.model('SchreibenVersion', schreibenVersionSchema);
