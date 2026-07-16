const requireAdmin = require('../../src/modules/affiliate/admin.middleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireAdmin middleware', () => {
  const OLD_ENV = process.env.ADMIN_SECRET;
  afterAll(() => { process.env.ADMIN_SECRET = OLD_ENV; });

  it('returns 500 when ADMIN_SECRET is not configured', () => {
    delete process.env.ADMIN_SECRET;
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the secret does not match', () => {
    process.env.ADMIN_SECRET = 'correct';
    const req = { headers: { 'x-admin-secret': 'wrong' } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin access denied' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the header is missing', () => {
    process.env.ADMIN_SECRET = 'correct';
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when the secret matches', () => {
    process.env.ADMIN_SECRET = 'correct';
    const req = { headers: { 'x-admin-secret': 'correct' } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
