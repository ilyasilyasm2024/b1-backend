const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const repo = require('./affiliate.repository');

function currentPeriod() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

class AffiliateService {
  // --- Admin: create an influencer account ---
  async createInfluencer({ name, email, password, referralCode, discountPercent, commissionPercent }) {
    const existing = await repo.findInfluencerByEmail(email);
    if (existing) throw new Error('An influencer with this email already exists');

    const code = (referralCode || name.replace(/\s+/g, '').toUpperCase().slice(0, 8) + Math.floor(Math.random() * 100))
      .toUpperCase().trim();

    const byCode = await repo.findInfluencerByCode(code);
    if (byCode) throw new Error('This referral code is already in use');

    const hashedPassword = await bcrypt.hash(password, 10);
    const influencer = await repo.createInfluencer({
      name,
      email,
      password: hashedPassword,
      referralCode: code,
      discountPercent: discountPercent ?? 10,
      commissionPercent: commissionPercent ?? 20,
    });

    return this._sanitize(influencer);
  }

  // --- Influencer login ---
  async login({ email, password }) {
    const influencer = await repo.findInfluencerByEmail(email, true);
    if (!influencer) throw new Error('Invalid credentials');
    if (influencer.status !== 'active') throw new Error('Account is inactive');

    const match = await bcrypt.compare(password, influencer.password);
    if (!match) throw new Error('Invalid credentials');

    const token = jwt.sign(
      { influencerId: influencer._id, email: influencer.email, role: 'influencer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { influencer: this._sanitize(influencer), token };
  }

  // --- Validate a referral code (used on the signup page to show discount) ---
  async validateCode(code) {
    const influencer = await repo.findInfluencerByCode(code);
    if (!influencer) return { valid: false };
    return {
      valid: true,
      referralCode: influencer.referralCode,
      discountPercent: influencer.discountPercent,
      influencerName: influencer.name,
    };
  }

  // --- Called when a user signs up with a referral code ---
  async attachReferral({ code, userId, username, userEmail }) {
    if (!code) return null;
    const influencer = await repo.findInfluencerByCode(code);
    if (!influencer) return null;

    const existing = await repo.findReferralByUser(userId);
    if (existing) return existing;

    return repo.createReferral({
      influencerId: influencer._id,
      referralCode: influencer.referralCode,
      userId,
      username,
      userEmail,
    });
  }

  // --- Called when a referred user purchases a subscription ---
  async recordPurchase({ userId, username, plan, amountPaid }) {
    const referral = await repo.findReferralByUser(userId);
    if (!referral) return null; // Not a referred user

    const influencer = await repo.findInfluencerById(referral.influencerId);
    if (!influencer) return null;

    // Determine if this is the first purchase or a renewal
    const existingCommissions = await repo.listCommissionsByInfluencer(influencer._id);
    const userHasPreviousPurchase = existingCommissions.some(c => c.userId.toString() === userId.toString());

    // Use first purchase rate or renewal rate
    const rate = userHasPreviousPurchase
      ? (influencer.renewalCommission ?? influencer.commissionPercent ?? 20)
      : (influencer.firstPurchaseCommission ?? influencer.commissionPercent ?? 50);

    const commissionAmount = Math.round((amountPaid * rate / 100) * 100) / 100;

    const commission = await repo.createCommission({
      influencerId: influencer._id,
      userId,
      username,
      plan,
      amountPaid,
      commissionAmount,
      commissionPercent: rate,
      period: currentPeriod(),
    });

    await repo.incrementBalance(influencer._id, commissionAmount);
    await repo.markReferralSubscribed(userId);

    return commission;
  }

  // --- Influencer dashboard data ---
  async getDashboard(influencerId) {
    const influencer = await repo.findInfluencerById(influencerId);
    if (!influencer) throw new Error('Influencer not found');

    const referrals = await repo.listReferralsByInfluencer(influencerId);
    const commissions = await repo.listCommissionsByInfluencer(influencerId);

    const pendingTotal = commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    return {
      influencer: this._sanitize(influencer),
      referralLink: `${process.env.FRONTEND_URL || ''}/signup?ref=${influencer.referralCode}`,
      stats: {
        totalReferrals: referrals.length,
        subscribedReferrals: referrals.filter((r) => r.hasSubscribed).length,
        balance: influencer.balance,
        totalEarned: influencer.totalEarned,
        totalPaid: influencer.totalPaid,
        pendingTotal: Math.round(pendingTotal * 100) / 100,
      },
      referrals: referrals.map((r) => ({
        username: r.username,
        userEmail: r.userEmail,
        hasSubscribed: r.hasSubscribed,
        joinedAt: r.createdAt,
      })),
      commissions: commissions.map((c) => ({
        username: c.username,
        plan: c.plan,
        amountPaid: c.amountPaid,
        commissionAmount: c.commissionAmount,
        status: c.status,
        period: c.period,
        purchasedAt: c.createdAt,
        paidAt: c.paidAt,
      })),
    };
  }

  // --- Admin: list all influencers ---
  async listInfluencers() {
    const list = await repo.listInfluencers();
    return list.map((i) => this._sanitize(i));
  }

  // --- Admin: update influencer settings ---
  async updateInfluencer(influencerId, updateData) {
    // Only allow specific fields to be updated
    const allowed = ['discountPercent', 'commissionPercent', 'firstPurchaseCommission', 'renewalCommission', 'status', 'payoutInfo', 'name'];
    const filtered = {};
    for (const key of allowed) {
      if (updateData[key] !== undefined) filtered[key] = updateData[key];
    }
    const updated = await repo.updateInfluencer(influencerId, filtered);
    if (!updated) throw new Error('Influencer not found');
    return this._sanitize(updated);
  }

  // --- Admin: mark an influencer's pending commissions as paid (monthly payout) ---
  async payout(influencerId, period) {
    const pending = await repo.listPendingCommissions(influencerId);
    const filtered = period ? pending.filter((c) => c.period === period) : pending;
    const total = filtered.reduce((sum, c) => sum + c.commissionAmount, 0);

    await repo.markCommissionsPaid(influencerId, period);
    const updated = await repo.settleBalance(influencerId, total);

    return {
      paidAmount: Math.round(total * 100) / 100,
      newBalance: updated.balance,
      count: filtered.length,
    };
  }

  // --- Promo code generation (influencer) ---
  async generatePromoCode(influencerId, { plan = 'gold', durationDays = 30 } = {}) {
    const influencer = await repo.findInfluencerById(influencerId);
    if (!influencer) throw new Error('Influencer not found');

    const period = currentPeriod();
    const count = await repo.countPromosByInfluencerInPeriod(influencerId, period);
    const MONTHLY_LIMIT = 20;
    if (count >= MONTHLY_LIMIT) {
      throw new Error(`Monatliches Limit erreicht (${MONTHLY_LIMIT} Codes pro Monat)`);
    }

    // Generate unique code: GIFT-{INFLUENCER_INITIALS}-{RANDOM}
    const initials = influencer.name.replace(/\s+/g, '').slice(0, 4).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
    const code = `GIFT-${initials}-${random}`;

    // Code expires in 60 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    const promo = await repo.createPromo({
      code,
      influencerId,
      influencerName: influencer.name,
      plan,
      durationDays,
      expiresAt,
      period,
    });

    return {
      code: promo.code,
      plan: promo.plan,
      durationDays: promo.durationDays,
      expiresAt: promo.expiresAt,
      remaining: MONTHLY_LIMIT - count - 1,
    };
  }

  // --- List promo codes for an influencer ---
  async listPromoCodes(influencerId) {
    return repo.listPromosByInfluencer(influencerId);
  }

  // --- Redeem a promo code (user side) ---
  async redeemPromoCode(code, userId, username) {
    const promo = await repo.findPromoByCode(code);
    if (!promo) throw new Error('Ungültiger Promo-Code');
    if (promo.isUsed) throw new Error('Dieser Code wurde bereits verwendet');
    if (promo.expiresAt < new Date()) throw new Error('Dieser Code ist abgelaufen');

    // Mark as used
    const updated = await repo.markPromoUsed(code, userId, username);
    if (!updated) throw new Error('Code konnte nicht eingelöst werden');

    // Activate the plan for the user
    const User = require('../user/user.model');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + promo.durationDays);

    await User.findByIdAndUpdate(userId, {
      plan: promo.plan,
      subscriptionExpiresAt: expiresAt,
      referredBy: promo.influencerId ? (await repo.findInfluencerById(promo.influencerId))?.referralCode || '' : '',
    });

    // Also create a referral link if not already linked
    await this.attachReferral({
      code: (await repo.findInfluencerById(promo.influencerId))?.referralCode || '',
      userId,
      username,
      userEmail: '',
    });

    return {
      plan: promo.plan,
      durationDays: promo.durationDays,
      expiresAt,
      message: `${promo.plan.charAt(0).toUpperCase() + promo.plan.slice(1)} für ${promo.durationDays} Tage aktiviert!`,
    };
  }

  _sanitize(influencer) {
    const obj = influencer.toObject ? influencer.toObject() : influencer;
    delete obj.password;
    return obj;
  }
}

module.exports = new AffiliateService();
