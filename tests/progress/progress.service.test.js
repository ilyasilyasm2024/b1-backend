jest.mock('../../src/modules/progress/progress.repository');

const progressRepository = require('../../src/modules/progress/progress.repository');
const progressService = require('../../src/modules/progress/progress.service');

describe('ProgressService.getProgress', () => {
  it('returns empty defaults when no progress exists', async () => {
    progressRepository.findByUserAndModule.mockResolvedValue(null);
    const result = await progressService.getProgress('u1', 'm1');
    expect(result).toEqual({ sections: {}, texts: {}, done: {}, highlights: [] });
  });

  it('returns stored progress, filling missing fields', async () => {
    progressRepository.findByUserAndModule.mockResolvedValue({ sections: { a: 1 } });
    const result = await progressService.getProgress('u1', 'm1');
    expect(result.sections).toEqual({ a: 1 });
    expect(result.texts).toEqual({});
    expect(result.highlights).toEqual([]);
  });
});

describe('ProgressService.saveProgress', () => {
  it('upserts through the repository', async () => {
    progressRepository.upsert.mockResolvedValue({});
    await progressService.saveProgress('u1', 'm1', { sections: {}, texts: {}, done: {}, highlights: [] });
    expect(progressRepository.upsert).toHaveBeenCalledWith('u1', 'm1', expect.any(Object));
  });
});

describe('ProgressService.getAllProgress', () => {
  it('maps a list keyed by moduleId', async () => {
    progressRepository.findAllByUser.mockResolvedValue([
      { moduleId: 'm1', sections: { a: 1 } },
      { moduleId: 'm2', done: { x: [true] } },
    ]);
    const result = await progressService.getAllProgress('u1');
    expect(Object.keys(result)).toEqual(['m1', 'm2']);
    expect(result.m1.sections).toEqual({ a: 1 });
    expect(result.m2.done).toEqual({ x: [true] });
  });

  it('returns an empty object when there is no progress', async () => {
    progressRepository.findAllByUser.mockResolvedValue([]);
    expect(await progressService.getAllProgress('u1')).toEqual({});
  });
});
