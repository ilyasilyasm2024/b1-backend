jest.mock('../../src/modules/sprechen/sprechen.model');

const SprechenRecording = require('../../src/modules/sprechen/sprechen.model');
const controller = require('../../src/modules/sprechen/sprechen.controller');
const { mockReq, mockRes } = require('../helpers/http');

const user = { userId: 'u1' };
const validBody = { moduleId: 'm1', teil: 1, audioUrl: 'https://x/a.mp3', publicId: 'pid', duration: 60 };

describe('SprechenController.saveRecording', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = mockRes();
    await controller.saveRecording(mockReq({ user, body: { moduleId: 'm1' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when duration exceeds 300s', async () => {
    const res = mockRes();
    await controller.saveRecording(mockReq({ user, body: { ...validBody, duration: 301 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/5 minutes/);
  });

  it('returns 400 when 5 recordings already exist', async () => {
    SprechenRecording.countDocuments.mockResolvedValue(5);
    const res = mockRes();
    await controller.saveRecording(mockReq({ user, body: validBody }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/Maximum 5/);
  });

  it('creates a recording on valid input', async () => {
    SprechenRecording.countDocuments.mockResolvedValue(0);
    SprechenRecording.create.mockResolvedValue({ _id: 'r1' });
    const res = mockRes();
    await controller.saveRecording(mockReq({ user, body: validBody }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 500 on unexpected error', async () => {
    SprechenRecording.countDocuments.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await controller.saveRecording(mockReq({ user, body: validBody }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('SprechenController.getRecordings', () => {
  it('returns recordings', async () => {
    const query = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{ _id: 'r1' }]) };
    SprechenRecording.find.mockReturnValue(query);
    const res = mockRes();
    await controller.getRecordings(mockReq({ user, params: { moduleId: 'm1', teil: '1' } }), res);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'r1' }]);
  });
});

describe('SprechenController.deleteRecording', () => {
  it('returns 404 when not found', async () => {
    SprechenRecording.findOneAndDelete.mockResolvedValue(null);
    const res = mockRes();
    await controller.deleteRecording(mockReq({ user, params: { id: 'r1' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('confirms deletion and returns publicId', async () => {
    SprechenRecording.findOneAndDelete.mockResolvedValue({ _id: 'r1', publicId: 'pid' });
    const res = mockRes();
    await controller.deleteRecording(mockReq({ user, params: { id: 'r1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Recording deleted', publicId: 'pid' });
  });
});
