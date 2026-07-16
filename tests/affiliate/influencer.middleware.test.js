const jwt = require('jsonwebtoken');
const authenticateInfluencer = require('../../src/modules/affiliate/influencer.middleware');

jest.mock('jsonwebtoken');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticateInfluencer middleware', () => {
  beforeAll(() => { process.env.JWT_SECRET = 'test-secret'; });

  it('rejects a missing token', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authenticateInfluencer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a token whose role is not influencer', () => {
    jwt.verify.mockReturnValue({ userId: 'u1', role: 'user' });
    const req = { headers: { authorization: 'Bearer t' } };
    const res = mockRes();
    const next = jest.fn();

    authenticateInfluencer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not an influencer account' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.influencer and calls next for an influencer token', () => {
    jwt.verify.mockReturnValue({ influencerId: 'i1', role: 'influencer' });
    const req = { headers: { authorization: 'Bearer t' } };
    const res = mockRes();
    const next = jest.fn();

    authenticateInfluencer(req, res, next);

    expect(req.influencer).toEqual({ influencerId: 'i1', role: 'influencer' });
    expect(next).toHaveBeenCalled();
  });

  it('rejects an invalid token', () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    const req = { headers: { authorization: 'Bearer t' } };
    const res = mockRes();
    const next = jest.fn();

    authenticateInfluencer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
