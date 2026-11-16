/** How long loaded data counts as fresh, by kind; past it, the next load asks the server again. */
export const LOAD_TTL_MS = {
  reference: Number.POSITIVE_INFINITY,
  configuration: 10 * 60_000,
  records: 60_000,
  live: 15_000,
} as const;

const inFlight = new Map<string, Promise<unknown>>();
const loadedAt = new Map<string, number>();

/** True when `key` was loaded less than `ttlMs` ago. */
export const isLoadFresh = (key: string, ttlMs: number): boolean => {
  const at = loadedAt.get(key);
  return at !== undefined && Date.now() - at < ttlMs;
};

/**
 * Runs `task` once for `key`: callers arriving while it runs share its promise, and callers within `ttlMs` of its success skip it.
 * `isForced` reloads even when fresh, but still joins a load already running. A failure leaves the key stale.
 */
export const cachedLoad = async (key: string, ttlMs: number, task: () => Promise<void>, isForced = false): Promise<void> => {
  const running = inFlight.get(key);
  if (running) return running as Promise<void>;
  if (!isForced && isLoadFresh(key, ttlMs)) return;
  const load = task()
    .then(() => {
      loadedAt.set(key, Date.now());
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, load);
  return load;
};

/** Marks every key starting with `prefix` stale, so the next load asks the server: after switching Site, a Season change or another device's write. */
export const invalidateLoads = (prefix = ''): void => {
  [...loadedAt.keys()].filter((key) => key.startsWith(prefix)).forEach((key) => loadedAt.delete(key));
};
