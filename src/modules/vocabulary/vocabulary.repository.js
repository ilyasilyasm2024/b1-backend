const Vocabulary = require('./vocabulary.model');

class VocabularyRepository {
  async create(data) {
    return Vocabulary.create(data);
  }

  async findAllByUser(userId) {
    return Vocabulary.find({ userId });
  }

  async findByIdAndUser(id, userId) {
    return Vocabulary.findOne({ _id: id, userId });
  }

  async updateByUser(id, userId, updateData) {
    return Vocabulary.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );
  }

  async deleteByUser(id, userId) {
    return Vocabulary.findOneAndDelete({ _id: id, userId });
  }
}

module.exports = new VocabularyRepository();
