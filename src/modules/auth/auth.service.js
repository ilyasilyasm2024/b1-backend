const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const affiliateService = require('../affiliate/affiliate.service');
const { sendVerificationEmail, sendResetPasswordEmail, checkEmailDomain } = require('../../config/mailer');

class AuthService {
  async signup({ username, email, firstName, lastName, password, referralCode }) {
    // An unverified account can be replaced by its owner (same username and password),
    // e.g. after signing up with a mistyped email that never received the link.
    let replacedUserId = null;
    const existingUser = await authRepository.findByUsername(username);
    if (existingUser) {
      const withPassword = !existingUser.isVerified && existingUser.email !== email
        ? await authRepository.findByUsernameOrEmail(username)
        : null;
      const sameOwner = withPassword && withPassword.password
        && (await bcrypt.compare(password, withPassword.password));
      if (!sameOwner) {
        throw new Error('Username already exists');
      }
      replacedUserId = existingUser._id;
    }

    const existingEmail = await authRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // Reject addresses whose domain cannot receive mail (typos like "gmial.com").
    if ((await checkEmailDomain(email)) === false) {
      throw new Error('This email domain does not exist');
    }

    // If a referral code was provided, validate it before storing.
    let validReferralCode = '';
    if (referralCode) {
      const check = await affiliateService.validateCode(referralCode);
      if (check.valid) validReferralCode = check.referralCode;
    }

    if (replacedUserId) {
      await authRepository.deleteById(replacedUserId);
      try {
        await affiliateService.detachReferral(replacedUserId);
      } catch (e) {
        console.error('Referral detach failed:', e.message);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await authRepository.create({
      username,
      email,
      firstName,
      lastName,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
      plan: 'beta',
      subscriptionExpiresAt: null,
      referredBy: validReferralCode,
    });

    // Send the verification email before answering, so the user only sees
    // "email sent" when the mail server actually accepted it. If sending fails,
    // remove the account so the user can sign up again with the right address.
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (e) {
      console.error('Verification email failed:', e.message);
      try {
        await authRepository.deleteById(user._id);
      } catch (delErr) {
        console.error('Cleanup after failed verification email failed:', delErr.message);
      }
      throw new Error('Could not send the verification email. Please check your email address.');
    }

    // Link this user to the influencer for referral tracking.
    if (validReferralCode) {
      try {
        await affiliateService.attachReferral({
          code: validReferralCode,
          userId: user._id,
          username: user.username,
          userEmail: user.email,
        });
      } catch (e) {
        // Don't fail signup if referral attachment fails
        console.error('Referral attach failed:', e.message);
      }
    }

    return { message: 'Account created. Please check your email to verify your account.' };
  }

  async verifyEmail(token) {
    const user = await authRepository.findByVerificationToken(token);

    if (!user) {
      throw new Error('Invalid verification token');
    }

    if (user.verificationTokenExpires < new Date()) {
      throw new Error('Verification token has expired');
    }

    await authRepository.verifyUser(user._id);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(email) {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isVerified) {
      throw new Error('Email is already verified');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await authRepository.updateVerificationToken(user._id, verificationToken, verificationTokenExpires);
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (e) {
      console.error('Verification email failed:', e.message);
      throw new Error('Could not send the verification email. Please check your email address.');
    }

    return { message: 'Verification email resent. Please check your inbox.' };
  }

  async login({ identifier, password }) {
    const user = await authRepository.findByUsernameOrEmail(identifier);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new Error('Please verify your email before logging in');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = this._generateToken(user);
    await authRepository.updateToken(user._id, token);

    // Update streak
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let newStreak = 1;
    if (user.lastLoginDate === today) {
      newStreak = user.streak || 1; // Same day, keep streak
    } else if (user.lastLoginDate === yesterday) {
      newStreak = (user.streak || 0) + 1; // Consecutive day
    }
    await authRepository.updateStreak(user._id, newStreak, today);

    return { user: this._sanitize(user, newStreak), token };
  }

  async logout(userId) {
    await authRepository.disconnect(userId);
  }

  async forgotPassword(email) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw new Error('No account found with this email address');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await authRepository.updateResetToken(user._id, resetToken, resetExpires);
    try {
      await sendResetPasswordEmail(email, resetToken);
    } catch (e) {
      console.error('Reset password email failed:', e.message);
      throw new Error('Could not send the password reset email. Please try again later.');
    }

    return { message: 'Password reset email sent. Please check your inbox.' };
  }

  async resetPassword(token, newPassword) {
    const user = await authRepository.findByResetToken(token);

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    if (user.resetPasswordExpires < new Date()) {
      throw new Error('Reset token has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await authRepository.updatePassword(user._id, hashedPassword);

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  _generateToken(user) {
    return jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  _sanitize(user, streak) {
    const obj = user.toObject();
    delete obj.password;
    delete obj.verificationToken;
    delete obj.verificationTokenExpires;
    if (streak !== undefined) obj.streak = streak;
    return obj;
  }
}

module.exports = new AuthService();
