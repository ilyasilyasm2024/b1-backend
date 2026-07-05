const vocabularyService = require('./vocabulary.service');

class VocabularyController {
  async add(req, res) {
    try {
      const userId = req.user.userId;
      const vocab = await vocabularyService.addVocab(userId, req.body);
      res.status(201).json(vocab);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getByUser(req, res) {
    try {
      const userId = req.user.userId;
      const vocabs = await vocabularyService.getVocabsByUser(userId);
      res.json(vocabs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const vocab = await vocabularyService.updateVocab(id, userId, req.body);
      if (!vocab) return res.status(404).json({ error: 'Vocabulary not found' });
      res.json(vocab);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const vocab = await vocabularyService.deleteVocab(id, userId);
      if (!vocab) return res.status(404).json({ error: 'Vocabulary not found' });
      res.json({ message: 'Vocabulary deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new VocabularyController();
