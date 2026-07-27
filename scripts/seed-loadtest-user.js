// Creates (or resets) a single verified test user for load testing.
// Run it LOCALLY, pointed at your STAGING database — never production.
//
// Usage:
//   MONGO_DB_URL="<staging atlas url>" \
//   LOADTEST_USER=loadtest_user \
//   LOADTEST_PASS=loadtest_pass_123 \
//   node scripts/seed-loadtest-user.js
//
// The credentials you set here are the same ones you pass to k6 as
// TEST_USER / TEST_PASS.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/modules/user/user.model');

const USERNAME = process.env.LOADTEST_USER || 'loadtest_user';
const PASSWORD = process.env.LOADTEST_PASS || 'loadtest_pass_123';
const EMAIL = process.env.LOADTEST_EMAIL || 'loadtest@example.com';

async function main() {
  if (!process.env.MONGO_DB_URL) {
    console.error('MONGO_DB_URL is required. Point it at your STAGING database.');
    process.exit(1);
  }

  // Safety guard: refuse to run if the URL looks like a production DB name.
  if (/prod|production/i.test(process.env.MONGO_DB_URL)) {
    console.error('Refusing to seed: the connection string looks like production.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_DB_URL);
  console.log('Connected to', process.env.MONGO_DB_URL.replace(/:[^:@]+@/, ':****@'));

  const hashed = await bcrypt.hash(PASSWORD, 10);

  const user = await User.findOneAndUpdate(
    { username: USERNAME },
    {
      username: USERNAME,
      email: EMAIL,
      firstName: 'Load',
      lastName: 'Test',
      password: hashed,
      isVerified: true, // already verified so it can log in immediately
      plan: 'beta',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('\n✅ Load-test user ready:');
  console.log('   username:', user.username);
  console.log('   password:', PASSWORD);
  console.log('\nPass these to k6:');
  console.log(`   -e TEST_USER=${user.username} -e TEST_PASS=${PASSWORD}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
