import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ClientMockService from 'client/services/client.mock';
import { ACCOUNTS_MOCK } from 'client/constants/mock-accounts';
import { CLIENT_RECORDS_MOCK } from 'client/constants/mock-client-records';
import { summarizeActivity } from 'client/composables/client-activity';
import { useClientStore } from 'client/stores/client';
import type { IClient } from 'client/types/client';

const client = (name: string, phone: string): IClient => ({ id: name, kind: 'individual', name, phone, siteIds: [], isPendingSync: false });

describe('client store searchClients', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useClientStore().clients = [
      client('Mohammed Benali', '+212661234518'),
      client('Fatima Zahra El Idrissi', '+212670881240'),
      client('Coopérative Angad', '+212536682109'),
    ];
  });

  it('lists the first Clients for an empty query', () => {
    expect(useClientStore().searchClients('  ', 2).map((found) => found.name)).toEqual(['Mohammed Benali', 'Fatima Zahra El Idrissi']);
  });

  it('matches a name case-insensitively', () => {
    expect(useClientStore().searchClients('ANGAD').map((found) => found.name)).toEqual(['Coopérative Angad']);
  });

  it('matches a phone typed with its leading zero, from three digits', () => {
    expect(useClientStore().searchClients('0670').map((found) => found.name)).toEqual(['Fatima Zahra El Idrissi']);
  });

  it('ignores fewer than three digits', () => {
    expect(useClientStore().searchClients('66')).toEqual([]);
  });
});

describe('client store fetchClients', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the Clients once and clears the flags', async () => {
    const getAll = vi.spyOn(ClientMockService.prototype, 'getAll').mockResolvedValue([client('Said Tahiri', '+212661921827')]);
    const clientStore = useClientStore();
    await clientStore.fetchClients();
    await clientStore.fetchClients();
    expect([clientStore.clients.length, clientStore.isLoaded, clientStore.isLoading, clientStore.hasError, getAll.mock.calls.length]).toEqual([1, true, false, false, 1]);
  });

  it('keeps the list and raises hasError when loading fails', async () => {
    vi.spyOn(ClientMockService.prototype, 'getAll').mockRejectedValue(new Error('offline'));
    const clientStore = useClientStore();
    await clientStore.fetchClients();
    expect([clientStore.clients, clientStore.isLoaded, clientStore.isLoading, clientStore.hasError]).toEqual([[], false, false, true]);
  });
});

describe('client store accounts', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty, then holds the fetched account, fetched once', async () => {
    const getAccount = vi.spyOn(ClientMockService.prototype, 'getAccount').mockResolvedValue({ oilStockKg: 389, dueDh: 1025, pendingDh: 500, payoutDh: 0, history: [] });
    const clientStore = useClientStore();
    expect(clientStore.accountOf('c1').dueDh).toBe(0);
    await clientStore.fetchAccount('c1');
    await clientStore.fetchAccount('c1');
    expect([clientStore.accountOf('c1').dueDh, getAccount.mock.calls.length]).toEqual([1025, 1]);
  });
});

describe('the mock Client records', () => {
  it('all belong to a known Client, on the Client list', () => {
    expect(CLIENT_RECORDS_MOCK.filter((record) => !record.id).map((record) => record.name)).toEqual([]);
  });

  it('keep the figures of every Site adding up to the Client’s', () => {
    const shared = CLIENT_RECORDS_MOCK.filter((record) => record.sites.length > 1 && record.balance);
    shared.forEach((record) => expect(record.sites.reduce((sum, site) => sum + site.balance, 0)).toBeCloseTo(record.balance, -1));
  });
});

describe('the mock Client finances', () => {
  it('owe the same on the record and on the account', () => {
    CLIENT_RECORDS_MOCK.forEach((record) => expect([record.name, ACCOUNTS_MOCK[record.id].dueDh, ACCOUNTS_MOCK[record.id].oilStockKg]).toEqual([record.name, record.balance, record.oilStockKg]));
  });

  it('never owe more than they generated', () => {
    CLIENT_RECORDS_MOCK.forEach((record) => expect(record.balance).toBeLessThanOrEqual(summarizeActivity(record.history).generatedDh));
  });
});

describe('the mock Client lots', () => {
  it('have one code each, across every Client', () => {
    const codes = CLIENT_RECORDS_MOCK.flatMap((record) => record.history.map((lot) => lot.code));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('belong to the Client’s own Sites, newest first, inside the rendement alert range', () => {
    CLIENT_RECORDS_MOCK.forEach((record) => {
      const siteIds = record.sites.map((site) => site.siteId);
      record.history.forEach((lot, index) => {
        expect(siteIds).toContain(lot.siteId);
        expect(lot.oilKg / lot.kg).toBeGreaterThanOrEqual(0.12);
        expect(lot.oilKg / lot.kg).toBeLessThanOrEqual(0.24);
        if (index) expect(lot.receivedOn <= record.history[index - 1].receivedOn).toBe(true);
      });
    });
  });

  it('place every Client in a Province of the Oriental', () => {
    expect(CLIENT_RECORDS_MOCK.filter((record) => !record.province).map((record) => record.region)).toEqual([]);
  });
});

describe('client store records', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads the records and finds one by id', async () => {
    const clientStore = useClientStore();
    await clientStore.fetchRecords();
    const [first] = clientStore.records;
    expect(clientStore.recordById(first.id)?.name).toBe(first.name);
    expect(clientStore.recordById('nobody')).toBeUndefined();
  });
});
