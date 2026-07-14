const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'tick'], default: 'text' },
  content: { type: String, default: '' },
  color: { type: String, default: '#fde68a' },
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
