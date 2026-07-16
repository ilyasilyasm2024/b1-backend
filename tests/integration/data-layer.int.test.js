// Exercises the real data-layer changes: pagination shape, lean reads,
// unique indexes, and cross-user ownership isolation for notes.
jest.mock('../../src/config/mailer');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const request = require('supertest');
const { startDb, stopDb, clearDb, mongoose } = require('./setup');

let app;
let User;
let Note;
let userRepository;

async function makeUser(username) {
  const user = await User.create({
    username,
    email: `${username}@example.com`,
    firstName: 'F',
    lastName: 'L',
    password: await bcrypt.hash('secret123', 10),
    isVerified: true,
    plan: 'beta',
  });
  const token = jwt.sign({ userId: user._id, username }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token };
}

beforeAll(async () => {
  await startDb();
  app = require('../../src/app');
  User = require('../../src/modules/user/user.model');
  Note = require('../../src/modules/notes/notes.model');
  userRepository = require('../../src/modules/user/user.repository');
});

afterAll(async () => { await stopDb(); });
beforeEach(async () => { await clearDb(); });

describe('user unique indexes', () => {
  it('enforces a unique username at the database level', async () => {
    await makeUser('dupe');
    await expect(User.create({
      username: 'dupe', email: 'other@example.com', firstName: 'F', lastName: 'L',
      password: 'x', isVerified: true, plan: 'beta',
    })).rejects.toThrow();
  });

  it('enforces a unique email at the database level', async () => {
    await makeUser('a');
    await expect(User.create({
      username: 'b', email: 'a@example.com', firstName: 'F', lastName: 'L',
      password: 'x', isVerified: true, plan: 'beta',
    })).rejects.toThrow();
  });
});

describe('paginated user listing', () => {
  it('returns the paginated shape with correct totals', async () => {
    for (let i = 0; i < 25; i++) await makeUser(`user${i}`);

    const result = await userRepository.findAll({ page: 1, limit: 10 });
    expect(result.items).toHaveLength(10);
    expect(result.total).toBe(25);
    expect(result.pages).toBe(3);
    expect(result.page).toBe(1);
    // lean() → plain objects, not Mongoose documents
    expect(result.items[0].constructor.name).toBe('Object');
  });

  it('caps the limit to protect against huge page sizes', async () => {
    for (let i = 0; i < 5; i++) await makeUser(`u${i}`);
    const result = await userRepository.findAll({ page: 1, limit: 100000 });
    expect(result.limit).toBeLessThanOrEqual(200);
  });

  it('returns the second page correctly', async () => {
    for (let i = 0; i < 15; i++) await makeUser(`p${i}`);
    const page2 = await userRepository.findAll({ page: 2, limit: 10 });
    expect(page2.items).toHaveLength(5);
    expect(page2.page).toBe(2);
  });
});

describe('notes ownership isolation', () => {
  it('a user cannot read another user\'s notes', async () => {
    const alice = await makeUser('alice');
    const bob = await makeUser('bob');

    await request(app).post('/notes').set('Authorization', `Bearer ${alice.token}`)
      .send({ type: 'text', content: 'alice secret' });

    const bobNotes = await request(app).get('/notes').set('Authorization', `Bearer ${bob.token}`);
    expect(bobNotes.status).toBe(200);
    expect(bobNotes.body).toHaveLength(0);
  });

  it('a user cannot update or delete another user\'s note', async () => {
    const alice = await makeUser('alice');
    const bob = await makeUser('bob');

    const created = await request(app).post('/notes').set('Authorization', `Bearer ${alice.token}`)
      .send({ type: 'text', content: 'alice note' });
    const noteId = created.body._id;

    const bobUpdate = await request(app).put(`/notes/${noteId}`)
      .set('Authorization', `Bearer ${bob.token}`).send({ content: 'hacked' });
    expect(bobUpdate.status).toBe(404);

    const bobDelete = await request(app).delete(`/notes/${noteId}`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(bobDelete.status).toBe(404);

    // Alice's note is untouched.
    const stored = await Note.findById(noteId);
    expect(stored.content).toContain('alice note');
  });

  it('the declared indexes exist on the collections', async () => {
    await makeUser('idx');
    const noteIndexes = await mongoose.connection.collection('notes').indexes();
    const hasUserOrder = noteIndexes.some((i) => i.key.userId === 1 && i.key.order === 1);
    expect(hasUserOrder).toBe(true);
  });
});
