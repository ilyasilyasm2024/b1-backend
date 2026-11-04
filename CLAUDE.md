# b1-ubungen-backend-app — project guide

REST API for a **German B1 exam-prep app** ("B1 Prüfungsvorbereitung", Zertifikat B1 neu),
aimed at Arabic-speaking learners (vocabulary is `deutsch` ↔ `arabic`, prices are in **MAD**).
Users practise exam modules (Lesen/Hören answers, Schreiben texts, Sprechen recordings),
keep a vocabulary list and sticky notes, and get paid plans through promo codes (no payment provider). Influencers bring users in
with referral codes and earn commissions.

Sibling projects in `../`:
- `b1-ubungen-frontend-app` — Vite + React/TS client (talks to this API, does i18n, enforces most plan limits in the UI).
- `b1-affiliate-app` — Vite app for the influencer dashboard (uses `/affiliate/*`).
- `b1-chat-server` — separate WebSocket chat server (not part of this API).

## Stack & runtime

- Node (CommonJS), **Express 5**, **Mongoose 9** (MongoDB Atlas), Joi, JWT, bcrypt, nodemailer, helmet, express-rate-limit.
- Deployed **serverless on Vercel**: `vercel.json` rewrites everything to `api/index.js`, which exports `src/app.js`.
- `index.js` = local dev entry: connects DB and calls `listen` **only when `NODE_ENV !== 'production'`**.
- DB connection: `src/config/database.js` caches the connection promise on `globalThis.__mongoose`
  (serverless-safe, pool 10). A middleware in `app.js` awaits it on every request → 503 if it fails.

```bash
npm start                 # local server (needs .env with MONGO_DB_URL, JWT_SECRET…)
npm run test:unit         # mocked, fast, no DB
npm run test:integration  # real in-memory Mongo (mongodb-memory-server) + supertest
npm test                  # both
npm run audit:security    # scripts/security-audit.sh
npm run loadtest:smoke|load|spike   # k6, see load-tests/HOW-TO-RUN.md (staging only)
```
CI: `.github/workflows/test.yml` (Node 20: unit → integration → `npm audit --audit-level=high`).

## Layout

```
src/app.js                 middleware chain + route mounting + global error handler
src/config/
  database.js              cached mongoose connection
  plans.js                 PLAN_LIMITS, PLAN_PRICES (MAD), getEffectivePlan()
  messageCodes.js          English message → stable code map (i18n), attachMessageCodes middleware
  mailer.js                nodemailer: verification + reset-password emails (German HTML)
src/middlewares/
  auth.middleware.js       Bearer JWT → req.user = { userId, username }
  mongoRateLimitStore.js   custom Mongo store for express-rate-limit (TTL index)
src/modules/<name>/        routes → controller → service → repository → model
tests/                     unit tests mirror modules; tests/integration/*.int.test.js
rapports/                  audit/testing reports (German/English) — background reading
load-tests/, scripts/      k6 scripts, load-test user seeder, security audit
models/                    empty, unused (models live inside modules)
```

Module pattern: controllers are class singletons (`module.exports = new XController()`),
validate with Joi (`{ abortEarly: false }` → `400 { errors: [...] }`), call the service, and map
thrown `Error.message` to `400 { error }` (or `500 { error: 'Something went wrong' }`).
`schreiben` and `sprechen` are simpler: controller talks to the model directly (no service/repo).

## Request pipeline (src/app.js, in order)

1. `attachMessageCodes` — wraps `res.json` to add `code`/`codes`/`messageCode`(+`params`) from `messageCodes.js`.
2. DB connect (503 on failure). 3. `trust proxy`, morgan (off in test), helmet, CORS (`CORS_ORIGIN` comma list or `*`; allows `x-admin-secret` header).
4. Rate limit: global 700 / 15 min; `/auth` 10 / 15 min. Mongo-backed (`rateLimitGlobal`, `rateLimitAuth`). **Disabled when `NODE_ENV=test`.**
5. `express.json` limit **50kb**.
6. Strip keys starting with `$` or containing `.` from body/params (NoSQL injection).
7. Strip all HTML tags from body strings — **except `/notes`** (notes use an allowlist sanitizer).
8. Routes, then global error handler (413 too large, 400 bad JSON, else 500 without stack).

## Routes

| Mount | Auth | Endpoints |
|---|---|---|
| `/auth` | public + auth limiter | `POST signup, login, logout, resend-verification, forgot-password, reset-password`; `GET verify-email?token=` |
| `/users` | JWT | `GET /me`, `GET /me/plan`, `PUT /me` (only firstName/lastName/imageUrl), `DELETE /me`, `POST /me/tour-completed`, `POST /me/subscribe` (**only if `ALLOW_SELF_SUBSCRIBE=true`**, dev/tests) |
| `/progress` | JWT | `GET /`, `GET /:moduleId`, `PUT /:moduleId` (upsert; moduleId like `m1`) |
| `/vocabulary` | JWT | `POST /`, `GET /`, `PUT /:id`, `DELETE /:id` |
| `/notes` | JWT | `POST /`, `GET /`, `PUT /:id`, `DELETE /:id` |
| `/schreiben` | JWT | `POST /`, `GET /:moduleId/:aufgabeId`, `DELETE /:id` |
| `/sprechen` | JWT | `POST /`, `GET /:moduleId/:teil`, `DELETE /:id` |
| `/billing` | — | **removed**: every path answers `404 { error: 'Not found', code: 'NOT_FOUND' }` |
| `/affiliate` | mixed | public `GET /validate/:code`; influencer `POST /login`, `GET /dashboard`, `POST /promo/generate`, `GET /promo/list`; user JWT `POST /promo/redeem`; admin (`x-admin-secret` = `ADMIN_SECRET`) `GET/POST /admin/influencers`, `PUT /admin/influencers/:id`, `POST /admin/influencers/:id/payout` |

Every data query is scoped by `req.user.userId` (`{ _id: id, userId }`) — keep that for ownership isolation.

## Domain logic

**Auth** (`auth.service.js`): signup checks username/email, validates optional referral code,
creates user with **`plan: 'beta'`**, attaches a Referral, sends verification email fire-and-forget
(token 24h). Login by username **or** email (`identifier`), requires `isVerified`, issues JWT 7d
(`{ userId, username }`), stores it on the user, updates daily `streak` / `lastLoginDate` / `loginDates`.
Reset token is 1h.

**Plans** (`config/plans.js`): `beta | free | silver | gold | platinum | lifetime`. `-1` = unlimited.
`getEffectivePlan` → `free` if `subscriptionExpiresAt` has passed (never for free/lifetime).
Prices (MAD/month): silver 30, gold 50, platinum 70, lifetime 300 one-time; yearly = 10× monthly.
⚠ Limits are **only returned** by `GET /users/me/plan`; the backend does **not** enforce them per plan.
Server-side hard caps are fixed: notes 20 text + 10 tick, Schreiben 5 versions/task (20–300 words, ≤1000 chars),
Sprechen 5 recordings/teil (≤300 s; audio lives on Cloudinary, `publicId` returned on delete so the client deletes it).

**Billing**: **removed** (2026-10-24). There is no payment provider; `/billing/*` → 404.
Plans change only via promo-code redemption, or `user.service.subscribe` (dev/tests only, behind
`ALLOW_SELF_SUBSCRIBE=true`; has an atomic `subscribeLockAt` lease lock against duplicate commissions).

**Affiliate** (`modules/affiliate`): models `Influencer`, `Referral` (1 per user), `Commission`
(1 per purchase, `pending|paid`, `period` "YYYY-MM"), `PromoCode`.
Commission rate = `firstPurchaseCommission` (default 50%) on first purchase, then `renewalCommission` (20%);
amount is computed on the price after the influencer's `discountPercent`. Balance goes up on each
commission; admin payout marks pending as paid and moves balance → totalPaid.
Influencers generate gift codes `GIFT-XXXX-XXXX` (max 20/month, valid 60 days, give plan for `durationDays`);
redeeming one sets the user's plan + expiry and links the referral. Promo messages are in **German**.
Influencer JWT carries `role: 'influencer'` (checked by `influencer.middleware.js`).

**Progress**: one doc per (userId, moduleId) with `sections` (answers+submitted), `texts`, `done`, `highlights`.
**Vocabulary**: separate `Vocabulary` collection (`deutsch`, `arabic`, `beispiel`, `viewed`, `isLearned`, `repeatNumber`).
The `vocabularyList` embedded in `User` is legacy and unused.
**Notes**: sticky-note board (`type` text|tick, color, x/y, pinned, order, `links` to other own text notes only);
`content` is rich HTML cleaned by `notes.sanitize.js` allowlist.

## Conventions / gotchas

- **Adding a user-facing message?** Add the exact English string to `EXACT` (or a regex to `PATTERNS`) in
  `src/config/messageCodes.js` — the frontend translates by code. Changing a string's text breaks its code.
- Errors are thrown as plain `Error('message')` in services; the controller decides the status.
- `PUT /users/me` uses an allowlist — never let `plan`, `referredBy`, tokens be writable.
- `/auth/logout` takes `userId` from the body and is not JWT-protected.
- `UserController.getAll/getById` exist but aren't routed.
- With billing gone, `affiliateService.recordPurchase` (commissions) is only reached from the dev-only subscribe path.
- `NODE_ENV=test` turns off rate limiting and logging; integration setup sets secrets and `ALLOW_SELF_SUBSCRIBE=true`.
- Never read/print `.env` (real secrets). Use `.env.example` for the variable list.

## Env vars (see .env.example)

`PORT, MONGO_DB_URL, JWT_SECRET, CORS_ORIGIN, FRONTEND_URL, APP_URL, ADMIN_SECRET, NODE_ENV,
SMTP_HOST/PORT/SECURE/USER/PASS/FROM, ALLOW_SELF_SUBSCRIBE`.

## State as of 2026-10-24

- Branch `main`. Uncommitted work: billing module + Lemon Squeezy config **deleted** (PayPal was removed before),
  `/billing` → 404, notes link support, `/users/me/subscribe` gated.
- Keep this file updated when routes, plans, or flows change.
