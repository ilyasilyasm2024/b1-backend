// SPIKE TEST — a sudden massive surge of concurrent users, then back to normal.
// Reveals memory leaks, CPU bottlenecks, connection-pool exhaustion, and whether
// the system RECOVERS after the spike (recovery is as important as surviving it).
// Run: k6 run -e BASE_URL=https://staging... load-tests/spike.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, TEST_USER, thresholds } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 },    // warm baseline
    { duration: '20s', target: 1500 },  // SUDDEN SPIKE — 1500 users almost instantly
    { duration: '1m', target: 1500 },   // hold the surge
    { duration: '20s', target: 20 },    // drop back to baseline
    { duration: '2m', target: 20 },     // recovery window — must return to healthy SLOs
  ],
  thresholds: {
    // During a spike some slowdown is acceptable, so thresholds are looser than
    // the load test but still guard against total collapse.
    http_req_failed: ['rate<0.05'],       // allow up to 5% errors during the surge
    http_req_duration: ['p(95)<2000'],    // p95 under 2s even at peak
    ...thresholds,
    // Note: the shared thresholds are stricter; k6 evaluates all of them.
  },
};

export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ identifier: TEST_USER.identifier, password: TEST_USER.password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return { token: res.json('token') };
}

export default function (data) {
  // Mix of public and authenticated reads to stress both paths.
  const publicRes = http.get(`${BASE_URL}/`);
  check(publicRes, { 'public survives spike': (r) => r.status === 200 || r.status === 429 });

  if (data.token) {
    const authRes = http.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    // 429 (rate-limited) is an ACCEPTABLE response under a spike — it means the
    // protection is working, not that the server crashed.
    check(authRes, { 'auth survives spike': (r) => [200, 429, 503].includes(r.status) });
  }

  sleep(0.5);
}
