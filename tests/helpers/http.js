// Shared mock helpers for Express req/res in controller unit tests.
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides };
}

module.exports = { mockRes, mockReq };
