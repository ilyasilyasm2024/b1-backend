const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'tick'], default: 'text' },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  color: { type: String, default: '#fde68a' },
  dir: { type: String, enum: ['ltr', 'rtl'], default: 'ltr' },
  collapsed: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  links: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
  x: { type: Number, default: 100 },
  y: { type: Number, default: 120 },
}, { timestamps: true });

// Compound index: fetch a user's notes ordered by their manual order.
noteSchema.index({ userId: 1, order: 1 });

module.exports = mongoose.model('Note', noteSchema);
