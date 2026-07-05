const User = require('./user.model');

class UserRepository {
  async create(userData) {
    return User.create(userData);
  }

  async findAll() {
    return User.find();
  }

  async findById(id) {
    return User.findById(id);
  }

  async findByUsername(username) {
    return User.findOne({ username });
  }

  async update(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, { new: true });
  }

  async delete(id) {
    return User.findByIdAndDelete(id);
  }
}

module.exports = new UserRepository();
