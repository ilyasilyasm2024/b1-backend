const mongoose = require('mongoose');

// A minimal, dependency-free MongoDB store for express-rate-limit.
//
// Why custom: the popular `rate-limit-mongo` pulls in a vulnerable `underscore`
// (high-severity DoS, no fix). This implementation reuses the app's existing
// Mongoose connection (no extra Atlas connections), uses an atomic $inc upsert
// for the counter, and relies on a native TTL index so expired windows are
// swept automatically by MongoDB.
//
// Implements the express-rate-limit Store interface: increment / decrement /
// resetKey. See https://express-rate-limit.mintlify.app/reference/stores
class MongoRateLimitStore {
  constructor({ collectionName = 'rateLimits', windowMs = 15 * 60 * 1000 } = {}) {
    this.windowMs = windowMs;
    this.collectionName = collectionName;
    this._indexReady = false;
  }

  // Called by express-rate-limit with the resolved windowMs.
  init(options) {
    if (options && options.windowMs) this.windowMs = options.windowMs;
  }

  _collection() {
    return mongoose.connection.collection(this.collectionName);
  }

  async _ensureIndex() {
    if (this._indexReady) return;
    // TTL index: Mongo deletes a document once `expiresAt` is in the past.
    await this._collection().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    this._indexReady = true;
  }

  async increment(key) {
    await this._ensureIndex();
    const now = Date.now();
    const expiresAt = new Date(now + this.windowMs);

    // Atomic: create the window if absent (set expiresAt once), always $inc.
    const doc = await this._collection().findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: 'after' }
    );

    const record = doc && doc.value ? doc.value : doc; // driver version compat
    const resetTime = record && record.expiresAt ? record.expiresAt : expiresAt;
    return { totalHits: record ? record.count : 1, resetTime };
  }

  async decrement(key) {
    await this._collection().updateOne({ _id: key }, { $inc: { count: -1 } }).catch(() => {});
  }

  async resetKey(key) {
    await this._collection().deleteOne({ _id: key }).catch(() => {});
  }
}

module.exports = MongoRateLimitStore;
