import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { watchFreshness, type IFreshnessTargets } from 'global/composables/use-fresh-view';

const buildTargets = (): IFreshnessTargets & { setVisibility: (state: DocumentVisibilityState) => void; goOnline: () => void } => {
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState });
  const network = Object.assign(new EventTarget(), { navigator: { onLine: true } });
  return {
    page,
    network,
    setVisibility: (state) => {
      page.visibilityState = state;
      page.dispatchEvent(new Event('visibilitychange'));
    },
    goOnline: () => network.dispatchEvent(new Event('online')),
  };
};

describe('watchFreshness', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reloads when the user comes back to the page or the network returns', () => {
    const load = vi.fn();
    const targets = buildTargets();
    watchFreshness(load, {}, targets);
    targets.setVisibility('hidden');
    targets.setVisibility('visible');
    targets.goOnline();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('polls only when asked, and never while the page is hidden', () => {
    const load = vi.fn();
    const targets = buildTargets();
    watchFreshness(load, { pollMs: 15_000 }, targets);
    vi.advanceTimersByTime(15_000);
    targets.page.visibilityState = 'hidden';
    vi.advanceTimersByTime(30_000);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('never polls without a poll interval', () => {
    const load = vi.fn();
    watchFreshness(load, {}, buildTargets());
    vi.advanceTimersByTime(120_000);
    expect(load).not.toHaveBeenCalled();
  });

  it('stops listening once stopped', () => {
    const load = vi.fn();
    const targets = buildTargets();
    const stop = watchFreshness(load, { pollMs: 15_000 }, targets);
    stop();
    targets.goOnline();
    vi.advanceTimersByTime(30_000);
    expect(load).not.toHaveBeenCalled();
  });
});
