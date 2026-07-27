# How to run the load tests (staging on Vercel + free Atlas)

Follow these steps in order. You do NOT touch your production backend or database.

---

## Step 1 — Create a free Atlas cluster (throwaway test DB)

1. Go to https://www.mongodb.com/cloud/atlas and sign in (or make a new account).
2. Create a new **Project** (e.g. "b1-staging").
3. Build a **Cluster** → choose **M0 (Free)**.
4. **Database Access** → Add New Database User → set a username + password (save them).
5. **Network Access** → Add IP Address → `0.0.0.0/0` (allow from anywhere).
   Needed because Vercel IPs change. Fine for a throwaway test DB.
6. **Connect** → Drivers → copy the connection string. It looks like:
   `mongodb+srv://USER:PASS@cluster.xxxxx.mongodb.net/b1test`
   (add `/b1test` before the `?` so it uses a named database).

---

## Step 2 — Deploy a staging backend on Vercel

Pick ONE:

**Option A — second Vercel project (simplest to understand)**
1. Vercel → Add New → Project → import your backend repo again.
2. Name it `b1-backend-staging`.
3. Deploy. You get a URL like `https://b1-backend-staging.vercel.app`.

**Option B — a Git branch preview**
1. `git checkout -b staging && git push -u origin staging`
2. Vercel auto-creates a preview deployment with its own URL.

### Set these Environment Variables on the staging deployment
(Vercel → your staging project → Settings → Environment Variables)

| Variable | Value |
|----------|-------|
| `MONGO_DB_URL` | your new free Atlas string from Step 1 |
| `JWT_SECRET` | any long random string (different from prod) |
| `ADMIN_SECRET` | any string |
| `CORS_ORIGIN` | `*` |
| `FRONTEND_URL` | your staging or frontend URL |
| `NODE_ENV` | `production`  ← important: turns rate limiting ON |

Redeploy after setting them.

### Quick check it's alive
Open `https://<your-staging-url>/` in a browser — you should see
`{"message":"Hello from Express!"}`.

---

## Step 3 — Create the test user (run locally, ONE time)

This creates a verified account in your STAGING database so k6 can log in.

```bash
cd b1-backend
MONGO_DB_URL="<your staging atlas string>" \
LOADTEST_USER=loadtest_user \
LOADTEST_PASS=loadtest_pass_123 \
npm run seed:loadtest
```

You should see "✅ Load-test user ready".

---

## Step 4 — Install k6 (the load-test tool)

- **Linux:**
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update && sudo apt-get install k6
  ```
- **macOS:** `brew install k6`
- **Any OS (Docker):** `docker pull grafana/k6`

Verify: `k6 version`

---

## Step 5 — Run the tests (start small!)

Always set `BASE_URL` to your STAGING url.

**5a. Smoke test first (1 user, 30s — just proves it works):**
```bash
k6 run -e BASE_URL=https://b1-backend-staging.vercel.app load-tests/smoke.js
```

**5b. Load test (realistic sustained traffic):**
```bash
k6 run \
  -e BASE_URL=https://b1-backend-staging.vercel.app \
  -e TEST_USER=loadtest_user \
  -e TEST_PASS=loadtest_pass_123 \
  load-tests/load.js
```

**5c. Spike test (sudden surge — see notes below):**
```bash
k6 run \
  -e BASE_URL=https://b1-backend-staging.vercel.app \
  -e TEST_USER=loadtest_user \
  -e TEST_PASS=loadtest_pass_123 \
  load-tests/spike.js
```

---

## How to read the results

At the end k6 prints a summary. Look at:

- `http_req_duration ... p(95)=...` → 95% of requests were faster than this.
  Green if under 500ms.
- `http_req_failed ... rate=...` → percentage of failed requests. Want < 1%.
- `checks ... rate=...` → how many assertions passed. Want > 99%.
- A ✓ next to a threshold = passed. A ✗ = breached (k6 exits non-zero).

While it runs, keep the **Atlas dashboard** (Metrics tab) and **Vercel dashboard**
(Logs/Usage) open to watch connections and function invocations.

---

## ⚠️ Important: the free M0 tier limits what the spike test can prove

- Smoke + moderate load: **reliable signal** on the free tier.
- Spike test (1500 users): the **free M0 will hit its ~500 connection limit and
  throttled CPU** and show errors. That is the FREE TIER's limit, not your code.
- To truly prove "10k users is fine", upgrade the cluster to **M10** for ~1 hour
  (about $0.10/hr), run the spike test, then **pause the cluster**. Only do this
  when you're close to real traffic.

---

## Cleanup when done

- Delete the load-test data: drop the `b1test` database in Atlas, or delete the
  whole free cluster.
- You can keep the staging Vercel project for future tests (it costs nothing when idle).
