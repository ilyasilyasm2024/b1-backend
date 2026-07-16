// LOAD TEST — sustained, realistic traffic to confirm the system holds its SLOs
// under the kind of concurrency you expect day-to-day (5k–10k users).
// Run: k6 run -e BASE_URL=https://staging... -e TEST_USER=... -e TEST_PASS=... load-tests/load.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, TEST_USER, thresholds } from './config.js';

// Custom metric: how long the authenticated read path takes.
const authReadTrend = new Trend('auth_read_duration', true);

export const options = {
  // Ramp up to a sustained plateau, then ramp down. This models a busy period.
  stages: [
    { duration: '1m', target: 50 },   // ramp to 50 concurrent users
    { duration: '3m', target: 200 },  // ramp to 200 and hold
    { duration: '5m', target: 200 },  // sustained plateau (the real test)
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds,
};

// Log in ONCE per virtual user and reuse the token (realistic session behavior).
export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ identifier: TEST_USER.identifier, password: TEST_USER.password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const token = res.json('token');
  if (!token) throw new Error(`Login failed in setup: ${res.status} ${res.body}`);
  return { token };
}

export default function (data) {
  const authHeaders = {
    headers: { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json' },
  };

  group('read own profile', () => {
    const res = http.get(`${BASE_URL}/users/me`, authHeaders);
    authReadTrend.add(res.timings.duration);
    check(res, { 'profile 200': (r) => r.status === 200 });
  });

  group('read plan (cache-friendly)', () => {
    const res = http.get(`${BASE_URL}/users/me/plan`, authHeaders);
    check(res, { 'plan 200': (r) => r.status === 200 });
  });

  group('list notes (indexed query)', () => {
    const res = http.get(`${BASE_URL}/notes`, authHeaders);
    check(res, { 'notes 200': (r) => r.status === 200 });
  });

  // Think-time between actions so we model humans, not a tight loop.
  sleep(Math.random() * 2 + 1);
}
