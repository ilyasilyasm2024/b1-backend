const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  // Unique referral / discount code, e.g. "ILYAS20"
  referralCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  // Discount the referred user receives (percent off the price)
  discountPercent: { type: Number, default: 10, min: 0, max: 100 },
  // Commission the influencer earns (percent of what the user pays)
  commissionPercent: { type: Number, default: 20, min: 0, max: 100 },
  // First purchase commission (overrides commissionPercent for the first buy)
  firstPurchaseCommission: { type: Number, default: 50, min: 0, max: 100 },
  // Renewal commission (used for all subsequent purchases after the first)
  renewalCommission: { type: Number, default: 20, min: 0, max: 100 },
  // Current unpaid balance (accumulates until monthly payout)
  balance: { type: Number, default: 0 },
  // Lifetime total earned (never reset)
  totalEarned: { type: Number, default: 0 },
  // Total already paid out
  totalPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  // Optional payout details
  payoutInfo: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Influencer', influencerSchema);
