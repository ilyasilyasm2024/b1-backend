jest.mock('../../src/modules/vocabulary/vocabulary.repository');

const vocabularyRepository = require('../../src/modules/vocabulary/vocabulary.repository');
const vocabularyService = require('../../src/modules/vocabulary/vocabulary.service');

describe('VocabularyService', () => {
  it('addVocab attaches userId', async () => {
    vocabularyRepository.create.mockImplementation((d) => Promise.resolve(d));
    const result = await vocabularyService.addVocab('u1', { deutsch: 'Haus', arabic: 'بيت' });
    expect(result.userId).toBe('u1');
    expect(result.deutsch).toBe('Haus');
  });

  it('getVocabsByUser delegates to the repository', async () => {
    vocabularyRepository.findAllByUser.mockResolvedValue([{ _id: 'v1' }]);
    const result = await vocabularyService.getVocabsByUser('u1');
    expect(result).toEqual([{ _id: 'v1' }]);
    expect(vocabularyRepository.findAllByUser).toHaveBeenCalledWith('u1');
  });

  it('updateVocab passes id, userId and data', async () => {
    vocabularyRepository.updateByUser.mockResolvedValue({ _id: 'v1' });
    await vocabularyService.updateVocab('v1', 'u1', { isLearned: true });
    expect(vocabularyRepository.updateByUser).toHaveBeenCalledWith('v1', 'u1', { isLearned: true });
  });

  it('deleteVocab scopes to the user', async () => {
    vocabularyRepository.deleteByUser.mockResolvedValue({ _id: 'v1' });
    await vocabularyService.deleteVocab('v1', 'u1');
    expect(vocabularyRepository.deleteByUser).toHaveBeenCalledWith('v1', 'u1');
  });
});
