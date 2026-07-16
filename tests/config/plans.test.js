const {
  PLAN_LIMITS,
  PLAN_PRICES,
  getPlanPrice,
  getPlanLimits,
  isExpired,
  getEffectivePlan,
} = require('../../src/config/plans');

describe('plans config', () => {
  describe('getPlanPrice', () => {
    it('returns the price for each paid plan', () => {
      expect(getPlanPrice('silver')).toBe(30);
      expect(getPlanPrice('gold')).toBe(50);
      expect(getPlanPrice('platinum')).toBe(70);
      expect(getPlanPrice('lifetime')).toBe(300);
    });

    it('returns 0 for free/beta (no price defined)', () => {
      expect(getPlanPrice('free')).toBe(0);
      expect(getPlanPrice('beta')).toBe(0);
    });

    it('returns 0 for an unknown plan', () => {
      expect(getPlanPrice('unknown')).toBe(0);
      expect(getPlanPrice(undefined)).toBe(0);
      expect(getPlanPrice(null)).toBe(0);
      expect(getPlanPrice('')).toBe(0);
    });

    it('matches the PLAN_PRICES table', () => {
      for (const [plan, price] of Object.entries(PLAN_PRICES)) {
        expect(getPlanPrice(plan)).toBe(price);
      }
    });
  });

  describe('getPlanLimits', () => {
    it('returns the correct limits object for each known plan', () => {
      for (const plan of Object.keys(PLAN_LIMITS)) {
        expect(getPlanLimits(plan)).toBe(PLAN_LIMITS[plan]);
      }
    });

    it('falls back to the free plan for unknown plans', () => {
      expect(getPlanLimits('does-not-exist')).toBe(PLAN_LIMITS.free);
      expect(getPlanLimits(undefined)).toBe(PLAN_LIMITS.free);
      expect(getPlanLimits(null)).toBe(PLAN_LIMITS.free);
    });

    it('gives beta and platinum the audioTranscript permission', () => {
      expect(getPlanLimits('beta').audioTranscript).toBe(true);
      expect(getPlanLimits('platinum').audioTranscript).toBe(true);
      expect(getPlanLimits('lifetime').audioTranscript).toBe(true);
    });

    it('denies audioTranscript to lower tiers', () => {
      expect(getPlanLimits('free').audioTranscript).toBe(false);
      expect(getPlanLimits('silver').audioTranscript).toBe(false);
      expect(getPlanLimits('gold').audioTranscript).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('returns false when there is no expiry date', () => {
      expect(isExpired({ plan: 'gold', subscriptionExpiresAt: null })).toBe(false);
      expect(isExpired({ plan: 'gold' })).toBe(false);
    });

    it('returns false for free and lifetime plans regardless of date', () => {
      const past = new Date(Date.now() - 86400000);
      expect(isExpired({ plan: 'free', subscriptionExpiresAt: past })).toBe(false);
      expect(isExpired({ plan: 'lifetime', subscriptionExpiresAt: past })).toBe(false);
    });

    it('returns true when a paid plan expiry is in the past', () => {
      const past = new Date(Date.now() - 86400000);
      expect(isExpired({ plan: 'gold', subscriptionExpiresAt: past })).toBe(true);
    });

    it('returns false when a paid plan expiry is in the future', () => {
      const future = new Date(Date.now() + 86400000);
      expect(isExpired({ plan: 'gold', subscriptionExpiresAt: future })).toBe(false);
    });

    it('accepts a date string as expiry', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      expect(isExpired({ plan: 'silver', subscriptionExpiresAt: past })).toBe(true);
    });
  });

  describe('getEffectivePlan', () => {
    it('returns the plan when active', () => {
      const future = new Date(Date.now() + 86400000);
      expect(getEffectivePlan({ plan: 'platinum', subscriptionExpiresAt: future })).toBe('platinum');
    });

    it('downgrades expired paid plans to free', () => {
      const past = new Date(Date.now() - 86400000);
      expect(getEffectivePlan({ plan: 'gold', subscriptionExpiresAt: past })).toBe('free');
    });

    it('defaults to beta when no plan is set', () => {
      expect(getEffectivePlan({})).toBe('beta');
    });

    it('keeps lifetime even with a past date', () => {
      const past = new Date(Date.now() - 86400000);
      expect(getEffectivePlan({ plan: 'lifetime', subscriptionExpiresAt: past })).toBe('lifetime');
    });
  });
});
