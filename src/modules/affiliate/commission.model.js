const mongoose = require('mongoose');

// One record per subscription purchase made by a referred user.
const commissionSchema = new mongoose.Schema({
  influencerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Influencer', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, default: '' },
  plan: { type: String, required: true },
  // Price the user actually paid (after discount)
  amountPaid: { type: Number, required: true },
  // Commission earned by the influencer for this purchase
  commissionAmount: { type: Number, required: true },
  commissionPercent: { type: Number, required: true },
  // pending = counted in balance, awaiting monthly payout; paid = settled
  status: { type: String, enum: ['pending', 'paid'], default: 'pending', index: true },
  paidAt: { type: Date, default: null },
  // The month this belongs to, e.g. "2026-07" for monthly reporting
  period: { type: String, required: true, index: true },
}, { timestamps: true });

// Compound index for the "has this user purchased before?" check in recordPurchase.
commissionSchema.index({ influencerId: 1, userId: 1 });
// Compound index for dashboard filtering (pending commissions per period).
commissionSchema.index({ influencerId: 1, status: 1, period: 1 });

module.exports = mongoose.model('Commission', commissionSchema);
