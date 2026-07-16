// Full auth flow against a real in-memory MongoDB.
jest.mock('../../src/config/mailer');

const request = require('supertest');
const mailer = require('../../src/config/mailer');
const { startDb, stopDb, clearDb } = require('./setup');

let app;
let User;

beforeAll(async () => {
  await startDb();
  app = require('../../src/app');
  User = require('../../src/modules/user/user.model');
});

afterAll(async () => { await stopDb(); });

beforeEach(async () => {
  await clearDb();
  mailer.sendVerificationEmail.mockResolvedValue();
  mailer.sendResetPasswordEmail.mockResolvedValue();
});

const signupBody = {
  username: 'ilyas99',
  email: 'ilyas@example.com',
  firstName: 'Ilyas',
  lastName: 'Qabbal',
  password: 'secret123',
};

describe('POST /auth/signup', () => {
  it('creates a user and persists it (unverified, hashed password)', async () => {
    const res = await request(app).post('/auth/signup').send(signupBody);
    expect(res.status).toBe(201);

    const stored = await User.findOne({ email: signupBody.email }).select('+password');
    expect(stored).toBeTruthy();
    expect(stored.isVerified).toBe(false);
    expect(stored.password).not.toBe(signupBody.password); // hashed
    expect(stored.plan).toBe('beta');
  });

  it('rejects a duplicate username', async () => {
    await request(app).post('/auth/signup').send(signupBody);
    const res = await request(app)
      .post('/auth/signup')
      .send({ ...signupBody, email: 'other@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Username already exists/);
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/auth/signup').send(signupBody);
    const res = await request(app)
      .post('/auth/signup')
      .send({ ...signupBody, username: 'different' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Email already exists/);
  });

  it('rejects invalid input with 400 and error list', async () => {
    const res = await request(app).post('/auth/signup').send({ username: 'a' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('email verification + login flow', () => {
  it('cannot log in before verifying', async () => {
    await request(app).post('/auth/signup').send(signupBody);
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: signupBody.username, password: signupBody.password });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/verify your email/);
  });

  it('verifies via token then logs in successfully', async () => {
    await request(app).post('/auth/signup').send(signupBody);
    const user = await User.findOne({ email: signupBody.email });

    const verifyRes = await request(app)
      .get('/auth/verify-email')
      .query({ token: user.verificationToken });
    expect(verifyRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ identifier: signupBody.username, password: signupBody.password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.password).toBeUndefined();
  });

  it('rejects a wrong password after verification', async () => {
    await request(app).post('/auth/signup').send(signupBody);
    const user = await User.findOne({ email: signupBody.email });
    await request(app).get('/auth/verify-email').query({ token: user.verificationToken });

    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: signupBody.username, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('password reset flow', () => {
  it('issues a reset token and resets the password', async () => {
    await request(app).post('/auth/signup').send(signupBody);
    let user = await User.findOne({ email: signupBody.email });
    await request(app).get('/auth/verify-email').query({ token: user.verificationToken });

    const forgotRes = await request(app).post('/auth/forgot-password').send({ email: signupBody.email });
    expect(forgotRes.status).toBe(200);

    user = await User.findOne({ email: signupBody.email });
    expect(user.resetPasswordToken).toBeTruthy();

    const resetRes = await request(app)
      .post('/auth/reset-password')
      .send({ token: user.resetPasswordToken, password: 'newsecret123' });
    expect(resetRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ identifier: signupBody.username, password: 'newsecret123' });
    expect(loginRes.status).toBe(200);
  });
});
