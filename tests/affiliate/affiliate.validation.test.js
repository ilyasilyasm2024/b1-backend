const { createInfluencerSchema, loginSchema } = require('../../src/modules/affiliate/affiliate.validation');

const validInfluencer = {
  name: 'Ilyas',
  email: 'ilyas@example.com',
  password: 'secret123',
};

describe('createInfluencerSchema', () => {
  it('accepts minimal valid data', () => {
    const { error } = createInfluencerSchema.validate(validInfluencer);
    expect(error).toBeUndefined();
  });

  it('accepts full data with commissions and uppercases referralCode', () => {
    const { error, value } = createInfluencerSchema.validate({
      ...validInfluencer,
      referralCode: 'ilyas20',
      discountPercent: 15,
      commissionPercent: 25,
      firstPurchaseCommission: 50,
      renewalCommission: 20,
    });
    expect(error).toBeUndefined();
    expect(value.referralCode).toBe('ILYAS20');
  });

  it('requires name, email, password', () => {
    expect(createInfluencerSchema.validate({ email: 'a@b.com', password: 'x'.repeat(6) }).error).toBeDefined();
    expect(createInfluencerSchema.validate({ name: 'x', password: 'x'.repeat(6) }).error).toBeDefined();
    expect(createInfluencerSchema.validate({ name: 'x', email: 'a@b.com' }).error).toBeDefined();
  });

  it('rejects an invalid email', () => {
    const { error } = createInfluencerSchema.validate({ ...validInfluencer, email: 'bad' });
    expect(error).toBeDefined();
  });

  it('rejects a short password', () => {
    const { error } = createInfluencerSchema.validate({ ...validInfluencer, password: '123' });
    expect(error).toBeDefined();
  });

  it('rejects commission percentages out of 0-100 range', () => {
    expect(createInfluencerSchema.validate({ ...validInfluencer, commissionPercent: 101 }).error).toBeDefined();
    expect(createInfluencerSchema.validate({ ...validInfluencer, discountPercent: -1 }).error).toBeDefined();
    expect(createInfluencerSchema.validate({ ...validInfluencer, firstPurchaseCommission: 200 }).error).toBeDefined();
  });

  it('accepts boundary percentages 0 and 100', () => {
    expect(createInfluencerSchema.validate({ ...validInfluencer, commissionPercent: 0 }).error).toBeUndefined();
    expect(createInfluencerSchema.validate({ ...validInfluencer, commissionPercent: 100 }).error).toBeUndefined();
  });
});

describe('affiliate loginSchema', () => {
  it('accepts valid credentials', () => {
    const { error } = loginSchema.validate({ email: 'a@b.com', password: 'x' });
    expect(error).toBeUndefined();
  });

  it('rejects invalid email', () => {
    expect(loginSchema.validate({ email: 'bad', password: 'x' }).error).toBeDefined();
  });

  it('rejects missing password', () => {
    expect(loginSchema.validate({ email: 'a@b.com' }).error).toBeDefined();
  });
});
