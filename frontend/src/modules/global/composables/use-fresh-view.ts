import { onBeforeUnmount, onMounted } from 'vue';

export interface IFreshViewOptions {
  /** Also reload every `pollMs` while the page is visible: the Operator's live boards only. */
  pollMs?: number;
}

export interface IFreshnessTargets {
  page: EventTarget & { visibilityState: DocumentVisibilityState };
  network: EventTarget & { navigator: { onLine: boolean } };
}

/** Calls `load` when the page becomes visible again, when the network returns, and on a slow poll if asked; returns the function that stops it. */
export const watchFreshness = (load: () => unknown, options: IFreshViewOptions, targets: IFreshnessTargets): (() => void) => {
  const handleVisibilityChange = (): void => {
    if (targets.page.visibilityState === 'visible') load();
  };
  const handleOnline = (): void => {
    load();
  };
  const handlePoll = (): void => {
    if (targets.page.visibilityState === 'visible' && targets.network.navigator.onLine) load();
  };
  targets.page.addEventListener('visibilitychange', handleVisibilityChange);
  targets.network.addEventListener('online', handleOnline);
  const pollTimer = options.pollMs ? setInterval(handlePoll, options.pollMs) : undefined;
  return () => {
    targets.page.removeEventListener('visibilitychange', handleVisibilityChange);
    targets.network.removeEventListener('online', handleOnline);
    if (pollTimer) clearInterval(pollTimer);
  };
};

/**
 * Loads a view's data on entry, again when the user comes back to the tab or the network returns, and on a slow poll if asked.
 * `load` goes through `cachedLoad`, so a return only asks the server for what is past its time-to-live.
 */
export const useFreshView = (load: () => unknown, options: IFreshViewOptions = {}): void => {
  let stop: (() => void) | undefined;
  onMounted(() => {
    load();
    stop = watchFreshness(load, options, { page: document, network: window });
  });
  onBeforeUnmount(() => stop?.());
};
