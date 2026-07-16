jest.mock('../../src/modules/user/user.repository');
jest.mock('../../src/modules/affiliate/affiliate.service');

const userRepository = require('../../src/modules/user/user.repository');
const affiliateService = require('../../src/modules/affiliate/affiliate.service');
const userService = require('../../src/modules/user/user.service');

describe('UserService.getAllUsers', () => {
  it('passes pagination through to the repository', async () => {
    userRepository.findAll.mockResolvedValue({ items: [], total: 0 });
    await userService.getAllUsers({ page: 2, limit: 10 });
    expect(userRepository.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 });
  });
});

describe('UserService.subscribe', () => {
  beforeEach(() => {
    userRepository.acquireSubscribeLock.mockResolvedValue({ _id: 'u1' });
    userRepository.releaseSubscribeLock.mockResolvedValue({});
    userRepository.update.mockResolvedValue({ plan: 'gold', subscriptionExpiresAt: new Date() });
  });

  it('rejects an invalid plan', async () => {
    await expect(userService.subscribe('u1', { plan: 'diamond' })).rejects.toThrow('Invalid plan');
  });

  it('rejects when the lock cannot be acquired (concurrent request)', async () => {
    userRepository.acquireSubscribeLock.mockResolvedValue(null);
    await expect(userService.subscribe('u1', { plan: 'gold' }))
      .rejects.toThrow('already being processed');
  });

  it('releases the lock even when processing throws', async () => {
    userRepository.findById.mockResolvedValue(null); // triggers "User not found"
    await expect(userService.subscribe('u1', { plan: 'gold' })).rejects.toThrow('User not found');
    expect(userRepository.releaseSubscribeLock).toHaveBeenCalledWith('u1');
  });

  it('subscribes a non-referred user at full price', async () => {
    userRepository.findById.mockResolvedValue({ _id: 'u1', username: 'ilyas', referredBy: '' });

    const result = await userService.subscribe('u1', { plan: 'gold', billing: 'monthly' });

    expect(result.basePrice).toBe(50);
    expect(result.amountPaid).toBe(50);
    expect(result.discountPercent).toBe(0);
    expect(result.commissionRecorded).toBe(false);
    expect(affiliateService.recordPurchase).not.toHaveBeenCalled();
  });

  it('applies yearly billing (10x) pricing', async () => {
    userRepository.findById.mockResolvedValue({ _id: 'u1', username: 'ilyas', referredBy: '' });
    const result = await userService.subscribe('u1', { plan: 'gold', billing: 'yearly' });
    expect(result.basePrice).toBe(500);
  });

  it('applies a referral discount and records the commission', async () => {
    userRepository.findById.mockResolvedValue({ _id: 'u1', username: 'ilyas', referredBy: 'ILYAS20' });
    affiliateService.validateCode.mockResolvedValue({ valid: true, discountPercent: 10 });
    affiliateService.recordPurchase.mockResolvedValue({ _id: 'c1' });

    const result = await userService.subscribe('u1', { plan: 'gold', billing: 'monthly' });

    expect(result.discountPercent).toBe(10);
    expect(result.amountPaid).toBe(45); // 50 - 10%
    expect(affiliateService.recordPurchase).toHaveBeenCalledWith(expect.objectContaining({ amountPaid: 45, plan: 'gold' }));
    expect(result.commissionRecorded).toBe(true);
  });

  it('still subscribes when commission recording fails', async () => {
    userRepository.findById.mockResolvedValue({ _id: 'u1', username: 'ilyas', referredBy: 'ILYAS20' });
    affiliateService.validateCode.mockResolvedValue({ valid: true, discountPercent: 10 });
    affiliateService.recordPurchase.mockRejectedValue(new Error('boom'));

    const result = await userService.subscribe('u1', { plan: 'gold' });

    expect(result.commissionRecorded).toBe(false);
    expect(result.plan).toBe('gold');
  });

  it('ignores an invalid referral code (no discount)', async () => {
    userRepository.findById.mockResolvedValue({ _id: 'u1', username: 'ilyas', referredBy: 'BAD' });
    affiliateService.validateCode.mockResolvedValue({ valid: false });

    const result = await userService.subscribe('u1', { plan: 'silver' });

    expect(result.discountPercent).toBe(0);
    expect(result.amountPaid).toBe(30);
  });

  it('sets no expiry for the lifetime plan', async () => {
    userRepository.findById.mockResolvedValue({ _id: 'u1', username: 'ilyas', referredBy: '' });
    userRepository.update.mockImplementation((id, data) => Promise.resolve(data));

    const result = await userService.subscribe('u1', { plan: 'lifetime' });

    expect(result.subscriptionExpiresAt).toBeNull();
  });
});

describe('UserService.updateUser', () => {
  it('strips protected fields before updating', async () => {
    userRepository.update.mockImplementation((id, data) => Promise.resolve(data));

    const result = await userService.updateUser('u1', {
      firstName: 'New',
      password: 'hack',
      email: 'hack@b.com',
      plan: 'platinum',
      isVerified: true,
      token: 't',
    });

    expect(result.firstName).toBe('New');
    expect(result.password).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.plan).toBeUndefined();
    expect(result.isVerified).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
});

describe('UserService.deleteUser', () => {
  it('delegates to the repository', async () => {
    userRepository.delete.mockResolvedValue({ _id: 'u1' });
    await userService.deleteUser('u1');
    expect(userRepository.delete).toHaveBeenCalledWith('u1');
  });
});
