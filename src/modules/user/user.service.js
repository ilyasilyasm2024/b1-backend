const userRepository = require('./user.repository');
const affiliateService = require('../affiliate/affiliate.service');
const { getPlanPrice } = require('../../config/plans');

const VALID_PAID_PLANS = ['silver', 'gold', 'platinum', 'lifetime'];

class UserService {
  async getAllUsers(pagination) {
    return userRepository.findAll(pagination);
  }

  async getUserById(id) {
    return userRepository.findById(id);
  }

  // Called after a successful payment. Activates the plan, applies any
  // referral discount, and records the influencer commission.
  async subscribe(userId, { plan, billing = 'monthly' }) {
    if (!VALID_PAID_PLANS.includes(plan)) {
      throw new Error('Invalid plan');
    }

    // Acquire an atomic lock so two concurrent subscribe calls for the same user
    // can't both create a commission (prevents duplicate payouts on double-submit).
    const locked = await userRepository.acquireSubscribeLock(userId);
    if (!locked) {
      throw new Error('A subscription request is already being processed');
    }

    try {
      return await this._doSubscribe(userId, { plan, billing });
    } finally {
      await userRepository.releaseSubscribeLock(userId);
    }
  }

  async _doSubscribe(userId, { plan, billing }) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    // Base price (yearly = 10x monthly for the 17% discount already in pricing)
    const basePrice = getPlanPrice(plan) * (billing === 'yearly' ? 10 : 1);

    // Apply referral discount if the user was referred
    let amountPaid = basePrice;
    let discountPercent = 0;
    if (user.referredBy) {
      const check = await affiliateService.validateCode(user.referredBy);
      if (check.valid) {
        discountPercent = check.discountPercent;
        amountPaid = Math.round((basePrice * (1 - discountPercent / 100)) * 100) / 100;
      }
    }

    // Set expiry
    let expiresAt = null;
    if (plan !== 'lifetime') {
      const months = billing === 'yearly' ? 12 : 1;
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
    }

    const updated = await userRepository.update(userId, {
      plan,
      subscriptionExpiresAt: expiresAt,
    });

    // Record commission for the influencer (non-blocking on failure)
    let commission = null;
    if (user.referredBy) {
      try {
        commission = await affiliateService.recordPurchase({
          userId: user._id,
          username: user.username,
          plan,
          amountPaid,
        });
      } catch (e) {
        console.error('Commission record failed:', e.message);
      }
    }

    return {
      plan: updated.plan,
      subscriptionExpiresAt: updated.subscriptionExpiresAt,
      basePrice,
      discountPercent,
      amountPaid,
      commissionRecorded: !!commission,
    };
  }

  async updateUser(id, updateData) {
    // Prevent updating sensitive fields through this route
    delete updateData.password;
    delete updateData.email;
    delete updateData.isVerified;
    delete updateData.verificationToken;
    delete updateData.verificationTokenExpires;
    delete updateData.token;
    delete updateData.plan;
    delete updateData.subscriptionExpiresAt;
    return userRepository.update(id, updateData);
  }

  async deleteUser(id) {
    return userRepository.delete(id);
  }
}

module.exports = new UserService();
