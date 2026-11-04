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

describe('NotesService links (text notes only)', () => {
  beforeEach(() => {
    notesRepository.updateByUser.mockImplementation((id, uid, d) => Promise.resolve(d));
    notesRepository.create.mockImplementation((d) => Promise.resolve(d));
    // t2, t3 are the user's text notes; anything else (tick notes, other users' notes) is not
    notesRepository.findTextNoteIds.mockImplementation((uid, ids) => Promise.resolve(ids.filter((i) => ['t2', 't3'].includes(i))));
  });

  it('keeps only links to the user\'s own text notes, without self or duplicates', async () => {
    notesRepository.findByIdAndUser.mockResolvedValue({ _id: 't1', type: 'text' });
    const result = await notesService.updateNote('t1', 'u1', { links: ['t2', 'tick1', 't2', 't1', 't3'] });
    expect(result.links).toEqual(['t2', 't3']);
  });

  it('clears links on a tick note', async () => {
    notesRepository.findByIdAndUser.mockResolvedValue({ _id: 'k1', type: 'tick' });
    const result = await notesService.updateNote('k1', 'u1', { links: ['t2'] });
    expect(result.links).toEqual([]);
    expect(notesRepository.findTextNoteIds).not.toHaveBeenCalled();
  });

  it('returns null when the note does not belong to the user', async () => {
    notesRepository.findByIdAndUser.mockResolvedValue(null);
    expect(await notesService.updateNote('x', 'u1', { links: ['t2'] })).toBeNull();
    expect(notesRepository.updateByUser).not.toHaveBeenCalled();
  });

  it('filters links on create too', async () => {
    const text = await notesService.addNote('u1', { type: 'text', links: ['t2', 'tick1'] });
    expect(text.links).toEqual(['t2']);
    const tick = await notesService.addNote('u1', { type: 'tick', links: ['t2'] });
    expect(tick.links).toEqual([]);
  });

  it('does not look up the note when links are not being changed', async () => {
    await notesService.updateNote('t1', 'u1', { pinned: true });
    expect(notesRepository.findByIdAndUser).not.toHaveBeenCalled();
  });
});

describe('NotesService note limits', () => {
  beforeEach(() => { notesRepository.create.mockImplementation((d) => Promise.resolve(d)); });

  it('allows up to 20 text notes and 10 color notes', async () => {
    notesRepository.countByUserAndType.mockResolvedValue(19);
    await expect(notesService.addNote('u1', { type: 'text' })).resolves.toMatchObject({ type: 'text' });
    notesRepository.countByUserAndType.mockResolvedValue(9);
    await expect(notesService.addNote('u1', { type: 'tick' })).resolves.toMatchObject({ type: 'tick' });
  });

  it('rejects the 21st text note and the 11th color note with a 400', async () => {
    notesRepository.countByUserAndType.mockResolvedValue(20);
    await expect(notesService.addNote('u1', { type: 'text' })).rejects.toMatchObject({ status: 400, message: expect.stringContaining('20 text notes') });
    notesRepository.countByUserAndType.mockResolvedValue(10);
    await expect(notesService.addNote('u1', { type: 'tick' })).rejects.toMatchObject({ status: 400, message: expect.stringContaining('10 color notes') });
    expect(notesRepository.create).not.toHaveBeenCalled();
  });

  it('counts per type (a missing type means text)', async () => {
    notesRepository.countByUserAndType.mockResolvedValue(0);
    await notesService.addNote('u1', {});
    expect(notesRepository.countByUserAndType).toHaveBeenCalledWith('u1', 'text');
  });
});
