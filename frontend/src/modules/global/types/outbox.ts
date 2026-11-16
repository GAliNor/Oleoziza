export type OutboxStatus = 'pending' | 'failed';

/** One offline-capable write waiting to reach the server, kept in IndexedDB across reloads. */
export interface IOutboxEntry {
  /** The idempotency key: the record id for a creation, the event id for an action. */
  key: string;
  /** `<module>.<action>`, the handler that sends it (`client.create`). */
  kind: string;
  /** The record it writes, so a later write on it waits behind an earlier failed one. */
  recordId: string;
  payload: unknown;
  /** Who made the write: on a shared phone, only their own session sends it, so the Audit Trail names the right person. */
  userId: string | null;
  status: OutboxStatus;
  errorCode: string | null;
  attempts: number;
  createdAt: number;
  nextAttemptAt: number;
}

export interface IOutboxStorage {
  readAll(): Promise<IOutboxEntry[]>;
  put(entry: IOutboxEntry): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Sends one entry's payload and applies the server's answer to the store. */
export type OutboxHandler = (payload: unknown) => Promise<void>;
