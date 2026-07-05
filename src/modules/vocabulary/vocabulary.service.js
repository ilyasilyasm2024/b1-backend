const vocabularyRepository = require('./vocabulary.repository');

class VocabularyService {
  async addVocab(userId, vocabData) {
    return vocabularyRepository.create({ ...vocabData, userId });
  }

  async getVocabsByUser(userId) {
    return vocabularyRepository.findAllByUser(userId);
  }

  async updateVocab(id, userId, updateData) {
    return vocabularyRepository.updateByUser(id, userId, updateData);
  }

  async deleteVocab(id, userId) {
    return vocabularyRepository.deleteByUser(id, userId);
  }
}

module.exports = new VocabularyService();
