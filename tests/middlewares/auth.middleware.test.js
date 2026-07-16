const jwt = require('jsonwebtoken');
const authenticate = require('../../src/middlewares/auth.middleware');

jest.mock('jsonwebtoken');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('rejects when there is no Authorization header', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when the header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Token abc' } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.user on a valid token', () => {
    jwt.verify.mockReturnValue({ userId: 'u1', username: 'ilyas' });
    const req = { headers: { authorization: 'Bearer good.token' } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('good.token', 'test-secret');
    expect(req.user).toEqual({ userId: 'u1', username: 'ilyas' });
    expect(next).toHaveBeenCalled();
  });

  it('rejects an invalid/expired token', () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    const req = { headers: { authorization: 'Bearer bad.token' } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
});
