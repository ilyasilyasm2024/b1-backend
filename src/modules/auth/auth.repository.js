const User = require('../user/user.model');

class AuthRepository {
  async findByUsername(username) {
    return User.findOne({ username });
  }

  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findByUsernameOrEmail(identifier) {
    return User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select('+password');
  }

  async findByVerificationToken(token) {
    return User.findOne({ verificationToken: token });
  }

  async create(userData) {
    return User.create(userData);
  }

  async verifyUser(userId) {
    return User.findByIdAndUpdate(userId, {
      isVerified: true,
      verificationToken: '',
      verificationTokenExpires: null,
    }, { new: true });
  }

  async updateVerificationToken(userId, token, expires) {
    return User.findByIdAndUpdate(userId, {
      verificationToken: token,
      verificationTokenExpires: expires,
    }, { new: true });
  }

  async updateToken(userId, token) {
    return User.findByIdAndUpdate(userId, { token, isConnected: true }, { new: true });
  }

  async disconnect(userId) {
    return User.findByIdAndUpdate(userId, { token: '', isConnected: false }, { new: true });
  }

  async findByResetToken(token) {
    return User.findOne({ resetPasswordToken: token }).select('+password');
  }

  async updateResetToken(userId, token, expires) {
    return User.findByIdAndUpdate(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    }, { new: true });
  }

  async updatePassword(userId, hashedPassword) {
    return User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      resetPasswordToken: '',
      resetPasswordExpires: null,
    }, { new: true });
  }
}

module.exports = new AuthRepository();
