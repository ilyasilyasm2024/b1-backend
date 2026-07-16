const { signupSchema, loginSchema } = require('../../src/modules/auth/auth.validation');

const validSignup = {
  username: 'ilyas99',
  email: 'ilyas@example.com',
  firstName: 'Ilyas',
  lastName: 'Qabbal',
  password: 'secret123',
};

describe('signupSchema', () => {
  it('accepts a fully valid payload', () => {
    const { error } = signupSchema.validate(validSignup);
    expect(error).toBeUndefined();
  });

  it('accepts an optional uppercase referral code', () => {
    const { error, value } = signupSchema.validate({ ...validSignup, referralCode: 'ilyas20' });
    expect(error).toBeUndefined();
    expect(value.referralCode).toBe('ILYAS20');
  });

  it('accepts an empty referral code', () => {
    const { error } = signupSchema.validate({ ...validSignup, referralCode: '' });
    expect(error).toBeUndefined();
  });

  it('rejects a non-alphanumeric username', () => {
    const { error } = signupSchema.validate({ ...validSignup, username: 'ily as!' });
    expect(error).toBeDefined();
  });

  it('rejects a too-short username', () => {
    const { error } = signupSchema.validate({ ...validSignup, username: 'ab' });
    expect(error.message).toMatch(/at least 3/);
  });

  it('rejects a too-long username', () => {
    const { error } = signupSchema.validate({ ...validSignup, username: 'a'.repeat(31) });
    expect(error.message).toMatch(/at most 30/);
  });

  it('rejects an invalid email', () => {
    const { error } = signupSchema.validate({ ...validSignup, email: 'not-an-email' });
    expect(error.message).toMatch(/valid email/);
  });

  it('rejects a short password', () => {
    const { error } = signupSchema.validate({ ...validSignup, password: '123' });
    expect(error.message).toMatch(/at least 6/);
  });

  it('rejects a password over 128 chars', () => {
    const { error } = signupSchema.validate({ ...validSignup, password: 'a'.repeat(129) });
    expect(error.message).toMatch(/at most 128/);
  });

  it.each(['username', 'email', 'firstName', 'lastName', 'password'])(
    'rejects when required field %s is missing',
    (field) => {
      const payload = { ...validSignup };
      delete payload[field];
      const { error } = signupSchema.validate(payload);
      expect(error).toBeDefined();
    }
  );

  it('rejects short firstName/lastName', () => {
    expect(signupSchema.validate({ ...validSignup, firstName: 'I' }).error).toBeDefined();
    expect(signupSchema.validate({ ...validSignup, lastName: 'Q' }).error).toBeDefined();
  });
});

describe('loginSchema', () => {
  it('accepts a valid identifier + password', () => {
    const { error } = loginSchema.validate({ identifier: 'ilyas99', password: 'secret123' });
    expect(error).toBeUndefined();
  });

  it('accepts an email as identifier', () => {
    const { error } = loginSchema.validate({ identifier: 'a@b.com', password: 'x' });
    expect(error).toBeUndefined();
  });

  it('rejects a missing identifier', () => {
    const { error } = loginSchema.validate({ password: 'x' });
    expect(error.message).toMatch(/required/);
  });

  it('rejects a missing password', () => {
    const { error } = loginSchema.validate({ identifier: 'ilyas99' });
    expect(error.message).toMatch(/Password is required/);
  });

  it('rejects a too-short identifier', () => {
    const { error } = loginSchema.validate({ identifier: 'ab', password: 'x' });
    expect(error.message).toMatch(/at least 3/);
  });
});
