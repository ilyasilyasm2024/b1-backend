const fs = require('fs');
const path = require('path');
const { attachMessageCodes, lookup, EXACT } = require('../../src/config/messageCodes');

function run(body) {
  const sent = [];
  const res = { json: (b) => sent.push(b) };
  attachMessageCodes({}, res, () => {});
  res.json(body);
  return sent[0];
}

describe('messageCodes', () => {
  describe('lookup', () => {
    it('maps exact messages to codes', () => {
      expect(lookup('User not found')).toEqual({ code: 'USER_NOT_FOUND' });
      expect(lookup('Please verify your email before logging in')).toEqual({ code: 'EMAIL_NOT_VERIFIED' });
    });

    it('extracts params from dynamic messages', () => {
      expect(lookup('Monatliches Limit erreicht (5 Codes pro Monat)')).toEqual({
        code: 'PROMO_MONTHLY_LIMIT',
        params: { limit: 5 },
      });
      expect(lookup('Gold für 30 Tage aktiviert!')).toEqual({
        code: 'PROMO_ACTIVATED',
        params: { plan: 'Gold', days: 30 },
      });
    });

    it('returns null for unknown or non-string input', () => {
      expect(lookup('nope')).toBeNull();
      expect(lookup(undefined)).toBeNull();
    });
  });

  describe('attachMessageCodes', () => {
    it('adds code next to error and keeps the English text', () => {
      expect(run({ error: 'Invalid credentials' })).toEqual({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    });

    it('adds codes for validation errors, null when unknown', () => {
      expect(run({ errors: ['Password is required', 'other'] })).toEqual({
        errors: ['Password is required', 'other'],
        codes: ['PASSWORD_REQUIRED', null],
      });
    });

    it('adds messageCode for success messages', () => {
      expect(run({ message: 'Logged out successfully', user: 1 })).toEqual({
        message: 'Logged out successfully',
        user: 1,
        messageCode: 'LOGGED_OUT',
      });
    });

    it('does not overwrite an existing code and leaves other bodies untouched', () => {
      expect(run({ error: 'User not found', code: 'X' })).toEqual({ error: 'User not found', code: 'X' });
      expect(run([1, 2])).toEqual([1, 2]);
      expect(run({ error: 'unknown' })).toEqual({ error: 'unknown' });
    });
  });

  it('every mapped message still exists in the source code', () => {
    const src = [];
    const walk = (dir) => {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (p.endsWith('.js') && !p.endsWith('messageCodes.js')) src.push(fs.readFileSync(p, 'utf8'));
      }
    };
    walk(path.join(__dirname, '../../src'));
    const all = src.join('\n');
    const stale = Object.keys(EXACT).filter((m) => !all.includes(m));
    expect(stale).toEqual([]);
  });
});
