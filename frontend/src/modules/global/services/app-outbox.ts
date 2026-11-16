import { Outbox } from 'global/services/outbox';
import { createMemoryOutboxStorage, indexedDbOutboxStorage } from 'global/services/outbox-storage';
import { useSessionStore } from 'global/stores/session';
import { useSyncStore } from 'global/stores/sync';

const DRAIN_INTERVAL_MS = 30_000;

/** The app's one outbox; stores register their offline-capable writes on it. */
export const outbox = new Outbox({
  storage: typeof indexedDB === 'undefined' ? createMemoryOutboxStorage() : indexedDbOutboxStorage,
  currentUserId: () => useSessionStore().session?.userId ?? null,
  onChange: (entries) => useSyncStore().setOutboxEntries(entries),
});

let isStarted = false;

/** Starts draining once the session is ready: now, on reconnect, on coming back to the app, and every 30 s while entries wait. Asks the browser to keep the outbox (iOS evicts storage otherwise). */
export const startOutbox = async (): Promise<void> => {
  if (isStarted || typeof window === 'undefined') return;
  isStarted = true;
  const handleWake = (): void => {
    if (document.visibilityState === 'visible') void outbox.drain();
  };
  window.addEventListener('online', () => void outbox.drain());
  document.addEventListener('visibilitychange', handleWake);
  setInterval(() => void outbox.drain(), DRAIN_INTERVAL_MS);
  void navigator.storage?.persist?.();
  useSyncStore().setOutboxEntries(await outbox.entries());
  await outbox.drain();
};
