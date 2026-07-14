const Note = require('./notes.model');

class NotesRepository {
  async create(data) {
    return Note.create(data);
  }

  async findAllByUser(userId) {
    return Note.find({ userId }).sort({ createdAt: -1 });
  }

  async findByIdAndUser(id, userId) {
    return Note.findOne({ _id: id, userId });
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
