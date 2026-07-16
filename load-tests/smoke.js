// SMOKE TEST — minimal load to verify the system works at all before heavier runs.
// Run: k6 run load-tests/smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, thresholds } from './config.js';

export const options = {
  vus: 1,             // a single virtual user
  duration: '30s',    // for a short period
  thresholds,
};

export default function () {
  // Public health check — cheapest possible sanity signal.
  const root = http.get(`${BASE_URL}/`);
  check(root, {
    'root returns 200': (r) => r.status === 200,
    'root has JSON body': (r) => r.headers['Content-Type']?.includes('application/json'),
  });

  // Public referral-code validation (read path, no auth).
  const validate = http.get(`${BASE_URL}/affiliate/validate/NONEXISTENT`);
  check(validate, {
    'validate returns 200': (r) => r.status === 200,
    'validate says invalid': (r) => r.json('valid') === false,
  });

  sleep(1);
}
