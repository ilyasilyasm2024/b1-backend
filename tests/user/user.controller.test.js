jest.mock('../../src/modules/user/user.service');

const userService = require('../../src/modules/user/user.service');
const controller = require('../../src/modules/user/user.controller');
const { mockReq, mockRes } = require('../helpers/http');

const user = { userId: 'u1' };

describe('UserController.getAll', () => {
  it('passes pagination query and returns the result', async () => {
    userService.getAllUsers.mockResolvedValue({ items: [], total: 0 });
    const res = mockRes();
    await controller.getAll(mockReq({ query: { page: '2', limit: '10' } }), res);
    expect(userService.getAllUsers).toHaveBeenCalledWith({ page: '2', limit: '10' });
    expect(res.json).toHaveBeenCalledWith({ items: [], total: 0 });
  });

  it('returns 500 on error', async () => {
    userService.getAllUsers.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await controller.getAll(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('UserController.getById', () => {
  it('returns 404 when not found', async () => {
    userService.getUserById.mockResolvedValue(null);
    const res = mockRes();
    await controller.getById(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the user when found', async () => {
    userService.getUserById.mockResolvedValue({ _id: 'u1' });
    const res = mockRes();
    await controller.getById(mockReq({ params: { id: 'u1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ _id: 'u1' });
  });
});

describe('UserController.subscribe', () => {
  it('returns 400 without a plan', async () => {
    const res = mockRes();
    await controller.subscribe(mockReq({ user, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('subscribes with a plan', async () => {
    userService.subscribe.mockResolvedValue({ plan: 'gold' });
    const res = mockRes();
    await controller.subscribe(mockReq({ user, body: { plan: 'gold', billing: 'monthly' } }), res);
    expect(userService.subscribe).toHaveBeenCalledWith('u1', { plan: 'gold', billing: 'monthly' });
  });

  it('returns 400 when the service throws (e.g. lock held)', async () => {
    userService.subscribe.mockRejectedValue(new Error('already being processed'));
    const res = mockRes();
    await controller.subscribe(mockReq({ user, body: { plan: 'gold' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('UserController.getProfile', () => {
  it('returns 404 when profile missing', async () => {
    userService.getUserById.mockResolvedValue(null);
    const res = mockRes();
    await controller.getProfile(mockReq({ user }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the profile', async () => {
    userService.getUserById.mockResolvedValue({ _id: 'u1' });
    const res = mockRes();
    await controller.getProfile(mockReq({ user }), res);
    expect(res.json).toHaveBeenCalledWith({ _id: 'u1' });
  });
});

describe('UserController.update / delete / completeTour', () => {
  it('update returns 404 when not found', async () => {
    userService.updateUser.mockResolvedValue(null);
    const res = mockRes();
    await controller.update(mockReq({ user, body: { firstName: 'X' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('update returns the user', async () => {
    userService.updateUser.mockResolvedValue({ _id: 'u1', firstName: 'X' });
    const res = mockRes();
    await controller.update(mockReq({ user, body: { firstName: 'X' } }), res);
    expect(res.json).toHaveBeenCalledWith({ _id: 'u1', firstName: 'X' });
  });

  it('delete returns 404 when not found', async () => {
    userService.deleteUser.mockResolvedValue(null);
    const res = mockRes();
    await controller.delete(mockReq({ user }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('delete confirms', async () => {
    userService.deleteUser.mockResolvedValue({ _id: 'u1' });
    const res = mockRes();
    await controller.delete(mockReq({ user }), res);
    expect(res.json).toHaveBeenCalledWith({ message: 'User deleted' });
  });

  it('completeTour sets firstTour', async () => {
    userService.updateUser.mockResolvedValue({ _id: 'u1', firstTour: true });
    const res = mockRes();
    await controller.completeTour(mockReq({ user }), res);
    expect(userService.updateUser).toHaveBeenCalledWith('u1', { firstTour: true });
  });
});

describe('UserController.getPlan', () => {
  it('returns 404 when user missing', async () => {
    userService.getUserById.mockResolvedValue(null);
    const res = mockRes();
    await controller.getPlan(mockReq({ user }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns effective plan and limits', async () => {
    const future = new Date(Date.now() + 86400000);
    userService.getUserById.mockResolvedValue({ _id: 'u1', plan: 'gold', subscriptionExpiresAt: future });
    const res = mockRes();
    await controller.getPlan(mockReq({ user }), res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.plan).toBe('gold');
    expect(payload.limits).toBeDefined();
  });
});
