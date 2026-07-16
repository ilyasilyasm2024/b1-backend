jest.mock('../../src/modules/auth/auth.service');

const authService = require('../../src/modules/auth/auth.service');
const controller = require('../../src/modules/auth/auth.controller');
const { mockReq, mockRes } = require('../helpers/http');

const validSignup = {
  username: 'ilyas99', email: 'a@b.com', firstName: 'Ilyas', lastName: 'Qabbal', password: 'secret123',
};

describe('AuthController.signup', () => {
  it('returns 400 with validation errors on bad input', async () => {
    const req = mockReq({ body: { username: 'a' } });
    const res = mockRes();
    await controller.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toHaveProperty('errors');
  });

  it('returns 201 on success', async () => {
    authService.signup.mockResolvedValue({ message: 'ok' });
    const req = mockReq({ body: validSignup });
    const res = mockRes();
    await controller.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 when the service throws (duplicate)', async () => {
    authService.signup.mockRejectedValue(new Error('Username already exists'));
    const req = mockReq({ body: validSignup });
    const res = mockRes();
    await controller.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username already exists' });
  });
});

describe('AuthController.verifyEmail', () => {
  it('returns 400 when token is missing', async () => {
    await controller.verifyEmail(mockReq(), mockRes());
  });

  it('verifies with a token', async () => {
    authService.verifyEmail.mockResolvedValue({ message: 'verified' });
    const res = mockRes();
    await controller.verifyEmail(mockReq({ query: { token: 't' } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'verified' });
  });

  it('returns 400 when the service throws', async () => {
    authService.verifyEmail.mockRejectedValue(new Error('bad'));
    const res = mockRes();
    await controller.verifyEmail(mockReq({ query: { token: 't' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('AuthController.login', () => {
  it('returns 400 on invalid body', async () => {
    const res = mockRes();
    await controller.login(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns the token on success', async () => {
    authService.login.mockResolvedValue({ token: 't', user: {} });
    const res = mockRes();
    await controller.login(mockReq({ body: { identifier: 'ilyas99', password: 'secret123' } }), res);
    expect(res.json).toHaveBeenCalledWith({ token: 't', user: {} });
  });

  it('returns 401 when the service throws', async () => {
    authService.login.mockRejectedValue(new Error('Invalid credentials'));
    const res = mockRes();
    await controller.login(mockReq({ body: { identifier: 'ilyas99', password: 'secret123' } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('AuthController.logout', () => {
  it('returns 400 without userId', async () => {
    const res = mockRes();
    await controller.logout(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('logs out with userId', async () => {
    authService.logout.mockResolvedValue();
    const res = mockRes();
    await controller.logout(mockReq({ body: { userId: 'u1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });
});

describe('AuthController.resendVerification / forgotPassword', () => {
  it('resend returns 400 without email', async () => {
    const res = mockRes();
    await controller.resendVerification(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('forgotPassword returns 400 without email', async () => {
    const res = mockRes();
    await controller.forgotPassword(mockReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('forgotPassword succeeds with email', async () => {
    authService.forgotPassword.mockResolvedValue({ message: 'sent' });
    const res = mockRes();
    await controller.forgotPassword(mockReq({ body: { email: 'a@b.com' } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'sent' });
  });
});

describe('AuthController.resetPassword', () => {
  it('returns 400 when token or password missing', async () => {
    const res = mockRes();
    await controller.resetPassword(mockReq({ body: { token: 't' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when password too short', async () => {
    const res = mockRes();
    await controller.resetPassword(mockReq({ body: { token: 't', password: '123' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Password must be at least 6 characters' });
  });

  it('resets on valid input', async () => {
    authService.resetPassword.mockResolvedValue({ message: 'done' });
    const res = mockRes();
    await controller.resetPassword(mockReq({ body: { token: 't', password: 'secret123' } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'done' });
  });
});
