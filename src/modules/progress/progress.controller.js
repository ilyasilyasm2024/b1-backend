const progressService = require('./progress.service');
const { moduleIdSchema, saveProgressSchema } = require('./progress.validation');

class ProgressController {
  async get(req, res) {
    try {
      const { error: idError } = moduleIdSchema.validate(req.params.moduleId);
      if (idError) {
        return res.status(400).json({ error: idError.details[0].message });
      }

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
      const { error: idError } = moduleIdSchema.validate(req.params.moduleId);
      if (idError) {
        return res.status(400).json({ error: idError.details[0].message });
      }

      const { error, value } = saveProgressSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map(d => d.message);
        return res.status(400).json({ errors: messages });
      }

      const userId = req.user.userId;
      const { moduleId } = req.params;
      await progressService.saveProgress(userId, moduleId, value);
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
