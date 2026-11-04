import { mockResolve } from 'global/services/mock';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { ACCOUNTS_MOCK, EMPTY_ACCOUNT } from 'client/constants/mock-accounts';
import type { IClient, IClientAccount, IClientService, ICreateClientPayload } from 'client/types/client';

export const CLIENTS_MOCK_DB: IClient[] = structuredClone(CLIENTS_MOCK);

export default class ClientMockService implements IClientService {
  getAll(): Promise<IClient[]> {
    return mockResolve(CLIENTS_MOCK_DB);
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
      siteIds: [payload.siteId],
      isPendingSync: !navigator.onLine,
    };
    CLIENTS_MOCK_DB.unshift(client);
    return mockResolve(client);
  }
}
