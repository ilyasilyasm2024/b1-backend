jest.mock('../../src/modules/affiliate/affiliate.repository');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const repo = require('../../src/modules/affiliate/affiliate.repository');
const service = require('../../src/modules/affiliate/affiliate.service');

beforeAll(() => { process.env.JWT_SECRET = 'test-secret'; });

const influencerDoc = (overrides = {}) => ({
  _id: 'i1',
  name: 'Ilyas',
  email: 'ilyas@example.com',
  referralCode: 'ILYAS20',
  discountPercent: 10,
  commissionPercent: 20,
  firstPurchaseCommission: 50,
  renewalCommission: 20,
  balance: 0,
  totalEarned: 0,
  totalPaid: 0,
  status: 'active',
  toObject() { return { ...this }; },
  ...overrides,
});

describe('AffiliateService.createInfluencer', () => {
  beforeEach(() => {
    bcrypt.hash.mockResolvedValue('hashed');
    repo.createInfluencer.mockImplementation((d) => Promise.resolve({ ...influencerDoc(), ...d }));
  });

  it('throws when the email already exists', async () => {
    repo.findInfluencerByEmail.mockResolvedValue(influencerDoc());
    await expect(service.createInfluencer({ name: 'X', email: 'a@b.com', password: 'p' }))
      .rejects.toThrow('already exists');
  });

  it('throws when the generated/provided code is taken', async () => {
    repo.findInfluencerByEmail.mockResolvedValue(null);
    repo.findInfluencerByCode.mockResolvedValue(influencerDoc());
    await expect(service.createInfluencer({ name: 'X', email: 'a@b.com', password: 'p', referralCode: 'TAKEN' }))
      .rejects.toThrow('already in use');
  });

  it('creates an influencer with a hashed password and default commissions', async () => {
    repo.findInfluencerByEmail.mockResolvedValue(null);
    repo.findInfluencerByCode.mockResolvedValue(null);

    const result = await service.createInfluencer({ name: 'Ilyas', email: 'a@b.com', password: 'p' });

    expect(bcrypt.hash).toHaveBeenCalledWith('p', 10);
    expect(repo.createInfluencer).toHaveBeenCalledWith(expect.objectContaining({
      password: 'hashed', discountPercent: 10, commissionPercent: 20,
    }));
    expect(result.password).toBeUndefined();
  });

  it('uppercases the provided referral code', async () => {
    repo.findInfluencerByEmail.mockResolvedValue(null);
    repo.findInfluencerByCode.mockResolvedValue(null);
    await service.createInfluencer({ name: 'Ilyas', email: 'a@b.com', password: 'p', referralCode: 'mycode' });
    expect(repo.createInfluencer).toHaveBeenCalledWith(expect.objectContaining({ referralCode: 'MYCODE' }));
  });
});

describe('AffiliateService.login', () => {
  beforeEach(() => { jwt.sign.mockReturnValue('signed'); });

  it('throws on unknown email', async () => {
    repo.findInfluencerByEmail.mockResolvedValue(null);
    await expect(service.login({ email: 'a@b.com', password: 'p' })).rejects.toThrow('Invalid credentials');
  });

  it('throws when the account is inactive', async () => {
    repo.findInfluencerByEmail.mockResolvedValue(influencerDoc({ status: 'inactive', password: 'hashed' }));
    await expect(service.login({ email: 'a@b.com', password: 'p' })).rejects.toThrow('inactive');
  });

  it('throws on password mismatch', async () => {
    repo.findInfluencerByEmail.mockResolvedValue(influencerDoc({ password: 'hashed' }));
    bcrypt.compare.mockResolvedValue(false);
    await expect(service.login({ email: 'a@b.com', password: 'p' })).rejects.toThrow('Invalid credentials');
  });

  it('returns a token and sanitized influencer on success', async () => {
    repo.findInfluencerByEmail.mockResolvedValue(influencerDoc({ password: 'hashed' }));
    bcrypt.compare.mockResolvedValue(true);
    const result = await service.login({ email: 'a@b.com', password: 'p' });
    expect(result.token).toBe('signed');
    expect(result.influencer.password).toBeUndefined();
  });
});

describe('AffiliateService.validateCode', () => {
  it('returns valid:false for unknown code', async () => {
    repo.findInfluencerByCode.mockResolvedValue(null);
    expect(await service.validateCode('X')).toEqual({ valid: false });
  });

  it('returns discount details for a known code', async () => {
    repo.findInfluencerByCode.mockResolvedValue(influencerDoc());
    const result = await service.validateCode('ILYAS20');
    expect(result).toEqual({
      valid: true, referralCode: 'ILYAS20', discountPercent: 10, influencerName: 'Ilyas',
    });
  });
});

describe('AffiliateService.attachReferral', () => {
  it('returns null when no code is given', async () => {
    expect(await service.attachReferral({ code: '', userId: 'u1' })).toBeNull();
  });

  it('returns null when the code is unknown', async () => {
    repo.findInfluencerByCode.mockResolvedValue(null);
    expect(await service.attachReferral({ code: 'BAD', userId: 'u1' })).toBeNull();
  });

  it('returns the existing referral if already linked', async () => {
    repo.findInfluencerByCode.mockResolvedValue(influencerDoc());
    repo.findReferralByUser.mockResolvedValue({ _id: 'r1' });
    const result = await service.attachReferral({ code: 'ILYAS20', userId: 'u1' });
    expect(result).toEqual({ _id: 'r1' });
    expect(repo.createReferral).not.toHaveBeenCalled();
  });

  it('creates a new referral otherwise', async () => {
    repo.findInfluencerByCode.mockResolvedValue(influencerDoc());
    repo.findReferralByUser.mockResolvedValue(null);
    repo.createReferral.mockResolvedValue({ _id: 'r2' });
    await service.attachReferral({ code: 'ILYAS20', userId: 'u1', username: 'ilyas', userEmail: 'a@b.com' });
    expect(repo.createReferral).toHaveBeenCalledWith(expect.objectContaining({ influencerId: 'i1', userId: 'u1' }));
  });
});

describe('AffiliateService.recordPurchase', () => {
  beforeEach(() => {
    repo.createCommission.mockResolvedValue({ _id: 'c1' });
    repo.incrementBalance.mockResolvedValue({});
    repo.markReferralSubscribed.mockResolvedValue({});
  });

  it('returns null when the user was not referred', async () => {
    repo.findReferralByUser.mockResolvedValue(null);
    expect(await service.recordPurchase({ userId: 'u1', amountPaid: 50 })).toBeNull();
  });

  it('returns null when the influencer no longer exists', async () => {
    repo.findReferralByUser.mockResolvedValue({ influencerId: 'i1' });
    repo.findInfluencerById.mockResolvedValue(null);
    expect(await service.recordPurchase({ userId: 'u1', amountPaid: 50 })).toBeNull();
  });

  it('uses the first-purchase rate for a first purchase', async () => {
    repo.findReferralByUser.mockResolvedValue({ influencerId: 'i1' });
    repo.findInfluencerById.mockResolvedValue(influencerDoc());
    repo.userHasCommission.mockResolvedValue(null); // no previous purchase

    await service.recordPurchase({ userId: 'u1', username: 'ilyas', plan: 'gold', amountPaid: 50 });

    // 50% of 50 = 25
    expect(repo.createCommission).toHaveBeenCalledWith(expect.objectContaining({ commissionAmount: 25, commissionPercent: 50 }));
    expect(repo.incrementBalance).toHaveBeenCalledWith('i1', 25);
  });

  it('uses the renewal rate when the user purchased before', async () => {
    repo.findReferralByUser.mockResolvedValue({ influencerId: 'i1' });
    repo.findInfluencerById.mockResolvedValue(influencerDoc());
    repo.userHasCommission.mockResolvedValue({ _id: 'existing' }); // previous purchase exists

    await service.recordPurchase({ userId: 'u1', username: 'ilyas', plan: 'gold', amountPaid: 50 });

    // 20% of 50 = 10
    expect(repo.createCommission).toHaveBeenCalledWith(expect.objectContaining({ commissionAmount: 10, commissionPercent: 20 }));
    expect(repo.incrementBalance).toHaveBeenCalledWith('i1', 10);
  });

  it('marks the referral as subscribed', async () => {
    repo.findReferralByUser.mockResolvedValue({ influencerId: 'i1' });
    repo.findInfluencerById.mockResolvedValue(influencerDoc());
    repo.userHasCommission.mockResolvedValue(null);
    await service.recordPurchase({ userId: 'u1', username: 'ilyas', plan: 'gold', amountPaid: 50 });
    expect(repo.markReferralSubscribed).toHaveBeenCalledWith('u1');
  });
});

describe('AffiliateService.getDashboard', () => {
  it('throws when the influencer is not found', async () => {
    repo.findInfluencerById.mockResolvedValue(null);
    await expect(service.getDashboard('i1')).rejects.toThrow('not found');
  });

  it('aggregates stats and returns lists', async () => {
    repo.findInfluencerById.mockResolvedValue(influencerDoc({ balance: 100, totalEarned: 200, totalPaid: 100 }));
    repo.referralStats.mockResolvedValue([{ total: 10, subscribed: 4 }]);
    repo.pendingCommissionTotal.mockResolvedValue([{ total: 42.5 }]);
    repo.listReferralsByInfluencer.mockResolvedValue([
      { username: 'a', userEmail: 'a@b.com', hasSubscribed: true, createdAt: new Date() },
    ]);
    repo.listCommissionsByInfluencer.mockResolvedValue([
      { username: 'a', plan: 'gold', amountPaid: 50, commissionAmount: 25, status: 'pending', period: '2026-07', createdAt: new Date(), paidAt: null },
    ]);

    const result = await service.getDashboard('i1');

    expect(result.stats.totalReferrals).toBe(10);
    expect(result.stats.subscribedReferrals).toBe(4);
    expect(result.stats.pendingTotal).toBe(42.5);
    expect(result.referrals).toHaveLength(1);
    expect(result.commissions).toHaveLength(1);
    expect(result.referralLink).toContain('ref=ILYAS20');
  });

  it('handles empty aggregation results', async () => {
    repo.findInfluencerById.mockResolvedValue(influencerDoc());
    repo.referralStats.mockResolvedValue([]);
    repo.pendingCommissionTotal.mockResolvedValue([]);
    repo.listReferralsByInfluencer.mockResolvedValue([]);
    repo.listCommissionsByInfluencer.mockResolvedValue([]);

    const result = await service.getDashboard('i1');

    expect(result.stats.totalReferrals).toBe(0);
    expect(result.stats.subscribedReferrals).toBe(0);
    expect(result.stats.pendingTotal).toBe(0);
  });
});

describe('AffiliateService.updateInfluencer', () => {
  it('only forwards allowed fields', async () => {
    repo.updateInfluencer.mockResolvedValue(influencerDoc());
    await service.updateInfluencer('i1', {
      discountPercent: 15,
      renewalCommission: 25,
      balance: 99999,      // not allowed
      totalEarned: 1,      // not allowed
      email: 'x@y.com',    // not allowed
    });
    const forwarded = repo.updateInfluencer.mock.calls[0][1];
    expect(forwarded).toHaveProperty('discountPercent', 15);
    expect(forwarded).toHaveProperty('renewalCommission', 25);
    expect(forwarded).not.toHaveProperty('balance');
    expect(forwarded).not.toHaveProperty('totalEarned');
    expect(forwarded).not.toHaveProperty('email');
  });

  it('throws when the influencer is not found', async () => {
    repo.updateInfluencer.mockResolvedValue(null);
    await expect(service.updateInfluencer('i1', { discountPercent: 5 })).rejects.toThrow('not found');
  });
});

describe('AffiliateService.payout', () => {
  it('sums pending commissions and settles the balance', async () => {
    repo.listPendingCommissions.mockResolvedValue([
      { commissionAmount: 10, period: '2026-07' },
      { commissionAmount: 15, period: '2026-07' },
    ]);
    repo.markCommissionsPaid.mockResolvedValue({});
    repo.settleBalance.mockResolvedValue({ balance: 0 });

    const result = await service.payout('i1');

    expect(result.paidAmount).toBe(25);
    expect(result.count).toBe(2);
    expect(repo.settleBalance).toHaveBeenCalledWith('i1', 25);
  });

  it('filters by period when provided', async () => {
    repo.listPendingCommissions.mockResolvedValue([
      { commissionAmount: 10, period: '2026-07' },
      { commissionAmount: 15, period: '2026-06' },
    ]);
    repo.markCommissionsPaid.mockResolvedValue({});
    repo.settleBalance.mockResolvedValue({ balance: 5 });

    const result = await service.payout('i1', '2026-07');

    expect(result.paidAmount).toBe(10);
    expect(result.count).toBe(1);
  });
});

describe('AffiliateService.generatePromoCode', () => {
  it('throws when the influencer is not found', async () => {
    repo.findInfluencerById.mockResolvedValue(null);
    await expect(service.generatePromoCode('i1', {})).rejects.toThrow('not found');
  });

  it('throws when the monthly limit is reached', async () => {
    repo.findInfluencerById.mockResolvedValue(influencerDoc());
    repo.countPromosByInfluencerInPeriod.mockResolvedValue(20);
    await expect(service.generatePromoCode('i1', {})).rejects.toThrow(/Limit/);
  });

  it('generates a code under the limit', async () => {
    repo.findInfluencerById.mockResolvedValue(influencerDoc());
    repo.countPromosByInfluencerInPeriod.mockResolvedValue(5);
    repo.createPromo.mockImplementation((d) => Promise.resolve(d));

    const result = await service.generatePromoCode('i1', { plan: 'gold', durationDays: 30 });

    expect(result.code).toMatch(/^GIFT-/);
    expect(result.plan).toBe('gold');
    expect(result.remaining).toBe(14); // 20 - 5 - 1
  });
});

describe('AffiliateService.redeemPromoCode', () => {
  it('throws on unknown code', async () => {
    repo.findPromoByCode.mockResolvedValue(null);
    await expect(service.redeemPromoCode('X', 'u1', 'ilyas')).rejects.toThrow('Ungültiger');
  });

  it('throws when the code is already used', async () => {
    repo.findPromoByCode.mockResolvedValue({ isUsed: true, expiresAt: new Date(Date.now() + 100000) });
    await expect(service.redeemPromoCode('X', 'u1', 'ilyas')).rejects.toThrow('bereits verwendet');
  });

  it('throws when the code is expired', async () => {
    repo.findPromoByCode.mockResolvedValue({ isUsed: false, expiresAt: new Date(Date.now() - 1000) });
    await expect(service.redeemPromoCode('X', 'u1', 'ilyas')).rejects.toThrow('abgelaufen');
  });
});
