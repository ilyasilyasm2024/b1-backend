const mongoose = require('mongoose');

// One record per user who signed up through an influencer's code.
const referralSchema = new mongoose.Schema({
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Influencer', required: true, index: true },
  referralCode: { type: String, required: true, uppercase: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Snapshot of the user at signup (so the dashboard can show it without joining)
  username: { type: String, default: '' },
  userEmail: { type: String, default: '' },
  // Whether this referred user has ever purchased a paid subscription
  hasSubscribed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);
