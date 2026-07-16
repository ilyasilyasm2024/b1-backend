// Verifies the app-level security middleware end-to-end: auth guards,
// NoSQL-injection key stripping, HTML stripping, and the notes rich-text
// allowlist exemption.
jest.mock('../../src/config/mailer');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { startDb, stopDb, clearDb } = require('./setup');

let app;
let User;
let Note;

async function makeVerifiedUser() {
  const bcrypt = require('bcrypt');
  const user = await User.create({
    username: 'ilyas99',
    email: 'ilyas@example.com',
    firstName: 'Ilyas',
    lastName: 'Qabbal',
    password: await bcrypt.hash('secret123', 10),
    isVerified: true,
    plan: 'beta',
  });
  const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token };
}

beforeAll(async () => {
  await startDb();
  app = require('../../src/app');
  User = require('../../src/modules/user/user.model');
  Note = require('../../src/modules/notes/notes.model');
});

afterAll(async () => { await stopDb(); });
beforeEach(async () => { await clearDb(); });

describe('authentication guard', () => {
  it('blocks protected routes without a token', async () => {
    const res = await request(app).get('/users/me');
    expect(res.status).toBe(401);
  });

  it('blocks protected routes with a garbage token', async () => {
    const res = await request(app).get('/users/me').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('allows access with a valid token', async () => {
    const { token } = await makeVerifiedUser();
    const res = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('ilyas99');
  });
});

describe('NoSQL injection guard', () => {
  it('strips $-prefixed keys from the body so operator injection fails', async () => {
    // Attempt to log in with a Mongo operator instead of a real password/identifier.
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: { $ne: null }, password: { $ne: null } });
    // After sanitization the operator keys are removed → invalid input, never a match.
    expect([400, 401]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
  });
});

describe('HTML stripping on normal routes', () => {
  it('strips tags from string fields (e.g. profile update)', async () => {
    const { token } = await makeVerifiedUser();
    const res = await request(app)
      .put('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: '<script>alert(1)</script>Ilyas' });
    expect(res.status).toBe(200);
    expect(res.body.firstName).not.toContain('<script>');
    expect(res.body.firstName).toContain('Ilyas');
  });
});

describe('notes rich-text allowlist (exempt from global stripping)', () => {
  it('keeps allowed formatting but removes scripts', async () => {
    const { token } = await makeVerifiedUser();
    const res = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: '<b>bold</b><script>alert(1)</script>' });
    expect(res.status).toBe(201);
    expect(res.body.content).toContain('<b>bold</b>');
    expect(res.body.content).not.toContain('script');

    const stored = await Note.findById(res.body._id);
    expect(stored.content).toContain('<b>bold</b>');
  });

  it('rejects an invalid hex color via validation', async () => {
    const { token } = await makeVerifiedUser();
    const res = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: 'hi', color: 'red' });
    expect(res.status).toBe(400);
  });
});

describe('body size limit', () => {
  it('rejects an oversized payload (never persists it)', async () => {
    const { token } = await makeVerifiedUser();
    const Note = require('../../src/modules/notes/notes.model');
    const huge = 'a'.repeat(60 * 1024); // > 50kb limit
    const res = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: huge });
    expect(res.status).toBe(413);
    expect(await Note.countDocuments()).toBe(0);
  });
});
