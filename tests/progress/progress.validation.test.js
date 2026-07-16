const { moduleIdSchema, saveProgressSchema } = require('../../src/modules/progress/progress.validation');

describe('moduleIdSchema', () => {
  it('accepts a lowercase alphanumeric id', () => {
    expect(moduleIdSchema.validate('m1').error).toBeUndefined();
    expect(moduleIdSchema.validate('module5').error).toBeUndefined();
  });

  it('rejects uppercase', () => {
    expect(moduleIdSchema.validate('M1').error).toBeDefined();
  });

  it('rejects an id over 10 chars', () => {
    expect(moduleIdSchema.validate('a'.repeat(11)).error).toBeDefined();
  });

  it('rejects a missing id', () => {
    expect(moduleIdSchema.validate(undefined).error).toBeDefined();
  });

  it('rejects special characters', () => {
    expect(moduleIdSchema.validate('m-1').error).toBeDefined();
  });
});

describe('saveProgressSchema', () => {
  it('accepts an empty object with defaults', () => {
    const { error, value } = saveProgressSchema.validate({});
    expect(error).toBeUndefined();
    expect(value.sections).toEqual({});
    expect(value.highlights).toEqual([]);
  });

  it('accepts a well-formed section', () => {
    const { error } = saveProgressSchema.validate({
      sections: { s1: { answers: [1, 2], submitted: true } },
    });
    expect(error).toBeUndefined();
  });

  it('rejects a section missing submitted', () => {
    const { error } = saveProgressSchema.validate({
      sections: { s1: { answers: [1] } },
    });
    expect(error).toBeDefined();
  });

  it('accepts highlights with text and color', () => {
    const { error } = saveProgressSchema.validate({
      highlights: [{ text: 'hi', color: 'yellow' }],
    });
    expect(error).toBeUndefined();
  });

  it('rejects a highlight missing color', () => {
    const { error } = saveProgressSchema.validate({
      highlights: [{ text: 'hi' }],
    });
    expect(error).toBeDefined();
  });

  it('rejects more than 200 highlights', () => {
    const highlights = Array.from({ length: 201 }, () => ({ text: 'x', color: 'y' }));
    const { error } = saveProgressSchema.validate({ highlights });
    expect(error).toBeDefined();
  });
});
