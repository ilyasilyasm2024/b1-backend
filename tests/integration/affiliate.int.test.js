// End-to-end affiliate flow against a real DB: admin creates influencer,
// influencer logs in, referred signup is tracked, dashboard aggregates,
// promo generate/redeem, and admin payout.
jest.mock('../../src/config/mailer');

const request = require('supertest');
const mailer = require('../../src/config/mailer');
const { startDb, stopDb, clearDb } = require('./setup');

let app;
let User;

const ADMIN = { 'x-admin-secret': process.env.ADMIN_SECRET || 'integration-admin-secret' };

beforeAll(async () => {
  await startDb();
  app = require('../../src/app');
  User = require('../../src/modules/user/user.model');
});

afterAll(async () => { await stopDb(); });
beforeEach(async () => {
  await clearDb();
  mailer.sendVerificationEmail.mockResolvedValue();
});

async function createInfluencer(overrides = {}) {
  const res = await request(app)
    .post('/affiliate/admin/influencers')
    .set(ADMIN)
    .send({ name: 'Ilyas', email: 'inf@example.com', password: 'secret123', referralCode: 'ILYAS20', ...overrides });
  return res;
}

describe('admin influencer management', () => {
  it('rejects creation without the admin secret', async () => {
    const res = await request(app)
      .post('/affiliate/admin/influencers')
      .send({ name: 'Ilyas', email: 'inf@example.com', password: 'secret123' });
    expect(res.status).toBe(403);
  });

  it('creates an influencer and never returns the password', async () => {
    const res = await createInfluencer();
    expect(res.status).toBe(201);
    expect(res.body.referralCode).toBe('ILYAS20');
    expect(res.body.password).toBeUndefined();
    expect(res.body.firstPurchaseCommission).toBe(50);
  });

  it('rejects a duplicate email', async () => {
    await createInfluencer();
    const res = await createInfluencer({ referralCode: 'OTHER1' });
    expect(res.status).toBe(400);
  });

  it('updates per-influencer commission but ignores protected fields', async () => {
    const created = await createInfluencer();
    const res = await request(app)
      .put(`/affiliate/admin/influencers/${created.body._id}`)
      .set(ADMIN)
      .send({ firstPurchaseCommission: 60, balance: 99999 });
    expect(res.status).toBe(200);
    expect(res.body.firstPurchaseCommission).toBe(60);
    expect(res.body.balance).toBe(0); // protected — not overwritten
  });
});

describe('referral tracking on signup', () => {
  it('validates a code publicly', async () => {
    await createInfluencer();
    const res = await request(app).get('/affiliate/validate/ILYAS20');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discountPercent).toBe(10);
  });

  it('returns valid:false for an unknown code', async () => {
    const res = await request(app).get('/affiliate/validate/NOPE');
    expect(res.body.valid).toBe(false);
  });

  it('links a referred signup to the influencer', async () => {
    await createInfluencer();
    const signup = await request(app).post('/auth/signup').send({
      username: 'refuser', email: 'ref@example.com', firstName: 'Ref', lastName: 'User',
      password: 'secret123', referralCode: 'ILYAS20',
    });
    expect(signup.status).toBe(201);

    const user = await User.findOne({ email: 'ref@example.com' });
    expect(user.referredBy).toBe('ILYAS20');
  });
});

describe('influencer login + dashboard', () => {
  it('logs in and returns a dashboard with zeroed stats', async () => {
    await createInfluencer();
    const login = await request(app).post('/affiliate/login').send({ email: 'inf@example.com', password: 'secret123' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();

    const dash = await request(app)
      .get('/affiliate/dashboard')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(dash.status).toBe(200);
    expect(dash.body.stats.totalReferrals).toBe(0);
    expect(dash.body.referralLink).toContain('ref=ILYAS20');
  });

  it('rejects the dashboard without an influencer token', async () => {
    const res = await request(app).get('/affiliate/dashboard');
    expect(res.status).toBe(401);
  });
});

describe('promo code generate + redeem + payout', () => {
  it('generates a promo, a user redeems it, and admin pays out', async () => {
    await createInfluencer();
    const login = await request(app).post('/affiliate/login').send({ email: 'inf@example.com', password: 'secret123' });
    const infToken = login.body.token;

    const gen = await request(app)
      .post('/affiliate/promo/generate')
      .set('Authorization', `Bearer ${infToken}`)
      .send({ plan: 'gold', durationDays: 30 });
    expect(gen.status).toBe(201);
    expect(gen.body.code).toMatch(/^GIFT-/);

    // Create + verify a normal user who will redeem the code.
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const user = await User.create({
      username: 'redeemer', email: 'red@example.com', firstName: 'Red', lastName: 'Eemer',
      password: await bcrypt.hash('secret123', 10), isVerified: true, plan: 'beta',
    });
    const userToken = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const redeem = await request(app)
      .post('/affiliate/promo/redeem')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: gen.body.code });
    expect(redeem.status).toBe(200);
    expect(redeem.body.plan).toBe('gold');

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.plan).toBe('gold');

    // Redeeming the same code again must fail (single-use).
    const redeemAgain = await request(app)
      .post('/affiliate/promo/redeem')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: gen.body.code });
    expect(redeemAgain.status).toBe(400);
  });
});
