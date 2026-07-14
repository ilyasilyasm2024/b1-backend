const mongoose = require('mongoose');

const vocabularyItemSchema = new mongoose.Schema({
  arabic: { type: String, required: true },
  deutsch: { type: String, required: true },
  beispiel: { type: String, default: '' },
  viewed: { type: Number, default: 0 },
  isLearned: { type: Boolean, default: false },
  repeatNumber: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  isConnected: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  firstTour: { type: Boolean, default: false },
  plan: { type: String, enum: ['beta', 'free', 'silver', 'gold', 'platinum', 'lifetime'], required: true, default: 'beta' },
  subscriptionExpiresAt: { type: Date, default: null },
  streak: { type: Number, default: 0 },
  lastLoginDate: { type: String, default: '' },
  loginDates: { type: [String], default: [] }, // Array of "YYYY-MM-DD" strings // YYYY-MM-DD format
  verificationToken: { type: String, default: '' },
  verificationTokenExpires: { type: Date },
  resetPasswordToken: { type: String, default: '' },
  resetPasswordExpires: { type: Date },
  token: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  timeSpentInOurApp: { type: Number, default: 0 },
  vocabularyList: [vocabularyItemSchema],
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('User', userSchema);
