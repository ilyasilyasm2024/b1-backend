// Verifies the custom MongoDB rate-limit store against a real database:
// atomic increment, shared counting (simulating multiple serverless instances),
// TTL index creation, and reset.
const MongoRateLimitStore = require('../../src/middlewares/mongoRateLimitStore');
const { startDb, stopDb, clearDb, mongoose } = require('./setup');

beforeAll(async () => { await startDb(); });
afterAll(async () => { await stopDb(); });
beforeEach(async () => { await clearDb(); });

describe('MongoRateLimitStore', () => {
  it('increments a key and returns the running total', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rl_test', windowMs: 60000 });
    const first = await store.increment('1.2.3.4');
    const second = await store.increment('1.2.3.4');
    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
    expect(second.resetTime).toBeInstanceOf(Date);
  });

  it('counts the SAME key shared across separate store instances (multi-instance)', async () => {
    // Two instances = two serverless lambdas hitting one shared collection.
    const a = new MongoRateLimitStore({ collectionName: 'rl_shared', windowMs: 60000 });
    const b = new MongoRateLimitStore({ collectionName: 'rl_shared', windowMs: 60000 });
    await a.increment('9.9.9.9');
    await b.increment('9.9.9.9');
    const third = await a.increment('9.9.9.9');
    // The count is shared in the DB, not per-instance memory.
    expect(third.totalHits).toBe(3);
  });

  it('tracks different keys independently', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rl_keys', windowMs: 60000 });
    await store.increment('a');
    const b1 = await store.increment('b');
    expect(b1.totalHits).toBe(1);
  });

  it('resetKey clears the counter', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rl_reset', windowMs: 60000 });
    await store.increment('x');
    await store.increment('x');
    await store.resetKey('x');
    const after = await store.increment('x');
    expect(after.totalHits).toBe(1);
  });

  it('decrement lowers the count', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rl_dec', windowMs: 60000 });
    await store.increment('y');
    await store.increment('y');
    await store.decrement('y');
    const after = await store.increment('y');
    expect(after.totalHits).toBe(2); // 2 - 1 + 1
  });

  it('creates a TTL index for automatic window expiry', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rl_ttl', windowMs: 60000 });
    await store.increment('z');
    const indexes = await mongoose.connection.collection('rl_ttl').indexes();
    const ttl = indexes.find((i) => i.key.expiresAt === 1);
    expect(ttl).toBeDefined();
    expect(ttl.expireAfterSeconds).toBe(0);
  });
});
