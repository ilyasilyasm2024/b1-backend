const Note = require('./notes.model');

class NotesRepository {
  async create(data) {
    return Note.create(data);
  }

  async findAllByUser(userId) {
    return Note.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async countByUserAndType(userId, type) {
    return Note.countDocuments({ userId, type });
  }

  async findByIdAndUser(id, userId) {
    return Note.findOne({ _id: id, userId });
  }

  // Ids (as strings) among `ids` that are text notes owned by the user.
  async findTextNoteIds(userId, ids) {
    const found = await Note.find({ _id: { $in: ids }, userId, type: 'text' }).distinct('_id');
    return found.map(String);
  }

  async updateByUser(id, userId, updateData) {
    return Note.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );
  }

  async deleteByUser(id, userId) {
    return Note.findOneAndDelete({ _id: id, userId });
  }
}

module.exports = new NotesRepository();
