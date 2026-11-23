import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cachedLoad, invalidateLoads, isLoadFresh, slotLoad } from 'global/composables/cached-load';

describe('cachedLoad', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invalidateLoads();
  });

  afterEach(() => vi.useRealTimers());

  it('sends one request for callers arriving together', async () => {
    const task = vi.fn(() => Promise.resolve());
    await Promise.all([cachedLoad('clients:a', 60_000, task), cachedLoad('clients:a', 60_000, task), cachedLoad('clients:a', 60_000, task)]);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('skips a load while it is fresh and asks again once it is stale', async () => {
    const task = vi.fn(() => Promise.resolve());
    await cachedLoad('clients:a', 60_000, task);
    await cachedLoad('clients:a', 60_000, task);
    vi.advanceTimersByTime(60_001);
    await cachedLoad('clients:a', 60_000, task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('keeps keys apart, so another Site loads on its own', async () => {
    const task = vi.fn(() => Promise.resolve());
    await cachedLoad('clients:a', 60_000, task);
    await cachedLoad('clients:b', 60_000, task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('reloads a fresh key when forced', async () => {
    const task = vi.fn(() => Promise.resolve());
    await cachedLoad('clients:a', 60_000, task);
    await cachedLoad('clients:a', 60_000, task, true);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('leaves a failed load stale, so the next caller retries', async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(undefined);
    await expect(cachedLoad('clients:a', 60_000, task)).rejects.toThrow('down');
    await cachedLoad('clients:a', 60_000, task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('marks keys stale by prefix', async () => {
    await cachedLoad('lots:a', 60_000, () => Promise.resolve());
    await cachedLoad('clients:a', 60_000, () => Promise.resolve());
    invalidateLoads('lots:');
    expect([isLoadFresh('lots:a', 60_000), isLoadFresh('clients:a', 60_000)]).toEqual([false, true]);
  });

  it('asks again when one value served another question meanwhile', async () => {
    let shown = '';
    const load = (params: string): Promise<void> => slotLoad('totals', params, 60_000, () => Promise.resolve(params), (value) => (shown = value));
    const seen: string[] = [];
    for (const params of ['season', 'today', 'season']) {
      await load(params);
      seen.push(shown);
    }
    expect(seen).toEqual(['season', 'today', 'season']);
  });

  it('drops an answer to a question no longer asked, and shows what is still held without asking', async () => {
    let shown = '';
    let answer: (value: string) => void = () => undefined;
    const keep = (value: string): string => (shown = value);
    await slotLoad('totals', 'season', 60_000, () => Promise.resolve('season'), keep);
    const late = slotLoad('totals', 'today', 60_000, () => new Promise<string>((resolve) => (answer = resolve)), keep);
    const again = vi.fn(() => Promise.resolve('asked again'));
    await slotLoad('totals', 'season', 60_000, again, keep);
    answer('today');
    await late;
    expect([shown, again.mock.calls.length]).toEqual(['season', 0]);
  });
});
