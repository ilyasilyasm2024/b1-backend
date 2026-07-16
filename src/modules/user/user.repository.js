const User = require('./user.model');

class UserRepository {
  async create(userData) {
    return User.create(userData);
  }

  // Paginated, lean read. Returns plain objects (no Mongoose hydration) plus
  // the total count so callers can build pagination metadata.
  async findAll({ page = 1, limit = 50 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      User.countDocuments(),
    ]);

    return { items, total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) };
  }

  async findById(id) {
    return User.findById(id);
  }

  async findByUsername(username) {
    return User.findOne({ username });
  }

  async update(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, { new: true });
  }

  // Atomically acquire a subscribe lock. Succeeds only if no lock is held or the
  // existing lock is older than `staleMs` (self-healing if a request crashed).
  // Returns the user doc if the lock was acquired, otherwise null.
  async acquireSubscribeLock(id, staleMs = 30000) {
    const staleThreshold = new Date(Date.now() - staleMs);
    return User.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { subscribeLockAt: null },
          { subscribeLockAt: { $lt: staleThreshold } },
        ],
      },
      { subscribeLockAt: new Date() },
      { new: true }
    );
  }

  async releaseSubscribeLock(id) {
    return User.findByIdAndUpdate(id, { subscribeLockAt: null });
  }

  async delete(id) {
    return User.findByIdAndDelete(id);
  }
}

module.exports = new UserRepository();
