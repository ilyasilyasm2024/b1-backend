const notesRepository = require('./notes.repository');
const { sanitizeHtml } = require('./notes.sanitize');

class NotesService {
  async addNote(userId, noteData) {
    const data = { ...noteData, userId };
    if (typeof data.content === 'string') {
      data.content = sanitizeHtml(data.content);
    }
    if (typeof data.title === 'string') {
      data.title = data.title.replace(/<[^>]*>/g, '');
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
    if (typeof data.title === 'string') {
      data.title = data.title.replace(/<[^>]*>/g, '');
    }
    return notesRepository.updateByUser(id, userId, data);
  }

  async deleteNote(id, userId) {
    return notesRepository.deleteByUser(id, userId);
  }
}

module.exports = new NotesService();
