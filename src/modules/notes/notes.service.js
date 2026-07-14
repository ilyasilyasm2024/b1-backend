const notesRepository = require('./notes.repository');

class NotesService {
  async addNote(userId, noteData) {
    return notesRepository.create({ ...noteData, userId });
  }

  async getNotesByUser(userId) {
    return notesRepository.findAllByUser(userId);
  }

  async updateNote(id, userId, updateData) {
    return notesRepository.updateByUser(id, userId, updateData);
  }

  async deleteNote(id, userId) {
    return notesRepository.deleteByUser(id, userId);
  }
}

module.exports = new NotesService();
