const mongoose = require('mongoose');

// Serverless-safe connection using the cached-promise pattern.
// On Vercel each warm invocation reuses the same module scope, so we cache the
// connection promise on globalThis. This prevents a "connection storm" where
// every concurrent request on a cold-started instance opens its own connection
// and exhausts the MongoDB Atlas connection limit.
let cached = globalThis.__mongoose;
if (!cached) {
  cached = globalThis.__mongoose = { conn: null, promise: null };
}

// Small pool per instance keeps total connections (pool × instances) under the
// Atlas limit in a serverless environment.
const CONNECT_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const connectDatabase = async () => {
  // Reuse a live connection.
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Reuse an in-flight connection attempt so concurrent requests await the
  // same promise instead of each calling connect().
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_DB_URL, CONNECT_OPTIONS)
      .then((m) => {
        console.log('MongoDB connected');
        return m;
      })
      .catch((err) => {
        // Reset so the next request can retry instead of caching a rejection.
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDatabase;
