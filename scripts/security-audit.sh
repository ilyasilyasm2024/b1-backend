#!/usr/bin/env bash
# Pre-deployment security audit for the b1-backend.
# Runs dependency, secret, and config checks. Exits non-zero on hard failures
# so it can be used as a CI gate.
#
# Usage:  bash scripts/security-audit.sh
set -uo pipefail

FAIL=0
section() { printf "\n\033[1;34m== %s ==\033[0m\n" "$1"; }
ok()      { printf "  \033[0;32m✓ %s\033[0m\n" "$1"; }
warn()    { printf "  \033[0;33m! %s\033[0m\n" "$1"; }
bad()     { printf "  \033[0;31m✗ %s\033[0m\n" "$1"; FAIL=1; }

section "1. Dependency vulnerability audit (npm audit)"
# Fail the build only on HIGH/CRITICAL vulnerabilities; log the rest.
if npm audit --omit=dev --audit-level=high; then
  ok "No high/critical vulnerabilities in production dependencies"
else
  bad "High/critical vulnerabilities found — run 'npm audit fix' or update deps"
fi

section "2. Outdated packages (informational)"
npm outdated || true

section "3. Secret / .env leak check"
# Ensure .env is gitignored and not tracked.
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  bad ".env is tracked by git! Remove it: git rm --cached .env"
else
  ok ".env is not tracked by git"
fi
# Scan the source tree for obvious hardcoded secrets (not in node_modules/tests).
if grep -rnE "(mongodb\+srv://[^ ]+:[^ ]+@|sk_live_|AKIA[0-9A-Z]{16})" src 2>/dev/null; then
  bad "Possible hardcoded secret found in src/"
else
  ok "No obvious hardcoded secrets in src/"
fi

section "4. Required env vars present"
for var in JWT_SECRET MONGO_DB_URL ADMIN_SECRET CORS_ORIGIN; do
  if grep -q "^${var}=" .env 2>/dev/null; then
    ok "${var} is set"
  else
    warn "${var} is not set in .env (must exist in the deploy environment)"
  fi
done

section "5. CORS configuration check"
# The app must NOT use a wildcard origin in production.
if grep -q "CORS_ORIGIN=\*" .env 2>/dev/null; then
  bad "CORS_ORIGIN is '*' — set explicit allowed origins for production"
else
  ok "CORS_ORIGIN is not a wildcard"
fi

section "6. Security middleware sanity (static check)"
grep -q "helmet()" src/app.js && ok "helmet() security headers enabled" || bad "helmet() missing in app.js"
grep -q "express.json({ limit" src/app.js && ok "JSON body size limit set" || bad "No body size limit in app.js"
grep -q "sanitizeMongo" src/app.js && ok "NoSQL-injection sanitization present" || bad "Mongo sanitization missing"
grep -q "rateLimit" src/app.js && ok "Rate limiting configured" || bad "Rate limiting missing"

section "7. Test suite must pass"
if npm test --silent >/dev/null 2>&1; then
  ok "All tests pass"
else
  bad "Tests are failing — do not deploy"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  printf "\033[1;32mSECURITY AUDIT PASSED — safe to deploy.\033[0m\n"
  exit 0
else
  printf "\033[1;31mSECURITY AUDIT FAILED — fix the issues above before deploying.\033[0m\n"
  exit 1
fi
