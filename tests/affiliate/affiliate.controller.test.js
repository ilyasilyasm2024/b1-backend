jest.mock('../../src/modules/affiliate/affiliate.service');

const service = require('../../src/modules/affiliate/affiliate.service');
const controller = require('../../src/modules/affiliate/affiliate.controller');
const { mockReq, mockRes } = require('../helpers/http');

describe('AffiliateController.createInfluencer', () => {
  it('returns 400 on invalid body', async () => {
    const res = mockRes();
    await controller.createInfluencer(mockReq({ body: { name: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toHaveProperty('errors');
  });

  it('returns 201 on success', async () => {
    service.createInfluencer.mockResolvedValue({ _id: 'i1' });
    const res = mockRes();
    await controller.createInfluencer(mockReq({ body: { name: 'Ilyas', email: 'a@b.com', password: 'secret123' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 when the service throws', async () => {
    service.createInfluencer.mockRejectedValue(new Error('exists'));
    const res = mockRes();
    await controller.createInfluencer(mockReq({ body: { name: 'Ilyas', email: 'a@b.com', password: 'secret123' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('AffiliateController.listInfluencers', () => {
  it('returns the list', async () => {
    service.listInfluencers.mockResolvedValue([{ _id: 'i1' }]);
    const res = mockRes();
    await controller.listInfluencers(mockReq(), res);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'i1' }]);
  });

  it('returns 500 on error', async () => {
    service.listInfluencers.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await controller.listInfluencers(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('AffiliateController.payout', () => {
  it('pays out using params and body period', async () => {
    service.payout.mockResolvedValue({ paidAmount: 10 });
    const res = mockRes();
    await controller.payout(mockReq({ params: { influencerId: 'i1' }, body: { period: '2026-07' } }), res);
    expect(service.payout).toHaveBeenCalledWith('i1', '2026-07');
    expect(res.json).toHaveBeenCalledWith({ paidAmount: 10 });
  });

  it('returns 400 on error', async () => {
    service.payout.mockRejectedValue(new Error('x'));
    const res = mockRes();
    await controller.payout(mockReq({ params: { influencerId: 'i1' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('AffiliateController.updateInfluencer', () => {
  it('updates via params', async () => {
    service.updateInfluencer.mockResolvedValue({ _id: 'i1' });
    const res = mockRes();
    await controller.updateInfluencer(mockReq({ params: { influencerId: 'i1' }, body: { discountPercent: 5 } }), res);
    expect(service.updateInfluencer).toHaveBeenCalledWith('i1', { discountPercent: 5 });
  });
});

describe('AffiliateController.login', () => {
  it('returns 400 on invalid body', async () => {
    const res = mockRes();
    await controller.login(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when the service throws', async () => {
    service.login.mockRejectedValue(new Error('Invalid credentials'));
    const res = mockRes();
    await controller.login(mockReq({ body: { email: 'a@b.com', password: 'p' } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('succeeds with valid credentials', async () => {
    service.login.mockResolvedValue({ token: 't' });
    const res = mockRes();
    await controller.login(mockReq({ body: { email: 'a@b.com', password: 'p' } }), res);
    expect(res.json).toHaveBeenCalledWith({ token: 't' });
  });
});

describe('AffiliateController.dashboard', () => {
  it('uses req.influencer.influencerId', async () => {
    service.getDashboard.mockResolvedValue({ stats: {} });
    const res = mockRes();
    await controller.dashboard(mockReq({ influencer: { influencerId: 'i1' } }), res);
    expect(service.getDashboard).toHaveBeenCalledWith('i1');
  });

  it('returns 400 on error', async () => {
    service.getDashboard.mockRejectedValue(new Error('x'));
    const res = mockRes();
    await controller.dashboard(mockReq({ influencer: { influencerId: 'i1' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('AffiliateController.validateCode', () => {
  it('validates the code param', async () => {
    service.validateCode.mockResolvedValue({ valid: true });
    const res = mockRes();
    await controller.validateCode(mockReq({ params: { code: 'ILYAS20' } }), res);
    expect(res.json).toHaveBeenCalledWith({ valid: true });
  });
});

describe('AffiliateController.generatePromo', () => {
  it('returns 201 on success', async () => {
    service.generatePromoCode.mockResolvedValue({ code: 'GIFT-X' });
    const res = mockRes();
    await controller.generatePromo(mockReq({ influencer: { influencerId: 'i1' }, body: { plan: 'gold' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 when limit reached', async () => {
    service.generatePromoCode.mockRejectedValue(new Error('Limit'));
    const res = mockRes();
    await controller.generatePromo(mockReq({ influencer: { influencerId: 'i1' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('AffiliateController.listPromos', () => {
  it('lists codes', async () => {
    service.listPromoCodes.mockResolvedValue([{ code: 'GIFT-X' }]);
    const res = mockRes();
    await controller.listPromos(mockReq({ influencer: { influencerId: 'i1' } }), res);
    expect(res.json).toHaveBeenCalledWith([{ code: 'GIFT-X' }]);
  });
});

describe('AffiliateController.redeemPromo', () => {
  it('returns 400 without a code', async () => {
    const res = mockRes();
    await controller.redeemPromo(mockReq({ user: { userId: 'u1', username: 'ilyas' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('redeems with a code', async () => {
    service.redeemPromoCode.mockResolvedValue({ plan: 'gold' });
    const res = mockRes();
    await controller.redeemPromo(mockReq({ user: { userId: 'u1', username: 'ilyas' }, body: { code: 'GIFT-X' } }), res);
    expect(service.redeemPromoCode).toHaveBeenCalledWith('GIFT-X', 'u1', 'ilyas');
  });

  it('returns 400 when redemption fails', async () => {
    service.redeemPromoCode.mockRejectedValue(new Error('abgelaufen'));
    const res = mockRes();
    await controller.redeemPromo(mockReq({ user: { userId: 'u1', username: 'ilyas' }, body: { code: 'GIFT-X' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
