const progressService = require('./progress.service');

class ProgressController {
  async get(req, res) {
    try {
      const userId = req.user.userId;
      const { moduleId } = req.params;
      const progress = await progressService.getProgress(userId, moduleId);
      res.json(progress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async save(req, res) {
    try {
      const userId = req.user.userId;
      const { moduleId } = req.params;
      const { sections, texts, done, highlights } = req.body;
      await progressService.saveProgress(userId, moduleId, { sections, texts, done, highlights });
      res.json({ message: 'Progress saved' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const userId = req.user.userId;
      const progress = await progressService.getAllProgress(userId);
      res.json(progress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new ProgressController();
