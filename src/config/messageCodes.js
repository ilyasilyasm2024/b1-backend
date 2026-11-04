// Stable codes for API messages so clients can show them in the user's language.
// The English text stays in `error` / `message` for backward compatibility;
// the matching code is added as `code` / `messageCode` (see attachMessageCodes).

const EXACT = {
  // Generic
  'Something went wrong': 'SERVER_ERROR',
  'Database connection failed': 'DATABASE_UNAVAILABLE',
  'Payload too large': 'PAYLOAD_TOO_LARGE',
  'Invalid JSON body': 'INVALID_JSON',
  'Not found': 'NOT_FOUND',
  'Too many requests, please try again later': 'TOO_MANY_REQUESTS',
  'Access denied. No token provided.': 'NO_TOKEN',
  'Invalid or expired token': 'TOKEN_INVALID',
  'userId is required': 'USER_ID_REQUIRED',
  'User not found': 'USER_NOT_FOUND',
  'Account is inactive': 'ACCOUNT_INACTIVE',

  // Auth
  'Invalid credentials': 'INVALID_CREDENTIALS',
  'Too many login attempts, please try again later': 'TOO_MANY_LOGIN_ATTEMPTS',
  'Please verify your email before logging in': 'EMAIL_NOT_VERIFIED',
  'Email already exists': 'EMAIL_TAKEN',
  'Username already exists': 'USERNAME_TAKEN',
  'Email is required': 'EMAIL_REQUIRED',
  'Email is already verified': 'EMAIL_ALREADY_VERIFIED',
  'No account found with this email address': 'EMAIL_NOT_FOUND',
  'Verification token is required': 'VERIFICATION_TOKEN_REQUIRED',
  'Invalid verification token': 'VERIFICATION_TOKEN_INVALID',
  'Verification token has expired': 'VERIFICATION_TOKEN_EXPIRED',
  'Token and new password are required': 'RESET_FIELDS_REQUIRED',
  'Invalid or expired reset token': 'RESET_TOKEN_INVALID',
  'Reset token has expired. Please request a new one.': 'RESET_TOKEN_EXPIRED',
  'Password must be at least 6 characters': 'PASSWORD_TOO_SHORT',
  'Password must be at most 128 characters': 'PASSWORD_TOO_LONG',
  'Password is required': 'PASSWORD_REQUIRED',
  'Username must only contain letters and numbers': 'USERNAME_INVALID_CHARS',
  'Username must be at least 3 characters': 'USERNAME_TOO_SHORT',
  'Username must be at most 30 characters': 'USERNAME_TOO_LONG',
  'Username is required': 'USERNAME_REQUIRED',
  'Please provide a valid email address': 'EMAIL_INVALID',
  'First name must be at least 2 characters': 'FIRST_NAME_TOO_SHORT',
  'First name must be at most 50 characters': 'FIRST_NAME_TOO_LONG',
  'First name is required': 'FIRST_NAME_REQUIRED',
  'Last name must be at least 2 characters': 'LAST_NAME_TOO_SHORT',
  'Last name must be at most 50 characters': 'LAST_NAME_TOO_LONG',
  'Last name is required': 'LAST_NAME_REQUIRED',
  'Email or username must be at least 3 characters': 'IDENTIFIER_TOO_SHORT',
  'Email or username is required': 'IDENTIFIER_REQUIRED',
  'Referral code must only contain letters and numbers': 'REFERRAL_CODE_INVALID',
  'This referral code is already in use': 'REFERRAL_CODE_TAKEN',

  // Plans / promo codes
  'Plan is required': 'PLAN_REQUIRED',
  'Invalid plan': 'INVALID_PLAN',
  'A subscription request is already being processed': 'SUBSCRIPTION_IN_PROGRESS',
  'Code is required': 'CODE_REQUIRED',
  'Ungültiger Promo-Code': 'PROMO_INVALID',
  'Dieser Code wurde bereits verwendet': 'PROMO_ALREADY_USED',
  'Dieser Code ist abgelaufen': 'PROMO_EXPIRED',
  'Code konnte nicht eingelöst werden': 'PROMO_REDEEM_FAILED',

  // Notes, vocabulary, Schreiben, Sprechen
  'Note not found': 'NOTE_NOT_FOUND',
  'Vocabulary not found': 'VOCABULARY_NOT_FOUND',
  'Version not found': 'VERSION_NOT_FOUND',
  'Recording not found': 'RECORDING_NOT_FOUND',
  'Recording must be 5 minutes or less': 'RECORDING_TOO_LONG',
  'Text must have at least 20 words': 'TEXT_TOO_FEW_WORDS',
  'Text must have at most 300 words': 'TEXT_TOO_MANY_WORDS',
  'Text must be at most 1000 characters': 'TEXT_TOO_LONG',
  'moduleId, aufgabeId, and text are required': 'TEXT_FIELDS_REQUIRED',
  'moduleId, teil, audioUrl, and publicId are required': 'RECORDING_FIELDS_REQUIRED',
  'Maximum 5 versions per task. Delete an old version to save a new one.': 'MAX_VERSIONS',
  'Maximum 5 recordings per part. Delete an old one to save a new one.': 'MAX_RECORDINGS',
  'Maximum 20 text notes. Delete an old note to add a new one.': 'MAX_TEXT_NOTES',
  'Maximum 10 color notes. Delete an old note to add a new one.': 'MAX_COLOR_NOTES',
  'Title must be at most 200 characters': 'TITLE_TOO_LONG',
  'Content must be at most 5000 characters': 'CONTENT_TOO_LONG',
  'Deutsch field is required': 'VOCAB_GERMAN_REQUIRED',
  'Deutsch field must be at most 150 characters': 'VOCAB_GERMAN_TOO_LONG',
  'Arabic field is required': 'VOCAB_ARABIC_REQUIRED',
  'Arabic field must be at most 150 characters': 'VOCAB_ARABIC_TOO_LONG',
  'Beispiel field must be at most 150 characters': 'VOCAB_EXAMPLE_TOO_LONG',

  // Admin / affiliate
  'Admin access denied': 'ADMIN_DENIED',
  'ADMIN_SECRET is not configured on the server': 'ADMIN_NOT_CONFIGURED',
  'Influencer not found': 'INFLUENCER_NOT_FOUND',
  'An influencer with this email already exists': 'INFLUENCER_EXISTS',
  'Not an influencer account': 'NOT_INFLUENCER',

  // Success messages
  'Account created. Please check your email to verify your account.': 'ACCOUNT_CREATED',
  'Email verified successfully. You can now log in.': 'EMAIL_VERIFIED',
  'Verification email resent. Please check your inbox.': 'VERIFICATION_RESENT',
  'Password reset email sent. Please check your inbox.': 'RESET_EMAIL_SENT',
  'Password reset successfully. You can now log in with your new password.': 'PASSWORD_RESET_SUCCESS',
  'Logged out successfully': 'LOGGED_OUT',
  'Progress saved': 'PROGRESS_SAVED',
  'Tour completed': 'TOUR_COMPLETED',
  'Note deleted': 'NOTE_DELETED',
  'Vocabulary deleted': 'VOCABULARY_DELETED',
  'Version deleted': 'VERSION_DELETED',
  'Recording deleted': 'RECORDING_DELETED',
  'User deleted': 'USER_DELETED',
};

// Messages with values in them: the captured values are returned as params.
const PATTERNS = [
  { re: /^Monatliches Limit erreicht \((\d+) Codes pro Monat\)$/, code: 'PROMO_MONTHLY_LIMIT', params: (m) => ({ limit: Number(m[1]) }) },
  { re: /^(\w+) für (\d+) Tage aktiviert!$/, code: 'PROMO_ACTIVATED', params: (m) => ({ plan: m[1], days: Number(m[2]) }) },
];

function lookup(text) {
  if (typeof text !== 'string') return null;
  if (EXACT[text]) return { code: EXACT[text] };
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m) return { code: p.code, params: p.params(m) };
  }
  return null;
}

// Express middleware: adds `code`, `codes` and `messageCode` next to the English texts in JSON responses.
function attachMessageCodes(req, res, next) {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (typeof body.error === 'string' && !body.code) {
        const hit = lookup(body.error);
        if (hit) body = { ...body, code: hit.code, ...(hit.params && { params: hit.params }) };
      }
      if (Array.isArray(body.errors) && !body.codes) {
        body = { ...body, codes: body.errors.map((e) => lookup(e)?.code || null) };
      }
      if (typeof body.message === 'string' && !body.messageCode) {
        const hit = lookup(body.message);
        if (hit) body = { ...body, messageCode: hit.code, ...(hit.params && { messageParams: hit.params }) };
      }
    }
    return json(body);
  };
  next();
}

module.exports = { attachMessageCodes, lookup, EXACT };
