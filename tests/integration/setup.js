// Shared lifecycle for integration tests: spins up an in-memory MongoDB,
// points the app's connection string at it, and cleans collections between tests.
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

// Secrets the app/middlewares read from the environment.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret';
process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || 'integration-admin-secret';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';

async function startDb() {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_DB_URL = mongo.getUri();
  await mongoose.connect(process.env.MONGO_DB_URL);
  // Build the indexes we declared on the schemas so index-dependent behavior
  // (unique constraints, etc.) is exercised for real.
  await Promise.all(Object.values(mongoose.connection.models).map((m) => m.syncIndexes().catch(() => {})));
}

async function stopDb() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

async function clearDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

module.exports = { startDb, stopDb, clearDb, mongoose };
