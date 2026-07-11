const userRepository = require('./user.repository');

class UserService {
  async getAllUsers() {
    return userRepository.findAll();
  }

  async getUserById(id) {
    return userRepository.findById(id);
  }

  async updateUser(id, updateData) {
    // Prevent updating sensitive fields through this route
    delete updateData.password;
    delete updateData.email;
    delete updateData.isVerified;
    delete updateData.verificationToken;
    delete updateData.verificationTokenExpires;
    delete updateData.token;
    delete updateData.plan;
    delete updateData.subscriptionExpiresAt;
    return userRepository.update(id, updateData);
  }

  async deleteUser(id) {
    return userRepository.delete(id);
  }
}

module.exports = new UserService();
