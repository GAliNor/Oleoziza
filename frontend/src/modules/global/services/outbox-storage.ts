import type { IOutboxEntry, IOutboxStorage } from 'global/types/outbox';

const DATABASE_NAME = 'oleoziza';
const DATABASE_VERSION = 1;
const STORE_NAME = 'outbox';

const asPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

let database: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
};

const withStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const store = (await openDatabase()).transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  return asPromise(run(store));
};

/** The outbox in IndexedDB: it survives a reload, a crash and a night without network. */
export const indexedDbOutboxStorage: IOutboxStorage = {
  readAll: () => withStore('readonly', (store) => store.getAll() as IDBRequest<IOutboxEntry[]>),
  put: async (entry) => {
    await withStore('readwrite', (store) => store.put(entry));
  },
  remove: async (key) => {
    await withStore('readwrite', (store) => store.delete(key));
  },
};

/** An outbox in memory, for tests and browsers without IndexedDB. */
export const createMemoryOutboxStorage = (): IOutboxStorage => {
  const entries = new Map<string, IOutboxEntry>();
  return {
    readAll: async () => [...entries.values()].map((entry) => ({ ...entry })),
    put: async (entry) => void entries.set(entry.key, { ...entry }),
    remove: async (key) => void entries.delete(key),
  };
};
