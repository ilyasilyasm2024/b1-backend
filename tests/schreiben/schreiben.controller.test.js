jest.mock('../../src/modules/schreiben/schreiben.model');

const SchreibenVersion = require('../../src/modules/schreiben/schreiben.model');
const controller = require('../../src/modules/schreiben/schreiben.controller');
const { mockReq, mockRes } = require('../helpers/http');

const user = { userId: 'u1' };
const validText = Array.from({ length: 25 }, (_, i) => `word${i}`).join(' ');

describe('SchreibenController.saveVersion', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = mockRes();
    await controller.saveVersion(mockReq({ user, body: { moduleId: 'm1' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when 5 versions already exist', async () => {
    SchreibenVersion.countDocuments.mockResolvedValue(5);
    const res = mockRes();
    await controller.saveVersion(mockReq({ user, body: { moduleId: 'm1', aufgabeId: 1, text: validText } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/Maximum 5/);
  });

  it('returns 400 when text exceeds 1000 chars', async () => {
    SchreibenVersion.countDocuments.mockResolvedValue(0);
    const longText = 'a'.repeat(1001);
    const res = mockRes();
    await controller.saveVersion(mockReq({ user, body: { moduleId: 'm1', aufgabeId: 1, text: longText } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when fewer than 20 words', async () => {
    SchreibenVersion.countDocuments.mockResolvedValue(0);
    const res = mockRes();
    await controller.saveVersion(mockReq({ user, body: { moduleId: 'm1', aufgabeId: 1, text: 'too short text' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/at least 20 words/);
  });

  it('returns 400 when more than 300 words', async () => {
    SchreibenVersion.countDocuments.mockResolvedValue(0);
    const many = Array.from({ length: 301 }, () => 'w').join(' ');
    const res = mockRes();
    await controller.saveVersion(mockReq({ user, body: { moduleId: 'm1', aufgabeId: 1, text: many } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/at most 300 words/);
  });

  it('creates a version on valid input', async () => {
    SchreibenVersion.countDocuments.mockResolvedValue(0);
    SchreibenVersion.create.mockResolvedValue({ _id: 's1', wordCount: 25 });
    const res = mockRes();
    await controller.saveVersion(mockReq({ user, body: { moduleId: 'm1', aufgabeId: 1, text: validText } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(SchreibenVersion.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', wordCount: 25 }));
  });

  it('returns 500 on unexpected error', async () => {
    SchreibenVersion.countDocuments.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await controller.saveVersion(mockReq({ user, body: { moduleId: 'm1', aufgabeId: 1, text: validText } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('SchreibenController.getVersions', () => {
  it('returns versions', async () => {
    const query = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([{ _id: 's1' }]) };
    SchreibenVersion.find.mockReturnValue(query);
    const res = mockRes();
    await controller.getVersions(mockReq({ user, params: { moduleId: 'm1', aufgabeId: '1' } }), res);
    expect(res.json).toHaveBeenCalledWith([{ _id: 's1' }]);
  });
});

describe('SchreibenController.deleteVersion', () => {
  it('returns 404 when not found', async () => {
    SchreibenVersion.findOneAndDelete.mockResolvedValue(null);
    const res = mockRes();
    await controller.deleteVersion(mockReq({ user, params: { id: 's1' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('confirms deletion', async () => {
    SchreibenVersion.findOneAndDelete.mockResolvedValue({ _id: 's1' });
    const res = mockRes();
    await controller.deleteVersion(mockReq({ user, params: { id: 's1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Version deleted' });
  });
});
