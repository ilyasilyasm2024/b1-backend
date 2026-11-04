// Billing has been removed: every /billing route answers 404, and nobody can give
// themselves a plan without paying (ALLOW_SELF_SUBSCRIBE), while the rest of the API keeps working.
jest.mock('../../src/config/mailer');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { startDb, stopDb, clearDb } = require('./setup');

let app;
let User;

async function seedUser() {
  const user = await User.create({
    username: 'student',
    email: 'student@example.com',
    firstName: 'Stu',
    lastName: 'Dent',
    password: await bcrypt.hash('secret123', 10),
    isVerified: true,
    plan: 'free',
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
afterEach(() => { process.env.ALLOW_SELF_SUBSCRIBE = 'true'; });

describe('billing removed', () => {
  it('answers 404 with a code on every billing route', async () => {
    const { token } = await seedUser();
    const checkout = await request(app).post('/billing/checkout').set('Authorization', `Bearer ${token}`).send({ plan: 'gold', billing: 'monthly' });
    expect(checkout.status).toBe(404);
    expect(checkout.body).toEqual({ error: 'Not found', code: 'NOT_FOUND' });

    const webhook = await request(app).post('/billing/webhook').send({});
    expect(webhook.status).toBe(404);

    const other = await request(app).get('/billing/anything');
    expect(other.status).toBe(404);
  });
});

describe('self-subscribe without payment', () => {
  it('is forbidden unless ALLOW_SELF_SUBSCRIBE=true, and the plan stays unchanged', async () => {
    process.env.ALLOW_SELF_SUBSCRIBE = 'false';
    const { user, token } = await seedUser();
    const res = await request(app).post('/users/me/subscribe').set('Authorization', `Bearer ${token}`).send({ plan: 'platinum' });
    expect(res.status).toBe(403);
    expect((await User.findById(user._id)).plan).toBe('free');
  });

  it('other user routes still work', async () => {
    const { token } = await seedUser();
    const res = await request(app).get('/users/me/plan').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
  });
});
