const Progress = require('./progress.model');

class ProgressRepository {
  async findByUserAndModule(userId, moduleId) {
    return Progress.findOne({ userId, moduleId });
  }

  async upsert(userId, moduleId, data) {
    return Progress.findOneAndUpdate(
      { userId, moduleId },
      { userId, moduleId, ...data },
      { upsert: true, new: true }
    );
  }

  async findAllByUser(userId) {
    return Progress.find({ userId });
  }
}

module.exports = new ProgressRepository();
