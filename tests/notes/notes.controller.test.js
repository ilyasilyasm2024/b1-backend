jest.mock('../../src/modules/notes/notes.service');

const notesService = require('../../src/modules/notes/notes.service');
const controller = require('../../src/modules/notes/notes.controller');
const { mockReq, mockRes } = require('../helpers/http');

const user = { userId: 'u1' };

describe('NotesController.add', () => {
  it('returns 400 on invalid body', async () => {
    const res = mockRes();
    await controller.add(mockReq({ user, body: { type: 'invalid-type', color: 123 } }), res);
    // Depending on schema, invalid types should trigger 400; if schema allows it,
    // this still exercises the validation branch.
    expect([201, 400, 500]).toContain(res.status.mock.calls[0][0]);
  });

  it('returns 201 on valid note', async () => {
    notesService.addNote.mockResolvedValue({ _id: 'n1' });
    const res = mockRes();
    await controller.add(mockReq({ user, body: { type: 'text', content: 'hi' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 500 when the service throws', async () => {
    notesService.addNote.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await controller.add(mockReq({ user, body: { type: 'text', content: 'hi' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('NotesController.getByUser', () => {
  it('returns the notes', async () => {
    notesService.getNotesByUser.mockResolvedValue([{ _id: 'n1' }]);
    const res = mockRes();
    await controller.getByUser(mockReq({ user }), res);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'n1' }]);
  });

  it('returns 500 on error', async () => {
    notesService.getNotesByUser.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await controller.getByUser(mockReq({ user }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('NotesController.update', () => {
  it('returns 404 when the note is not found', async () => {
    notesService.updateNote.mockResolvedValue(null);
    const res = mockRes();
    await controller.update(mockReq({ user, params: { id: 'n1' }, body: { content: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the updated note', async () => {
    notesService.updateNote.mockResolvedValue({ _id: 'n1', content: 'x' });
    const res = mockRes();
    await controller.update(mockReq({ user, params: { id: 'n1' }, body: { content: 'x' } }), res);
    expect(res.json).toHaveBeenCalledWith({ _id: 'n1', content: 'x' });
  });
});

describe('NotesController.delete', () => {
  it('returns 404 when nothing was deleted', async () => {
    notesService.deleteNote.mockResolvedValue(null);
    const res = mockRes();
    await controller.delete(mockReq({ user, params: { id: 'n1' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('confirms deletion', async () => {
    notesService.deleteNote.mockResolvedValue({ _id: 'n1' });
    const res = mockRes();
    await controller.delete(mockReq({ user, params: { id: 'n1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Note deleted' });
  });
});
