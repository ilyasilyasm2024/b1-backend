const SchreibenVersion = require('./schreiben.model');

class SchreibenController {
  async saveVersion(req, res) {
    try {
      const userId = req.user.userId;
      const { moduleId, aufgabeId, text } = req.body;

      if (!moduleId || !aufgabeId || !text || !text.trim()) {
        return res.status(400).json({ error: 'moduleId, aufgabeId, and text are required' });
      }

      // Check max 5 versions per aufgabe
      const existingCount = await SchreibenVersion.countDocuments({ userId, moduleId, aufgabeId });
      if (existingCount >= 5) {
        return res.status(400).json({ error: 'Maximum 5 versions per task. Delete an old version to save a new one.' });
      }

      if (text.length > 1000) {
        return res.status(400).json({ error: 'Text must be at most 1000 characters' });
      }

      const wordCount = text.trim().split(/\s+/).length;

      if (wordCount < 20) {
        return res.status(400).json({ error: 'Text must have at least 20 words' });
      }

      if (wordCount > 300) {
        return res.status(400).json({ error: 'Text must have at most 300 words' });
      }

      const version = await SchreibenVersion.create({
        userId,
        moduleId,
        aufgabeId,
        text: text.trim(),
        wordCount,
      });

      res.status(201).json(version);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  async getVersions(req, res) {
    try {
      const userId = req.user.userId;
      const { moduleId, aufgabeId } = req.params;

      const versions = await SchreibenVersion.find({ userId, moduleId, aufgabeId: Number(aufgabeId) })
        .sort({ createdAt: -1 })
        .limit(5);

      res.json(versions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  async deleteVersion(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const version = await SchreibenVersion.findOneAndDelete({ _id: id, userId });
      if (!version) return res.status(404).json({ error: 'Version not found' });

      res.json({ message: 'Version deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }
}

module.exports = new SchreibenController();
