const notesRepository = require('./notes.repository');
const { sanitizeHtml } = require('./notes.sanitize');

class NotesService {
  async addNote(userId, noteData) {
    const data = { ...noteData, userId };
    if (typeof data.content === 'string') {
      data.content = sanitizeHtml(data.content);
    }
    return notesRepository.create(data);
  }

  async getNotesByUser(userId) {
    return notesRepository.findAllByUser(userId);
  }

  async updateNote(id, userId, updateData) {
    const data = { ...updateData };
    if (typeof data.content === 'string') {
      data.content = sanitizeHtml(data.content);
    }
    return notesRepository.updateByUser(id, userId, data);
  }

  async deleteNote(id, userId) {
    return notesRepository.deleteByUser(id, userId);
  }
}

module.exports = new NotesService();
