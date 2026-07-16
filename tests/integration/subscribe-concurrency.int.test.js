// Proves the subscribe lock prevents duplicate commissions when the same user
// fires many subscribe requests in parallel (the race condition we fixed).
jest.mock('../../src/config/mailer');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { startDb, stopDb, clearDb } = require('./setup');

let app;
let User;
let Influencer;
let Referral;
let Commission;

async function seedReferredUser() {
  const influencer = await Influencer.create({
    name: 'Ilyas',
    email: 'inf@example.com',
    password: await bcrypt.hash('secret123', 10),
    referralCode: 'ILYAS20',
    discountPercent: 10,
    commissionPercent: 20,
    firstPurchaseCommission: 50,
    renewalCommission: 20,
    status: 'active',
  });

  const user = await User.create({
    username: 'buyer',
    email: 'buyer@example.com',
    firstName: 'Buy',
    lastName: 'Er',
    password: await bcrypt.hash('secret123', 10),
    isVerified: true,
    plan: 'beta',
    referredBy: 'ILYAS20',
  });

  await Referral.create({
    influencerId: influencer._id,
    referralCode: 'ILYAS20',
    userId: user._id,
    username: user.username,
    userEmail: user.email,
  });

  const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { influencer, user, token };
}

beforeAll(async () => {
  await startDb();
  app = require('../../src/app');
  User = require('../../src/modules/user/user.model');
  Influencer = require('../../src/modules/affiliate/influencer.model');
  Referral = require('../../src/modules/affiliate/referral.model');
  Commission = require('../../src/modules/affiliate/commission.model');
});

afterAll(async () => { await stopDb(); });
beforeEach(async () => { await clearDb(); });

describe('subscribe concurrency (lock prevents duplicate commissions)', () => {
  it('creates exactly ONE commission when 10 subscribe calls fire in parallel', async () => {
    const { influencer, token } = await seedReferredUser();

    const calls = Array.from({ length: 10 }, () =>
      request(app)
        .post('/users/me/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({ plan: 'gold', billing: 'monthly' })
    );

    const results = await Promise.all(calls);

    const succeeded = results.filter((r) => r.status === 200);
    const rejected = results.filter((r) => r.status !== 200);

    // At most one request should have won the lock and recorded a commission.
    expect(succeeded.length).toBeGreaterThanOrEqual(1);
    expect(rejected.length).toBeGreaterThanOrEqual(1);

    const commissions = await Commission.find({ influencerId: influencer._id });
    expect(commissions).toHaveLength(1);

    // The commission uses the first-purchase rate: 50% of (50 - 10% discount = 45) = 22.5
    expect(commissions[0].commissionAmount).toBe(22.5);

    // Influencer balance reflects exactly one commission.
    const fresh = await Influencer.findById(influencer._id);
    expect(fresh.balance).toBe(22.5);
  });

  it('applies renewal rate on a real second (sequential) purchase', async () => {
    const { influencer, token } = await seedReferredUser();

    const first = await request(app)
      .post('/users/me/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'gold', billing: 'monthly' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/users/me/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'gold', billing: 'monthly' });
    expect(second.status).toBe(200);

    const commissions = await Commission.find({ influencerId: influencer._id }).sort({ createdAt: 1 });
    expect(commissions).toHaveLength(2);
    expect(commissions[0].commissionPercent).toBe(50); // first purchase
    expect(commissions[1].commissionPercent).toBe(20); // renewal
  });
});
