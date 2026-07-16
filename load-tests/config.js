// Shared config for all k6 scenarios.
// Override the target with:  k6 run -e BASE_URL=https://staging.example.com script.js
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// A pre-seeded, verified test account on the target environment.
// NEVER use real production credentials here.
export const TEST_USER = {
  identifier: __ENV.TEST_USER || 'loadtest_user',
  password: __ENV.TEST_PASS || 'loadtest_pass_123',
};

// Shared pass/fail thresholds (SLOs). A run "fails" if these are breached,
// which is what makes k6 usable as a CI gate.
export const thresholds = {
  // 99% of requests must complete under 800ms; 95% under 500ms.
  http_req_duration: ['p(95)<500', 'p(99)<800'],
  // Less than 1% of requests may fail.
  http_req_failed: ['rate<0.01'],
  // Custom check success rate must stay above 99%.
  checks: ['rate>0.99'],
};
