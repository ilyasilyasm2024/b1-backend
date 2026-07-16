# Production Testing Blueprint — b1-backend

A complete, stack-tailored QA blueprint for shipping to production with confidence.

**Stack:** Node.js (CommonJS) · Express 5 · Mongoose 9 (MongoDB) · Jest + Supertest ·
JWT auth · REST APIs · separate WebSocket chat server · serverless (Vercel).

**Current state:** 324 tests passing (30 suites) — 282 unit + 42 integration.
Security audit passes clean. Load-test scripts ready for staging.

---

## The testing pyramid (what runs where)

```
        /\        E2E workflow (sequential, real DB)         ← few, high value
       /  \       tests/integration/*.int.test.js
      /----\      Integration (HTTP + real in-memory Mongo)  ← medium
     /      \     tests/integration/*.int.test.js
    /--------\    Unit (mocked, fast)                         ← many, fast
   /__________\   tests/**/*.test.js
```

Run:
```bash
npm run test:unit         # fast, no DB (~3s)
npm run test:integration  # real in-memory MongoDB
npm test                  # everything
npm run test:coverage     # coverage report
npm run audit:security    # pre-deploy gate
```

---

## 1. UNIT TESTS

Pure logic, no I/O, no mocking overhead. Location: `tests/<module>/*.test.js`.

**Covered:** validation schemas (Joi), the HTML sanitizer, plan/pricing logic,
service business rules (with mocked repositories), and error branches in controllers.

Template — a pure utility/schema test (no mocks needed):
```js
// tests/config/plans.test.js
const { getEffectivePlan } = require('../../src/config/plans');

describe('getEffectivePlan', () => {
  it('downgrades an expired paid plan to free', () => {
    const past = new Date(Date.now() - 86400000);
    expect(getEffectivePlan({ plan: 'gold', subscriptionExpiresAt: past })).toBe('free');
  });
});
```

Template — a service with a mocked repository (isolate logic from the DB):
```js
jest.mock('../../src/modules/user/user.repository');
const repo = require('../../src/modules/user/user.repository');
const service = require('../../src/modules/user/user.service');

it('rejects when the subscribe lock is held', async () => {
  repo.acquireSubscribeLock.mockResolvedValue(null); // someone else holds it
  await expect(service.subscribe('u1', { plan: 'gold' }))
    .rejects.toThrow('already being processed');
});
```

---

## 2. INTEGRATION TESTS

Full HTTP request/response cycle over the real Express stack, backed by an
isolated in-memory MongoDB (`mongodb-memory-server`). Shared lifecycle in
`tests/integration/setup.js` (start DB → point app at it → clear between tests).

### a) Public endpoint with input validation (201 + 400)
```js
// 201 — valid signup persists a hashed, unverified user
const ok = await request(app).post('/auth/signup').send(validSignup);
expect(ok.status).toBe(201);

// 400 — invalid body returns a structured error list
const bad = await request(app).post('/auth/signup').send({ username: 'a' });
expect(bad.status).toBe(400);
expect(bad.body.errors).toBeDefined();
```

### b) Protected route (200 / 401 / 403)
```js
// 401 — no token
expect((await request(app).get('/users/me')).status).toBe(401);

// 200 — valid JWT
const res = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);
expect(res.status).toBe(200);

// 403 — wrong role (influencer-only route hit with a user token)
const forbidden = await request(app)
  .get('/affiliate/dashboard')
  .set('Authorization', `Bearer ${userToken}`); // not an influencer token
expect([401, 403]).toContain(forbidden.status);
```

### c) Graceful 500 when the DB fails (server must NOT crash)
```js
// tests/integration/error-handling.int.test.js
jest.spyOn(User, 'findById').mockImplementationOnce(() => { throw new Error('DB outage'); });

const res = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);
expect(res.status).toBe(500);
expect(res.body.error).toBe('Something went wrong'); // generic — no internal leak
expect(JSON.stringify(res.body)).not.toMatch(/DB outage/);

// Next request still succeeds → the process survived.
const ok = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);
expect(ok.status).toBe(200);
```
> This category found and fixed a real issue: ~30 controllers were returning
> `err.message` on 500, leaking internals (OWASP A09). All now log server-side
> and return a generic message.

---

## 3. END-TO-END (E2E) WORKFLOW

A sequential real-user journey with state verification. See
`tests/integration/affiliate.int.test.js` for the full version. Shape:

```js
it('register → verify → login → act → verify state change', async () => {
  // 1. Register
  await request(app).post('/auth/signup').send(user);

  // 2. Verify email (token read from the DB in test)
  const stored = await User.findOne({ email: user.email });
  await request(app).get('/auth/verify-email').query({ token: stored.verificationToken });

  // 3. Login → extract token
  const login = await request(app).post('/auth/login')
    .send({ identifier: user.username, password: user.password });
  const token = login.body.token;

  // 4. Perform a core action with the token
  const note = await request(app).post('/notes')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'text', content: '<b>hi</b>' });
  expect(note.status).toBe(201);

  // 5. Verify the state change persisted
  const list = await request(app).get('/notes').set('Authorization', `Bearer ${token}`);
  expect(list.body).toHaveLength(1);
});
```

---

## 4. PERFORMANCE & LOAD TESTING (k6)

Scripts in `load-tests/`. Install k6: https://k6.io/docs/get-started/installation/

| Scenario | File | Purpose | Command |
|----------|------|---------|---------|
| Smoke | `smoke.js` | 1 VU / 30s — does it work at all? | `npm run loadtest:smoke` |
| Load | `load.js` | ramp to 200 VUs sustained — holds SLOs under realistic traffic? | `npm run loadtest:load` |
| Spike | `spike.js` | sudden 1500 VUs then recover — memory leaks / CPU / recovery? | `npm run loadtest:spike` |

Point at staging (never local, never prod data):
```bash
k6 run -e BASE_URL=https://staging.example.com \
       -e TEST_USER=loadtest_user -e TEST_PASS=... \
       load-tests/load.js
```

SLO thresholds (in `load-tests/config.js`) act as pass/fail gates:
- `http_req_duration: p(95)<500ms, p(99)<800ms`
- `http_req_failed: rate<1%`

**Spike note:** a `429` (rate-limited) or `503` under a spike is a PASS — it means
your protection works. Watch Atlas connection count and Vercel memory during the run.

---

## 5. SECURITY & PIPELINE AUDIT

One command runs the full pre-deploy gate:
```bash
npm run audit:security
```
It checks (and exits non-zero on hard failures):

| Check | Command it runs |
|-------|-----------------|
| Dependency CVEs | `npm audit --omit=dev --audit-level=high` |
| Outdated packages | `npm outdated` |
| `.env` not committed | `git ls-files --error-unmatch .env` |
| Hardcoded secrets in src | regex scan for connection strings / API keys |
| Required env vars | `JWT_SECRET`, `MONGO_DB_URL`, `ADMIN_SECRET`, `CORS_ORIGIN` |
| CORS not wildcard | greps `.env` for `CORS_ORIGIN=*` |
| Security middleware present | helmet, body limit, mongo-sanitize, rate limit |
| Tests pass | `npm test` |

> This audit found and fixed a real supply-chain CVE: `rate-limit-mongo` pulled
> in a vulnerable `underscore` (high-severity DoS, no upstream fix). Replaced with
> a dependency-free custom `MongoRateLimitStore` that reuses the existing
> connection and a native TTL index. `npm audit` now reports **0 vulnerabilities**.

### Manual pre-deploy checklist
- [ ] `npm run audit:security` passes
- [ ] `CORS_ORIGIN` set to explicit production domains (no `*`)
- [ ] `JWT_SECRET` / `ADMIN_SECRET` are strong, unique, and only in the deploy env
- [ ] MongoDB Atlas tier is M10+ for 10k users
- [ ] Rate limiting verified live (429 after threshold) on staging
- [ ] Smoke + load + spike k6 runs green against staging
- [ ] Verification/reset emails deliver from the production SMTP sender
- [ ] Error responses never contain stack traces (verified by tests)

---

## CI (GitHub Actions)

`.github/workflows/test.yml` runs on every push/PR:
1. `npm ci`
2. `npm run test:unit`
3. `npm run test:integration`
4. `npm audit --omit=dev --audit-level=high`

A red pipeline blocks the merge — tests and the security gate are enforced, not optional.

---

## WebSocket chat server (separate service)

The chat server (`b1-chat-server`) is a separate process and not covered here.
Recommended next step: a small integration suite using the `ws` client to assert
connection auth, message broadcast, and the per-connection rate limit. Load-test
it separately with k6's WebSocket module (`k6/ws`).
