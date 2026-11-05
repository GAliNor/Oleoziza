import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ClientMockService from 'client/services/client.mock';
import { ACCOUNTS_MOCK } from 'client/constants/mock-accounts';
import { CLIENT_RECORDS_MOCK } from 'client/constants/mock-client-records';
import { summarizeActivity } from 'client/composables/client-activity';
import { createId } from 'global/composables/crypto';
import { SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { useClientStore } from 'client/stores/client';
import type { IClient } from 'client/types/client';

const client = (name: string, phone: string): IClient => ({ id: name, kind: 'individual', name, phone, identifier: null, email: null, creditDh: 0, siteIds: [], isPendingSync: false });

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
    const getAccount = vi.spyOn(ClientMockService.prototype, 'getAccount').mockResolvedValue({ oilStockLitres: 389, dueDh: 1025, pendingDh: 500, payoutDh: 0, history: [] });
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

describe('client store clientByIdentifier', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('finds who holds a number from the Client list alone, so it works for an Operator', async () => {
    const clientStore = useClientStore();
    await clientStore.fetchClients();
    const [record] = CLIENT_RECORDS_MOCK;
    expect(clientStore.clientByIdentifier(record.identifier)?.id).toBe(record.id);
    expect(clientStore.clientByIdentifier('Z000000')).toBeUndefined();
  });

  it('knows the number of a Client just created', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const clientStore = useClientStore();
    await clientStore.fetchClients();
    const id = createId();
    await clientStore.createClient({ id, kind: 'individual', name: 'Nadia Rahmani', phone: '+212661223344', siteId: SITE_OUJDA_ID, identifier: 'AB123456', email: null, location: { province: 'jerada', city: 'Touissit', address: 'Hay Essalam' } });
    expect(clientStore.clientByIdentifier('AB123456')?.id).toBe(id);
  });

  it('never matches a Client who gave no number', async () => {
    const clientStore = useClientStore();
    await clientStore.fetchClients();
    expect(clientStore.clientByIdentifier('')).toBeUndefined();
  });
});

describe('the mock Client finances', () => {
  it('owe the same on the record and on the account', () => {
    CLIENT_RECORDS_MOCK.forEach((record) => expect([record.name, ACCOUNTS_MOCK[record.id].dueDh, ACCOUNTS_MOCK[record.id].oilStockLitres]).toEqual([record.name, record.balance, record.oilStockLitres]));
  });

  it('never owe more than they generated', () => {
    CLIENT_RECORDS_MOCK.forEach((record) => expect(record.balance).toBeLessThanOrEqual(summarizeActivity(record.history).generatedDh));
  });
});

describe('the mock Client numbers', () => {
  it('belong to one Client each', () => {
    const numbers = CLIENT_RECORDS_MOCK.map((record) => record.identifier);
    expect(new Set(numbers).size).toBe(numbers.length);
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
        expect(lot.oilLitres / lot.kg).toBeGreaterThanOrEqual(0.13);
        expect(lot.oilLitres / lot.kg).toBeLessThanOrEqual(0.26);
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

  it('shows a new Client on the records, with where they live, once', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const clientStore = useClientStore();
    await clientStore.fetchRecords();
    const payload = { id: createId(), kind: 'individual' as const, name: 'Zineb Test', phone: '+212661112233', siteId: SITE_OUJDA_ID, identifier: 'F486168', email: 'zineb@test.ma', location: { province: 'berkane' as const, city: 'Ahfir', address: '12 rue des Oliviers' } };
    await clientStore.createClient(payload);
    await clientStore.createClient(payload);
    await clientStore.fetchRecords();
    const records = clientStore.records.filter((record) => record.id === payload.id);
    expect(records.map((record) => [record.identifier, record.email, record.province, record.region, record.address, record.sites[0].siteId, record.history])).toEqual([['F486168', 'zineb@test.ma', 'berkane', 'Ahfir', '12 rue des Oliviers', SITE_OUJDA_ID, []]]);
    vi.unstubAllGlobals();
  });

  it('leaves the number empty for a new Client who gave none', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const clientStore = useClientStore();
    const id = createId();
    await clientStore.createClient({ id, kind: 'company', name: 'Domaine Test', phone: '+212536112233', siteId: SITE_OUJDA_ID, identifier: null, email: null, location: { province: 'nador', city: 'Nador', address: 'Route de Selouane' } });
    await clientStore.fetchRecords();
    expect(clientStore.recordById(id)?.identifier).toBe('');
    vi.unstubAllGlobals();
  });

  it('loads the records and finds one by id', async () => {
    const clientStore = useClientStore();
    await clientStore.fetchRecords();
    const [first] = clientStore.records;
    expect(clientStore.recordById(first.id)?.name).toBe(first.name);
    expect(clientStore.recordById('nobody')).toBeUndefined();
  });
});
