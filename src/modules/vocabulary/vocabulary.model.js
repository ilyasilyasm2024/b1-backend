const mongoose = require('mongoose');

const vocabularySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  arabic: { type: String, required: true },
  deutsch: { type: String, required: true },
  beispiel: { type: String, default: '' },
  viewed: { type: Number, default: 0 },
  isLearned: { type: Boolean, default: false },
  repeatNumber: { type: Number, default: 0 },
}, { timestamps: true });

// Compound index: list a user's vocabulary sorted by creation date.
vocabularySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Vocabulary', vocabularySchema);
