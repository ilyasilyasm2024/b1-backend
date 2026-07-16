const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema({
  // The unique promo/gift code, e.g. "GIFT-ILYAS-7X3K"
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  // Which influencer created it
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Influencer', required: true, index: true },
  influencerName: { type: String, default: '' },
  // What the code gives
  plan: { type: String, enum: ['silver', 'gold', 'platinum'], default: 'gold' },
  durationDays: { type: Number, default: 30 }, // how many days of access
  // Usage tracking
  isUsed: { type: Boolean, default: false },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usedByUsername: { type: String, default: '' },
  usedAt: { type: Date, default: null },
  // Expiry: the code itself expires if not used within this date
  expiresAt: { type: Date, required: true },
  // Month it was created in (for monthly limit tracking), e.g. "2026-07"
  period: { type: String, required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('PromoCode', promoSchema);
