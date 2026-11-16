import { isHttpError } from '~/plugins/axios';
import { NETWORK_ERROR_CODE, readApiErrorCode } from 'global/services/api-error';
import type { IOutboxEntry, IOutboxStorage, OutboxHandler } from 'global/types/outbox';

const FIRST_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;

/** True when the write may succeed later: no answer, a server error or too many requests. Any other refusal is final. */
export const isRetryable = (error: unknown): boolean => {
  if (!isHttpError(error)) return false;
  const status = error.response?.status;
  return status === undefined || status >= 500 || status === 429;
};

/** 2 s, 4 s, 8 s… up to 5 min between tries. */
export const retryDelayMs = (attempts: number): number => Math.min(FIRST_RETRY_DELAY_MS * 2 ** Math.max(attempts - 1, 0), MAX_RETRY_DELAY_MS);

export interface IOutboxOptions {
  storage: IOutboxStorage;
  now?: () => number;
  isOnline?: () => boolean;
  currentUserId?: () => string | null;
  onChange?: (entries: IOutboxEntry[]) => void;
}

/**
 * Offline-capable writes, sent one at a time in the order they were made.
 * A write that can't reach the server waits and retries with backoff; one the server refuses is marked failed with its code,
 * and later writes on the same record wait behind it until the Operator retries or discards it.
 */
export class Outbox {
  private readonly handlers = new Map<string, OutboxHandler>();
  private draining: Promise<void> | null = null;
  private hasNewEntries = false;
  private readonly now: () => number;
  private readonly isOnline: () => boolean;
  private readonly currentUserId: () => string | null;

  constructor(private readonly options: IOutboxOptions) {
    this.now = options.now ?? Date.now;
    this.isOnline = options.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine);
    this.currentUserId = options.currentUserId ?? (() => null);
  }

  /** Declares how entries of one kind are sent; entries of an unknown kind wait until their handler is registered. */
  register(kind: string, handler: OutboxHandler): void {
    this.handlers.set(kind, handler);
  }

  /** Stores the write, then tries to send it at once. */
  async enqueue(kind: string, key: string, recordId: string, payload: unknown): Promise<void> {
    const createdAt = this.now();
    await this.options.storage.put({ key, kind, recordId, payload, userId: this.currentUserId(), status: 'pending', errorCode: null, attempts: 0, createdAt, nextAttemptAt: createdAt });
    await this.notify();
    void this.drain();
  }

  async retry(key: string): Promise<void> {
    const entry = (await this.options.storage.readAll()).find((item) => item.key === key);
    if (!entry) return;
    await this.options.storage.put({ ...entry, status: 'pending', errorCode: null, nextAttemptAt: this.now() });
    await this.notify();
    void this.drain();
  }

  async discard(key: string): Promise<void> {
    await this.options.storage.remove(key);
    await this.notify();
    void this.drain();
  }

  /** Sends every entry that is due, oldest first; calls arriving meanwhile join the same run, which goes round again for entries added during it. */
  drain(): Promise<void> {
    this.hasNewEntries = true;
    this.draining ??= this.runDrainRounds().finally(() => {
      this.draining = null;
    });
    return this.draining;
  }

  private async runDrainRounds(): Promise<void> {
    while (this.hasNewEntries) {
      this.hasNewEntries = false;
      const isStopped = !(await this.runDrain());
      if (isStopped) return;
    }
  }

  async entries(): Promise<IOutboxEntry[]> {
    return (await this.options.storage.readAll()).sort((first, second) => first.createdAt - second.createdAt);
  }

  /** One pass over the entries; false when it stopped on a network failure or offline. */
  private async runDrain(): Promise<boolean> {
    if (!this.isOnline()) return false;
    const blockedRecords = new Set<string>();
    for (const entry of await this.entries()) {
      if (entry.status === 'failed' || blockedRecords.has(entry.recordId)) {
        blockedRecords.add(entry.recordId);
        continue;
      }
      const handler = this.handlers.get(entry.kind);
      if (!handler || entry.nextAttemptAt > this.now() || entry.userId !== this.currentUserId()) {
        blockedRecords.add(entry.recordId);
        continue;
      }
      const isSent = await this.send(entry, handler);
      if (!isSent) return false;
    }
    return true;
  }

  /** Sends one entry; false when the network is gone, so the run stops and waits. */
  private async send(entry: IOutboxEntry, handler: OutboxHandler): Promise<boolean> {
    try {
      await handler(entry.payload);
      await this.options.storage.remove(entry.key);
      await this.notify();
      return true;
    } catch (error) {
      const attempts = entry.attempts + 1;
      if (isRetryable(error)) {
        await this.options.storage.put({ ...entry, attempts, errorCode: readApiErrorCode(error) ?? NETWORK_ERROR_CODE, nextAttemptAt: this.now() + retryDelayMs(attempts) });
        await this.notify();
        return false;
      }
      await this.options.storage.put({ ...entry, attempts, status: 'failed', errorCode: readApiErrorCode(error) ?? 'unknown' });
      await this.notify();
      return true;
    }
  }

  private async notify(): Promise<void> {
    this.options.onChange?.(await this.entries());
  }
}
