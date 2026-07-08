const SprechenRecording = require('./sprechen.model');

class SprechenController {
  async saveRecording(req, res) {
    try {
      const userId = req.user.userId;
      const { moduleId, teil, audioUrl, publicId, duration } = req.body;

      if (!moduleId || !teil || !audioUrl || !publicId) {
        return res.status(400).json({ error: 'moduleId, teil, audioUrl, and publicId are required' });
      }

      if (duration > 300) {
        return res.status(400).json({ error: 'Recording must be 5 minutes or less' });
      }

      // Max 5 recordings per teil
      const count = await SprechenRecording.countDocuments({ userId, moduleId, teil });
      if (count >= 5) {
        return res.status(400).json({ error: 'Maximum 5 recordings per part. Delete an old one to save a new one.' });
      }

      const recording = await SprechenRecording.create({
        userId, moduleId, teil, audioUrl, publicId, duration,
      });

      res.status(201).json(recording);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getRecordings(req, res) {
    try {
      const userId = req.user.userId;
      const { moduleId, teil } = req.params;

      const recordings = await SprechenRecording.find({ userId, moduleId, teil })
        .sort({ createdAt: -1 })
        .limit(5);

      res.json(recordings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async deleteRecording(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const recording = await SprechenRecording.findOneAndDelete({ _id: id, userId });
      if (!recording) return res.status(404).json({ error: 'Recording not found' });

      res.json({ message: 'Recording deleted', publicId: recording.publicId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new SprechenController();
