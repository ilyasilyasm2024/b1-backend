jest.mock('../../src/modules/vocabulary/vocabulary.service');

const vocabularyService = require('../../src/modules/vocabulary/vocabulary.service');
const controller = require('../../src/modules/vocabulary/vocabulary.controller');
const { mockReq, mockRes } = require('../helpers/http');

const user = { userId: 'u1' };

describe('VocabularyController.add', () => {
  it('returns 400 on invalid body', async () => {
    const res = mockRes();
    await controller.add(mockReq({ user, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toHaveProperty('errors');
  });

  it('returns 201 on valid vocab', async () => {
    vocabularyService.addVocab.mockResolvedValue({ _id: 'v1' });
    const res = mockRes();
    await controller.add(mockReq({ user, body: { deutsch: 'Haus', arabic: 'بيت' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 500 when the service throws', async () => {
    vocabularyService.addVocab.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await controller.add(mockReq({ user, body: { deutsch: 'Haus', arabic: 'بيت' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('VocabularyController.getByUser', () => {
  it('returns the list', async () => {
    vocabularyService.getVocabsByUser.mockResolvedValue([{ _id: 'v1' }]);
    const res = mockRes();
    await controller.getByUser(mockReq({ user }), res);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'v1' }]);
  });
});

describe('VocabularyController.update', () => {
  it('returns 400 on empty update', async () => {
    const res = mockRes();
    await controller.update(mockReq({ user, params: { id: 'v1' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when not found', async () => {
    vocabularyService.updateVocab.mockResolvedValue(null);
    const res = mockRes();
    await controller.update(mockReq({ user, params: { id: 'v1' }, body: { isLearned: true } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the updated vocab', async () => {
    vocabularyService.updateVocab.mockResolvedValue({ _id: 'v1', isLearned: true });
    const res = mockRes();
    await controller.update(mockReq({ user, params: { id: 'v1' }, body: { isLearned: true } }), res);
    expect(res.json).toHaveBeenCalledWith({ _id: 'v1', isLearned: true });
  });
});

describe('VocabularyController.delete', () => {
  it('returns 404 when nothing deleted', async () => {
    vocabularyService.deleteVocab.mockResolvedValue(null);
    const res = mockRes();
    await controller.delete(mockReq({ user, params: { id: 'v1' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('confirms deletion', async () => {
    vocabularyService.deleteVocab.mockResolvedValue({ _id: 'v1' });
    const res = mockRes();
    await controller.delete(mockReq({ user, params: { id: 'v1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Vocabulary deleted' });
  });
});

describe('VocabularyController.add uses userId from token', () => {
  it('passes req.user.userId to the service', async () => {
    vocabularyService.addVocab.mockResolvedValue({ _id: 'v1' });
    const res = mockRes();
    await controller.add(mockReq({ user, body: { deutsch: 'Haus', arabic: 'بيت' } }), res);
    expect(vocabularyService.addVocab).toHaveBeenCalledWith('u1', expect.objectContaining({ deutsch: 'Haus' }));
  });
});
