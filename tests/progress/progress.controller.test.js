jest.mock('../../src/modules/progress/progress.service');

const progressService = require('../../src/modules/progress/progress.service');
const controller = require('../../src/modules/progress/progress.controller');
const { mockReq, mockRes } = require('../helpers/http');

const user = { userId: 'u1' };

describe('ProgressController.get', () => {
  it('returns 400 for an invalid moduleId', async () => {
    const res = mockRes();
    await controller.get(mockReq({ user, params: { moduleId: 'BAD-ID' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns progress for a valid moduleId', async () => {
    progressService.getProgress.mockResolvedValue({ sections: {} });
    const res = mockRes();
    await controller.get(mockReq({ user, params: { moduleId: 'm1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ sections: {} });
  });

  it('returns 500 on service error', async () => {
    progressService.getProgress.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await controller.get(mockReq({ user, params: { moduleId: 'm1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('ProgressController.save', () => {
  it('returns 400 for an invalid moduleId', async () => {
    const res = mockRes();
    await controller.save(mockReq({ user, params: { moduleId: 'BAD-ID' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('saves valid progress', async () => {
    progressService.saveProgress.mockResolvedValue({});
    const res = mockRes();
    await controller.save(mockReq({ user, params: { moduleId: 'm1' }, body: { sections: {} } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Progress saved' });
  });

  it('returns 400 for an invalid body', async () => {
    const res = mockRes();
    await controller.save(mockReq({
      user, params: { moduleId: 'm1' }, body: { sections: { s1: { answers: [1] } } },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('ProgressController.getAll', () => {
  it('returns all progress', async () => {
    progressService.getAllProgress.mockResolvedValue({ m1: {} });
    const res = mockRes();
    await controller.getAll(mockReq({ user }), res);
    expect(res.json).toHaveBeenCalledWith({ m1: {} });
  });

  it('returns 500 on error', async () => {
    progressService.getAllProgress.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await controller.getAll(mockReq({ user }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
