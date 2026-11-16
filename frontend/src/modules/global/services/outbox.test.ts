import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { Outbox, retryDelayMs } from 'global/services/outbox';
import { createMemoryOutboxStorage } from 'global/services/outbox-storage';

const networkDown = (): AxiosError => new AxiosError('Network Error', 'ERR_NETWORK');
const refused = (code: string): AxiosError =>
  new AxiosError('refused', '409', undefined, undefined, { status: 409, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { code } });

const buildOutbox = (clock = { now: 1_000 }) => {
  const outbox = new Outbox({ storage: createMemoryOutboxStorage(), now: () => clock.now, isOnline: () => true });
  return { outbox, clock };
};

describe('Outbox', () => {
  it('sends writes in the order they were made, and forgets each once sent', async () => {
    const { outbox, clock } = buildOutbox();
    const sent: string[] = [];
    outbox.register('client.create', async (payload) => void sent.push(payload as string));
    await outbox.enqueue('client.create', 'k1', 'c1', 'first');
    clock.now += 1;
    await outbox.enqueue('client.create', 'k2', 'c2', 'second');
    await outbox.drain();
    expect(sent).toEqual(['first', 'second']);
    expect(await outbox.entries()).toEqual([]);
  });

  it('keeps a write that could not reach the server and retries it later, with backoff', async () => {
    const { outbox, clock } = buildOutbox();
    const handler = vi.fn().mockRejectedValueOnce(networkDown()).mockResolvedValueOnce(undefined);
    outbox.register('client.create', handler);
    await outbox.enqueue('client.create', 'k1', 'c1', {});
    await outbox.drain();
    const [waiting] = await outbox.entries();
    expect([waiting?.status, waiting?.attempts, waiting?.errorCode]).toEqual(['pending', 1, 'network']);
    await outbox.drain();
    expect(handler).toHaveBeenCalledTimes(1);
    clock.now += retryDelayMs(1);
    await outbox.drain();
    expect(await outbox.entries()).toEqual([]);
  });

  it('marks a refused write failed with its code, and holds later writes on the same record behind it', async () => {
    const { outbox, clock } = buildOutbox();
    const sent: string[] = [];
    outbox.register('lot.move', async (payload) => {
      if (payload === 'press') throw refused('lot_state_changed');
      sent.push(payload as string);
    });
    await outbox.enqueue('lot.move', 'k1', 'lot-1', 'press');
    clock.now += 1;
    await outbox.enqueue('lot.move', 'k2', 'lot-1', 'store');
    clock.now += 1;
    await outbox.enqueue('lot.move', 'k3', 'lot-2', 'other lot');
    await outbox.drain();
    const entries = await outbox.entries();
    expect(entries.map((entry) => [entry.key, entry.status, entry.errorCode])).toEqual([
      ['k1', 'failed', 'lot_state_changed'],
      ['k2', 'pending', null],
    ]);
    expect(sent).toEqual(['other lot']);
  });

  it('sends the held writes once the failed one is discarded', async () => {
    const { outbox, clock } = buildOutbox();
    const handler = vi.fn().mockRejectedValueOnce(refused('lot_state_changed')).mockResolvedValue(undefined);
    outbox.register('lot.move', handler);
    await outbox.enqueue('lot.move', 'k1', 'lot-1', 'press');
    clock.now += 1;
    await outbox.enqueue('lot.move', 'k2', 'lot-1', 'store');
    await outbox.drain();
    await outbox.discard('k1');
    await outbox.drain();
    expect(await outbox.entries()).toEqual([]);
    expect(handler).toHaveBeenLastCalledWith('store');
  });

  it('waits while offline, and for a handler that is not registered yet', async () => {
    const storage = createMemoryOutboxStorage();
    let isOnline = false;
    const outbox = new Outbox({ storage, now: () => 1, isOnline: () => isOnline });
    await outbox.enqueue('client.create', 'k1', 'c1', {});
    isOnline = true;
    await outbox.drain();
    expect((await outbox.entries()).length).toBe(1);
    const handler = vi.fn().mockResolvedValue(undefined);
    outbox.register('client.create', handler);
    await outbox.drain();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('sends only the signed-in User\'s writes, so a shared phone never credits the next Operator', async () => {
    let userId = 'operator-a';
    const outbox = new Outbox({ storage: createMemoryOutboxStorage(), now: () => 1, isOnline: () => true, currentUserId: () => userId });
    const handler = vi.fn().mockResolvedValue(undefined);
    await outbox.enqueue('client.create', 'k1', 'c1', {});
    userId = 'operator-b';
    outbox.register('client.create', handler);
    await outbox.drain();
    expect(handler).not.toHaveBeenCalled();
    userId = 'operator-a';
    await outbox.drain();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports every change, so the pending badge stays true', async () => {
    const counts: number[] = [];
    const outbox = new Outbox({ storage: createMemoryOutboxStorage(), now: () => 1, isOnline: () => true, onChange: (entries) => counts.push(entries.length) });
    outbox.register('client.create', async () => undefined);
    await outbox.enqueue('client.create', 'k1', 'c1', {});
    await outbox.drain();
    expect(counts).toEqual([1, 0]);
  });
});
