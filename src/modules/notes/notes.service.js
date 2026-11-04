const notesRepository = require('./notes.repository');
const { sanitizeHtml } = require('./notes.sanitize');

// Links only connect text notes: color (tick) notes float on the page and can't show links.
// Drops ids that aren't the user's own text notes, the note itself, and duplicates.
async function allowedLinks(userId, noteType, links, selfId) {
  if (noteType !== 'text' || links.length === 0) return [];
  const unique = [...new Set(links.map(String))].filter((l) => l !== String(selfId));
  if (unique.length === 0) return [];
  const textIds = new Set(await notesRepository.findTextNoteIds(userId, unique));
  return unique.filter((l) => textIds.has(l));
}

// Max notes per user and type (the frontend shows the same numbers).
const NOTE_LIMITS = {
  text: { max: 20, message: 'Maximum 20 text notes. Delete an old note to add a new one.' },
  tick: { max: 10, message: 'Maximum 10 color notes. Delete an old note to add a new one.' },
};

class NotesService {
  async addNote(userId, noteData) {
    const data = { ...noteData, userId };
    const limit = NOTE_LIMITS[data.type || 'text'];
    if (limit && (await notesRepository.countByUserAndType(userId, data.type || 'text')) >= limit.max) {
      const err = new Error(limit.message);
      err.status = 400;
      throw err;
    }
    if (Array.isArray(data.links)) {
      data.links = await allowedLinks(userId, data.type, data.links);
    }
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
    if (Array.isArray(data.links)) {
      const note = await notesRepository.findByIdAndUser(id, userId);
      if (!note) return null;
      data.links = await allowedLinks(userId, note.type, data.links, id);
    }
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
