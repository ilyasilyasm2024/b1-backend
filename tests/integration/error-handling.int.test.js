// Category 2c: Graceful error handling.
// Proves that when a database query throws unexpectedly, the route responds
// with a clean 500 (no stack trace leaked) and the server process does NOT crash.
jest.mock('../../src/config/mailer');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { startDb, stopDb, clearDb } = require('./setup');

let app;
let User;

async function makeVerifiedUser() {
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
});

afterAll(async () => { await stopDb(); });
beforeEach(async () => { await clearDb(); });
afterEach(() => jest.restoreAllMocks());

describe('graceful 500 handling when the database layer fails', () => {
  it('returns a clean 500 (no stack trace) when a query throws', async () => {
    const { token } = await makeVerifiedUser();

    // Force the underlying query to blow up as if the DB connection dropped.
    jest.spyOn(User, 'findById').mockImplementationOnce(() => {
      throw new Error('Simulated DB outage');
    });

    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Something went wrong'); // generic message
    expect(JSON.stringify(res.body)).not.toMatch(/Simulated DB outage/); // no leak
    expect(res.body.stack).toBeUndefined();
  });

  it('keeps serving requests after a failure (process did not crash)', async () => {
    const { token } = await makeVerifiedUser();

    jest.spyOn(User, 'findById').mockImplementationOnce(() => {
      throw new Error('Transient failure');
    });

    // First request fails...
    const failed = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);
    expect(failed.status).toBe(500);

    // ...the very next request succeeds, proving the server is still alive.
    const ok = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.username).toBe('ilyas99');
  });

  it('returns 400 for malformed JSON instead of crashing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ "identifier": "x", '); // broken JSON
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid JSON body');
  });
});
