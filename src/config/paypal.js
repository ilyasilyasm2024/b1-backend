// PayPal configuration.
// Uses the PayPal Orders v2 REST API for hosted checkout.
// Secrets are read from environment variables.
//
// Required env vars:
//   PAYPAL_CLIENT_ID     – from developer.paypal.com → your app
//   PAYPAL_SECRET        – from developer.paypal.com → your app
//   PAYPAL_MODE          – "sandbox" or "live"

function getBaseUrl() {
  const mode = process.env.PAYPAL_MODE || 'sandbox';
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function isConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
}

// Get an OAuth2 access token from PayPal (cached per request, short-lived).
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const base = getBaseUrl();
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString('base64');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('PayPal token error:', res.status, text);
    throw new Error('Failed to get PayPal access token');
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Expire 60s early to avoid edge cases
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

module.exports = {
  getBaseUrl,
  isConfigured,
  getAccessToken,
};
