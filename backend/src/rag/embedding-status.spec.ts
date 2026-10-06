import { pickRelevantJob } from './embedding-status';

const job = (state: string, over: Partial<{ progress: unknown; timestamp: number; finishedOn: number }> = {}) => ({
  getState: async () => state,
  ...over,
});

describe('pickRelevantJob', () => {
  it('reports nothing when there is no job', async () => {
    await expect(pickRelevantJob([null, undefined])).resolves.toEqual({ state: null, progress: null });
    await expect(pickRelevantJob([])).resolves.toEqual({ state: null, progress: null });
  });

  it('follows the job that is running, even if the other one is newer', async () => {
    const embed = job('active', { progress: 40, timestamp: 100 });
    const link = job('completed', { progress: 100, timestamp: 900, finishedOn: 950 });
    await expect(pickRelevantJob([embed, link])).resolves.toEqual({ state: 'active', progress: 40 });
    await expect(pickRelevantJob([link, embed])).resolves.toEqual({ state: 'active', progress: 40 });
  });

  it('follows a running link job (the book is being linked, not embedded)', async () => {
    const link = job('waiting', { progress: 0, timestamp: 5 });
    await expect(pickRelevantJob([undefined, link])).resolves.toEqual({ state: 'waiting', progress: 0 });
  });

  it('takes the one that settled last when none is running', async () => {
    const embed = job('failed', { timestamp: 10, finishedOn: 20 });
    const link = job('completed', { progress: 100, timestamp: 30, finishedOn: 60 });
    await expect(pickRelevantJob([embed, link])).resolves.toEqual({ state: 'completed', progress: 100 });
  });

  it('picks the newer when both are running', async () => {
    const a = job('active', { progress: 10, timestamp: 1 });
    const b = job('active', { progress: 70, timestamp: 2 });
    await expect(pickRelevantJob([a, b])).resolves.toEqual({ state: 'active', progress: 70 });
  });

  it('treats a non-numeric progress as unmeasurable', async () => {
    await expect(pickRelevantJob([job('active', { progress: { stage: 'x' } })])).resolves.toEqual({
      state: 'active',
      progress: null,
    });
  });
});
