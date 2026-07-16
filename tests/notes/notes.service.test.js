jest.mock('../../src/modules/notes/notes.repository');

const notesRepository = require('../../src/modules/notes/notes.repository');
const notesService = require('../../src/modules/notes/notes.service');

describe('NotesService.addNote', () => {
  beforeEach(() => { notesRepository.create.mockImplementation((d) => Promise.resolve(d)); });

  it('attaches the userId', async () => {
    await notesService.addNote('u1', { content: 'hi' });
    expect(notesRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
  });

  it('sanitizes rich-text content (strips scripts)', async () => {
    const result = await notesService.addNote('u1', { content: 'ok<script>alert(1)</script>' });
    expect(result.content).toBe('ok');
  });

  it('keeps allowed formatting in content', async () => {
    const result = await notesService.addNote('u1', { content: '<b>bold</b>' });
    expect(result.content).toBe('<b>bold</b>');
  });

  it('strips all HTML from the title', async () => {
    const result = await notesService.addNote('u1', { title: '<b>My</b> Note' });
    expect(result.title).toBe('My Note');
  });

  it('handles a note without content or title', async () => {
    const result = await notesService.addNote('u1', { type: 'tick' });
    expect(result.userId).toBe('u1');
  });
});

describe('NotesService.updateNote', () => {
  beforeEach(() => { notesRepository.updateByUser.mockImplementation((id, uid, d) => Promise.resolve(d)); });

  it('sanitizes content on update', async () => {
    const result = await notesService.updateNote('n1', 'u1', { content: '<img onerror=x>text' });
    expect(result.content).toBe('text');
  });

  it('strips HTML from title on update', async () => {
    const result = await notesService.updateNote('n1', 'u1', { title: '<i>t</i>' });
    expect(result.title).toBe('t');
  });

  it('passes id and userId through to the repository', async () => {
    await notesService.updateNote('n1', 'u1', { pinned: true });
    expect(notesRepository.updateByUser).toHaveBeenCalledWith('n1', 'u1', expect.objectContaining({ pinned: true }));
  });
});

describe('NotesService.getNotesByUser / deleteNote', () => {
  it('lists notes for a user', async () => {
    notesRepository.findAllByUser.mockResolvedValue([{ _id: 'n1' }]);
    const result = await notesService.getNotesByUser('u1');
    expect(result).toEqual([{ _id: 'n1' }]);
  });

  it('deletes a note scoped to the user', async () => {
    notesRepository.deleteByUser.mockResolvedValue({ _id: 'n1' });
    await notesService.deleteNote('n1', 'u1');
    expect(notesRepository.deleteByUser).toHaveBeenCalledWith('n1', 'u1');
  });
});
