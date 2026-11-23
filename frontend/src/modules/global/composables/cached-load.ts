/** How long loaded data counts as fresh, by kind; past it, the next load asks the server again. */
export const LOAD_TTL_MS = {
  reference: Number.POSITIVE_INFINITY,
  configuration: 10 * 60_000,
  records: 60_000,
  live: 15_000,
} as const;

const inFlight = new Map<string, Promise<unknown>>();
const loadedAt = new Map<string, number>();
const wantedBySlot = new Map<string, string>();

/** True when `key` was loaded less than `ttlMs` ago. */
export const isLoadFresh = (key: string, ttlMs: number): boolean => {
  const at = loadedAt.get(key);
  return at !== undefined && Date.now() - at < ttlMs;
};

/**
 * Runs `task` once for `key`: callers arriving while it runs share its promise, and callers within `ttlMs` of its success skip it.
 * `isForced` reloads even when fresh, but still joins a load already running. A failure leaves the key stale.
 */
export const cachedLoad = async (key: string, ttlMs: number, task: () => Promise<void | boolean>, isForced = false): Promise<void> => {
  const running = inFlight.get(key);
  if (running) return running as Promise<void>;
  if (!isForced && isLoadFresh(key, ttlMs)) return;
  const load = task()
    .then((wasKept) => {
      if (wasKept !== false) loadedAt.set(key, Date.now());
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, load);
  return load;
};

/** The one value a slot holds is now `params`': fresh for them, stale for every other params. Also for a caller that filled the store itself. */
export const markSlot = (slot: string, params: string): void => {
  wantedBySlot.set(slot, params);
  invalidateLoads(`${slot}:`);
  loadedAt.set(`${slot}:${params}`, Date.now());
};

/**
 * Loads a store field that holds one value at a time (a period's totals, a Site's Payments): what is cached is always what the field holds.
 * Loading other params makes the previous ones stale, so coming back asks again; an answer that arrives after other params were asked is dropped.
 */
export const slotLoad = async <T>(slot: string, params: string, ttlMs: number, fetch: () => Promise<T>, keep: (value: T) => void, isForced = false): Promise<void> => {
  wantedBySlot.set(slot, params);
  await cachedLoad(
    `${slot}:${params}`,
    ttlMs,
    async () => {
      const value = await fetch();
      if (wantedBySlot.get(slot) !== params) return false;
      keep(value);
      invalidateLoads(`${slot}:`);
      return true;
    },
    isForced,
  );
};

/** Marks every key starting with `prefix` stale, so the next load asks the server: after switching Site, a Season change or another device's write. */
export const invalidateLoads = (prefix = ''): void => {
  [...loadedAt.keys()].filter((key) => key.startsWith(prefix)).forEach((key) => loadedAt.delete(key));
};
