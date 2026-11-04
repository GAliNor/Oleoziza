import { mockResolve } from 'global/services/mock';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { ACCOUNTS_MOCK, EMPTY_ACCOUNT } from 'client/constants/mock-accounts';
import { CLIENT_RECORDS_MOCK } from 'client/constants/mock-client-records';
import { SITES_MOCK } from 'site/constants/mock-sites';
import type { IClient, IClientAccount, IClientRecord, IClientService, ICreateClientPayload } from 'client/types/client';

export const CLIENTS_MOCK_DB: IClient[] = structuredClone(CLIENTS_MOCK).map((client) => ({
  ...client,
  identifier: CLIENT_RECORDS_MOCK.find((record) => record.id === client.id)?.identifier ?? null,
}));

const CLIENT_RECORDS_MOCK_DB: IClientRecord[] = structuredClone(CLIENT_RECORDS_MOCK);

export default class ClientMockService implements IClientService {
  getAll(): Promise<IClient[]> {
    return mockResolve(CLIENTS_MOCK_DB);
  }

  getRecords(): Promise<IClientRecord[]> {
    return mockResolve(CLIENT_RECORDS_MOCK_DB);
  }

  getAccount(clientId: string): Promise<IClientAccount> {
    return mockResolve(ACCOUNTS_MOCK[clientId] ?? EMPTY_ACCOUNT);
  }

  create(payload: ICreateClientPayload): Promise<IClient> {
    const existing = CLIENTS_MOCK_DB.find((client) => client.id === payload.id);
    if (existing) return mockResolve(existing);
    const client: IClient = {
      id: payload.id,
      kind: payload.kind,
      name: payload.name,
      phone: payload.phone,
      identifier: payload.identifier,
      siteIds: [payload.siteId],
      isPendingSync: !navigator.onLine,
    };
    CLIENTS_MOCK_DB.unshift(client);
    CLIENT_RECORDS_MOCK_DB.unshift({
      id: client.id,
      name: client.name,
      kind: client.kind,
      followUp: 'active',
      phone: client.phone,
      identifier: payload.identifier ?? '',
      region: payload.location.city,
      province: payload.location.province,
      address: payload.location.address,
      email: payload.email,
      oilStockKg: 0,
      balance: 0,
      sites: [{ siteId: payload.siteId, siteName: SITES_MOCK.find((site) => site.id === payload.siteId)?.name ?? '', oilStockKg: 0, balance: 0 }],
      history: [],
    });
    return mockResolve(client);
  }
}
