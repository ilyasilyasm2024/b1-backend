const progressRepository = require('./progress.repository');

class ProgressService {
  async getProgress(userId, moduleId) {
    const progress = await progressRepository.findByUserAndModule(userId, moduleId);
    if (!progress) {
      return { sections: {}, texts: {}, done: {}, highlights: [] };
    }
    return {
      sections: progress.sections || {},
      texts: progress.texts || {},
      done: progress.done || {},
      highlights: progress.highlights || [],
    };
  }

  async saveProgress(userId, moduleId, { sections, texts, done, highlights }) {
    return progressRepository.upsert(userId, moduleId, { sections, texts, done, highlights });
  }

  async getAllProgress(userId) {
    const all = await progressRepository.findAllByUser(userId);
    const result = {};
    for (const p of all) {
      result[p.moduleId] = {
        sections: p.sections || {},
        texts: p.texts || {},
        done: p.done || {},
        highlights: p.highlights || [],
      };
    }
    return result;
  }
}

module.exports = new ProgressService();
