const notesService = require('./notes.service');
const { addNoteSchema, updateNoteSchema } = require('./notes.validation');

class NotesController {
  async add(req, res) {
    try {
      const { error, value } = addNoteSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map(d => d.message);
        return res.status(400).json({ errors: messages });
      }

      const userId = req.user.userId;
      const note = await notesService.addNote(userId, value);
      res.status(201).json(note);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  async getByUser(req, res) {
    try {
      const userId = req.user.userId;
      const notes = await notesService.getNotesByUser(userId);
      res.json(notes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  async update(req, res) {
    try {
      const { error, value } = updateNoteSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map(d => d.message);
        return res.status(400).json({ errors: messages });
      }

      const userId = req.user.userId;
      const { id } = req.params;
      const note = await notesService.updateNote(id, userId, value);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      res.json(note);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  async delete(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const note = await notesService.deleteNote(id, userId);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      res.json({ message: 'Note deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }
}

module.exports = new NotesController();
