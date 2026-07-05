const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../../config/mailer');

class AuthService {
  async signup({ username, email, firstName, lastName, password }) {
    const existingUser = await authRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const existingEmail = await authRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already exists');
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
    });

    await sendVerificationEmail(email, verificationToken);

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
    await sendVerificationEmail(email, verificationToken);

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

    return { user: this._sanitize(user), token };
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
    await sendResetPasswordEmail(email, resetToken);

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

  _sanitize(user) {
    const obj = user.toObject();
    delete obj.password;
    delete obj.verificationToken;
    delete obj.verificationTokenExpires;
    return obj;
  }
}

module.exports = new AuthService();
