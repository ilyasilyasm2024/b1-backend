const vocabularyService = require('./vocabulary.service');
const { addVocabSchema, updateVocabSchema } = require('./vocabulary.validation');

class VocabularyController {
  async add(req, res) {
    try {
      const { error, value } = addVocabSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map(d => d.message);
        return res.status(400).json({ errors: messages });
      }

      const userId = req.user.userId;
      const vocab = await vocabularyService.addVocab(userId, value);
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
      const { error, value } = updateVocabSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map(d => d.message);
        return res.status(400).json({ errors: messages });
      }

      const userId = req.user.userId;
      const { id } = req.params;
      const vocab = await vocabularyService.updateVocab(id, userId, value);
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
