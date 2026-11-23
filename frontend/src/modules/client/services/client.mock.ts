import { buildClientName } from 'client/composables/client-name';
import { mockReject, mockResolve } from 'global/services/mock';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { ACCOUNTS_MOCK, EMPTY_ACCOUNT } from 'client/constants/mock-accounts';
import { CLIENT_RECORDS_MOCK } from 'client/constants/mock-client-records';
import { SITES_MOCK } from 'site/constants/mock-sites';
import type { IClient, IClientAccount, IClientContact, IClientLotLine, IClientRecord, IClientService, ICreateClientPayload } from 'client/types/client';

export const CLIENTS_MOCK_DB: IClient[] = structuredClone(CLIENTS_MOCK).map((client) => ({
  ...client,
  identifier: CLIENT_RECORDS_MOCK.find((record) => record.id === client.id)?.identifier ?? null,
  email: CLIENT_RECORDS_MOCK.find((record) => record.id === client.id)?.email ?? null,
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
      name: buildClientName(payload),
      firstName: payload.firstName,
      lastName: payload.lastName,
      legalName: payload.legalName,
      phone: payload.phone,
      email: payload.email,
      identifier: payload.identifier,
      creditDh: 0,
      siteIds: [payload.siteId],
      isPendingSync: false,
    };
    CLIENTS_MOCK_DB.unshift(client);
    CLIENT_RECORDS_MOCK_DB.unshift({
      id: client.id,
      name: client.name,
      kind: client.kind,
      followUp: 'active',
      phone: client.phone,
      identifier: payload.identifier ?? '',
      region: payload.location?.city ?? '',
      province: payload.location?.province ?? null,
      address: payload.location?.address || null,
      email: payload.email,
      oilStockLitres: 0,
      balance: 0,
      sites: [{ siteId: payload.siteId, siteName: SITES_MOCK.find((site) => site.id === payload.siteId)?.name ?? '', oilStockLitres: 0, balance: 0 }],
      history: [],
    });
    return mockResolve(client);
  }

  getHistory(clientId: string, siteId: string): Promise<IClientLotLine[]> {
    return mockResolve(CLIENT_RECORDS_MOCK_DB.find((record) => record.id === clientId)?.history.filter((lot) => lot.siteId === siteId) ?? []);
  }

  updateContact(clientId: string, contact: IClientContact): Promise<IClient> {
    const client = CLIENTS_MOCK_DB.find((item) => item.id === clientId);
    if (!client) return mockReject(new Error('client_not_found'));
    const { location, ...fields } = contact;
    Object.assign(client, fields);
    const record = CLIENT_RECORDS_MOCK_DB.find((item) => item.id === clientId);
    if (record) Object.assign(record, fields, location ? { province: location.province, region: location.city, address: location.address || null } : {});
    return mockResolve(client);
  }
}
