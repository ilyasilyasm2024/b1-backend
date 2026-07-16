const { addVocabSchema, updateVocabSchema } = require('../../src/modules/vocabulary/vocabulary.validation');

describe('addVocabSchema', () => {
  it('accepts a valid vocab entry', () => {
    const { error } = addVocabSchema.validate({ deutsch: 'Haus', arabic: 'بيت', beispiel: 'Das Haus.' });
    expect(error).toBeUndefined();
  });

  it('defaults beispiel to empty string when omitted', () => {
    const { error, value } = addVocabSchema.validate({ deutsch: 'Haus', arabic: 'بيت' });
    expect(error).toBeUndefined();
    expect(value.beispiel).toBe('');
  });

  it('allows an empty beispiel', () => {
    const { error } = addVocabSchema.validate({ deutsch: 'Haus', arabic: 'بيت', beispiel: '' });
    expect(error).toBeUndefined();
  });

  it('requires deutsch', () => {
    const { error } = addVocabSchema.validate({ arabic: 'بيت' });
    expect(error.message).toMatch(/Deutsch field is required/);
  });

  it('requires arabic', () => {
    const { error } = addVocabSchema.validate({ deutsch: 'Haus' });
    expect(error.message).toMatch(/Arabic field is required/);
  });

  it('rejects deutsch over 150 chars', () => {
    const { error } = addVocabSchema.validate({ deutsch: 'a'.repeat(151), arabic: 'x' });
    expect(error.message).toMatch(/at most 150/);
  });
});

describe('updateVocabSchema', () => {
  it('accepts a partial update', () => {
    const { error } = updateVocabSchema.validate({ isLearned: true });
    expect(error).toBeUndefined();
  });

  it('accepts numeric fields', () => {
    const { error } = updateVocabSchema.validate({ viewed: 3, repeatNumber: 1 });
    expect(error).toBeUndefined();
  });

  it('rejects an empty update (min 1 key)', () => {
    const { error } = updateVocabSchema.validate({});
    expect(error).toBeDefined();
  });

  it('rejects negative viewed count', () => {
    const { error } = updateVocabSchema.validate({ viewed: -1 });
    expect(error).toBeDefined();
  });

  it('rejects a non-integer repeatNumber', () => {
    const { error } = updateVocabSchema.validate({ repeatNumber: 1.5 });
    expect(error).toBeDefined();
  });

  it('rejects deutsch over the limit', () => {
    const { error } = updateVocabSchema.validate({ deutsch: 'a'.repeat(151) });
    expect(error).toBeDefined();
  });
});
