const Influencer = require('./influencer.model');
const Referral = require('./referral.model');
const Commission = require('./commission.model');
const PromoCode = require('./promo.model');

class AffiliateRepository {
  // --- Influencer ---
  createInfluencer(data) {
    return Influencer.create(data);
  }
  findInfluencerByEmail(email, withPassword = false) {
    const q = Influencer.findOne({ email });
    return withPassword ? q.select('+password') : q;
  }
  findInfluencerById(id) {
    return Influencer.findById(id);
  }
  findInfluencerByCode(code) {
    return Influencer.findOne({ referralCode: code.toUpperCase(), status: 'active' });
  }
  listInfluencers() {
    return Influencer.find().sort({ createdAt: -1 });
  }
  updateInfluencer(id, data) {
    return Influencer.findByIdAndUpdate(id, data, { new: true });
  }
  incrementBalance(influencerId, amount) {
    return Influencer.findByIdAndUpdate(
      influencerId,
      { $inc: { balance: amount, totalEarned: amount } },
      { new: true }
    );
  }
  settleBalance(influencerId, amount) {
    return Influencer.findByIdAndUpdate(
      influencerId,
      { $inc: { balance: -amount, totalPaid: amount } },
      { new: true }
    );
  }

  // --- Referral ---
  createReferral(data) {
    return Referral.create(data);
  }
  findReferralByUser(userId) {
    return Referral.findOne({ userId });
  }
  listReferralsByInfluencer(influencerId) {
    return Referral.find({ influencerId }).sort({ createdAt: -1 });
  }
  markReferralSubscribed(userId) {
    return Referral.findOneAndUpdate({ userId }, { hasSubscribed: true }, { new: true });
  }

  // --- Commission ---
  createCommission(data) {
    return Commission.create(data);
  }
  listCommissionsByInfluencer(influencerId) {
    return Commission.find({ influencerId }).sort({ createdAt: -1 });
  }
  listPendingCommissions(influencerId) {
    return Commission.find({ influencerId, status: 'pending' });
  }
  markCommissionsPaid(influencerId, period) {
    const filter = { influencerId, status: 'pending' };
    if (period) filter.period = period;
    return Commission.updateMany(filter, { status: 'paid', paidAt: new Date() });
  }

  // --- Promo Codes ---
  createPromo(data) {
    return PromoCode.create(data);
  }
  countPromosByInfluencerInPeriod(influencerId, period) {
    return PromoCode.countDocuments({ influencerId, period });
  }
  findPromoByCode(code) {
    return PromoCode.findOne({ code: code.toUpperCase() });
  }
  listPromosByInfluencer(influencerId) {
    return PromoCode.find({ influencerId }).sort({ createdAt: -1 });
  }
  markPromoUsed(code, userId, username) {
    return PromoCode.findOneAndUpdate(
      { code: code.toUpperCase(), isUsed: false },
      { isUsed: true, usedBy: userId, usedByUsername: username, usedAt: new Date() },
      { new: true }
    );
  }
}

module.exports = new AffiliateRepository();
