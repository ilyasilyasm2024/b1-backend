jest.mock('../../src/modules/auth/auth.repository');
jest.mock('../../src/modules/affiliate/affiliate.service');
jest.mock('../../src/config/mailer');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('../../src/modules/auth/auth.repository');
const affiliateService = require('../../src/modules/affiliate/affiliate.service');
const mailer = require('../../src/config/mailer');
const authService = require('../../src/modules/auth/auth.service');

beforeAll(() => { process.env.JWT_SECRET = 'test-secret'; });

describe('AuthService.signup', () => {
  beforeEach(() => {
    mailer.sendVerificationEmail.mockResolvedValue();
    bcrypt.hash.mockResolvedValue('hashed');
    authRepository.create.mockResolvedValue({ _id: 'u1', username: 'ilyas', email: 'a@b.com' });
  });

  it('throws when the username already exists', async () => {
    authRepository.findByUsername.mockResolvedValue({ _id: 'x' });
    await expect(authService.signup({ username: 'ilyas', email: 'a@b.com', password: 'p' }))
      .rejects.toThrow('Username already exists');
  });

  it('throws when the email already exists', async () => {
    authRepository.findByUsername.mockResolvedValue(null);
    authRepository.findByEmail.mockResolvedValue({ _id: 'x' });
    await expect(authService.signup({ username: 'ilyas', email: 'a@b.com', password: 'p' }))
      .rejects.toThrow('Email already exists');
  });

  it('creates a user and returns a success message', async () => {
    authRepository.findByUsername.mockResolvedValue(null);
    authRepository.findByEmail.mockResolvedValue(null);

    const result = await authService.signup({
      username: 'ilyas', email: 'a@b.com', firstName: 'I', lastName: 'Q', password: 'p',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('p', 10);
    expect(authRepository.create).toHaveBeenCalled();
    expect(result.message).toMatch(/check your email/i);
  });

  it('validates and attaches a valid referral code', async () => {
    authRepository.findByUsername.mockResolvedValue(null);
    authRepository.findByEmail.mockResolvedValue(null);
    affiliateService.validateCode.mockResolvedValue({ valid: true, referralCode: 'ILYAS20' });
    affiliateService.attachReferral.mockResolvedValue({});

    await authService.signup({
      username: 'ilyas', email: 'a@b.com', firstName: 'I', lastName: 'Q', password: 'p', referralCode: 'ILYAS20',
    });

    expect(affiliateService.validateCode).toHaveBeenCalledWith('ILYAS20');
    expect(affiliateService.attachReferral).toHaveBeenCalledWith(expect.objectContaining({ code: 'ILYAS20', userId: 'u1' }));
  });

  it('ignores an invalid referral code without failing signup', async () => {
    authRepository.findByUsername.mockResolvedValue(null);
    authRepository.findByEmail.mockResolvedValue(null);
    affiliateService.validateCode.mockResolvedValue({ valid: false });

    const result = await authService.signup({
      username: 'ilyas', email: 'a@b.com', firstName: 'I', lastName: 'Q', password: 'p', referralCode: 'BAD',
    });

    expect(affiliateService.attachReferral).not.toHaveBeenCalled();
    expect(result.message).toBeDefined();
  });

  it('does not fail signup when the verification email throws', async () => {
    authRepository.findByUsername.mockResolvedValue(null);
    authRepository.findByEmail.mockResolvedValue(null);
    mailer.sendVerificationEmail.mockRejectedValue(new Error('smtp down'));

    const result = await authService.signup({
      username: 'ilyas', email: 'a@b.com', firstName: 'I', lastName: 'Q', password: 'p',
    });

    expect(result.message).toBeDefined();
  });
});

describe('AuthService.verifyEmail', () => {
  it('throws on an unknown token', async () => {
    authRepository.findByVerificationToken.mockResolvedValue(null);
    await expect(authService.verifyEmail('x')).rejects.toThrow('Invalid verification token');
  });

  it('throws on an expired token', async () => {
    authRepository.findByVerificationToken.mockResolvedValue({
      _id: 'u1', verificationTokenExpires: new Date(Date.now() - 1000),
    });
    await expect(authService.verifyEmail('x')).rejects.toThrow('expired');
  });

  it('verifies the user on a valid token', async () => {
    authRepository.findByVerificationToken.mockResolvedValue({
      _id: 'u1', verificationTokenExpires: new Date(Date.now() + 100000),
    });
    authRepository.verifyUser.mockResolvedValue({});
    const result = await authService.verifyEmail('x');
    expect(authRepository.verifyUser).toHaveBeenCalledWith('u1');
    expect(result.message).toMatch(/verified/i);
  });
});

describe('AuthService.login', () => {
  const baseUser = {
    _id: 'u1', username: 'ilyas', password: 'hashed', isVerified: true,
    streak: 3, lastLoginDate: '', toObject() { return { ...this }; },
  };

  beforeEach(() => {
    jwt.sign.mockReturnValue('signed.token');
    authRepository.updateToken.mockResolvedValue({});
    authRepository.updateStreak.mockResolvedValue({});
  });

  it('throws on unknown user', async () => {
    authRepository.findByUsernameOrEmail.mockResolvedValue(null);
    await expect(authService.login({ identifier: 'x', password: 'p' })).rejects.toThrow('Invalid credentials');
  });

  it('throws when the email is not verified', async () => {
    authRepository.findByUsernameOrEmail.mockResolvedValue({ ...baseUser, isVerified: false });
    await expect(authService.login({ identifier: 'x', password: 'p' })).rejects.toThrow('verify your email');
  });

  it('throws when the password does not match', async () => {
    authRepository.findByUsernameOrEmail.mockResolvedValue({ ...baseUser });
    bcrypt.compare.mockResolvedValue(false);
    await expect(authService.login({ identifier: 'x', password: 'p' })).rejects.toThrow('Invalid credentials');
  });

  it('returns a token and sanitized user on success', async () => {
    authRepository.findByUsernameOrEmail.mockResolvedValue({ ...baseUser });
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login({ identifier: 'ilyas', password: 'p' });

    expect(result.token).toBe('signed.token');
    expect(result.user.password).toBeUndefined();
    expect(authRepository.updateToken).toHaveBeenCalledWith('u1', 'signed.token');
  });

  it('increments the streak on a consecutive-day login', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    authRepository.findByUsernameOrEmail.mockResolvedValue({ ...baseUser, streak: 4, lastLoginDate: yesterday });
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login({ identifier: 'ilyas', password: 'p' });

    expect(result.user.streak).toBe(5);
  });

  it('keeps the streak when logging in again the same day', async () => {
    const today = new Date().toISOString().slice(0, 10);
    authRepository.findByUsernameOrEmail.mockResolvedValue({ ...baseUser, streak: 7, lastLoginDate: today });
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login({ identifier: 'ilyas', password: 'p' });

    expect(result.user.streak).toBe(7);
  });

  it('resets the streak to 1 after a gap', async () => {
    authRepository.findByUsernameOrEmail.mockResolvedValue({ ...baseUser, streak: 9, lastLoginDate: '2000-01-01' });
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login({ identifier: 'ilyas', password: 'p' });

    expect(result.user.streak).toBe(1);
  });
});

describe('AuthService.forgotPassword / resetPassword', () => {
  beforeEach(() => { mailer.sendResetPasswordEmail.mockResolvedValue(); });

  it('throws when no account matches the email', async () => {
    authRepository.findByEmail.mockResolvedValue(null);
    await expect(authService.forgotPassword('a@b.com')).rejects.toThrow('No account found');
  });

  it('sends a reset email for a known account', async () => {
    authRepository.findByEmail.mockResolvedValue({ _id: 'u1' });
    authRepository.updateResetToken.mockResolvedValue({});
    const result = await authService.forgotPassword('a@b.com');
    expect(mailer.sendResetPasswordEmail).toHaveBeenCalled();
    expect(result.message).toMatch(/reset email sent/i);
  });

  it('rejects an invalid reset token', async () => {
    authRepository.findByResetToken.mockResolvedValue(null);
    await expect(authService.resetPassword('t', 'newpass')).rejects.toThrow('Invalid or expired');
  });

  it('rejects an expired reset token', async () => {
    authRepository.findByResetToken.mockResolvedValue({ _id: 'u1', resetPasswordExpires: new Date(Date.now() - 1000) });
    await expect(authService.resetPassword('t', 'newpass')).rejects.toThrow('expired');
  });

  it('resets the password on a valid token', async () => {
    authRepository.findByResetToken.mockResolvedValue({ _id: 'u1', resetPasswordExpires: new Date(Date.now() + 100000) });
    bcrypt.hash.mockResolvedValue('newhashed');
    authRepository.updatePassword.mockResolvedValue({});
    const result = await authService.resetPassword('t', 'newpass');
    expect(authRepository.updatePassword).toHaveBeenCalledWith('u1', 'newhashed');
    expect(result.message).toMatch(/reset successfully/i);
  });
});
