import { mockResolve } from 'global/services/mock';
import { CLIENTS_MOCK } from 'global/constants/mock-clients';
import type { IClient, IClientService, ICreateClientPayload } from 'global/types/client';

export const CLIENTS_MOCK_DB: IClient[] = structuredClone(CLIENTS_MOCK);

export default class ClientMockService implements IClientService {
  getAll(): Promise<IClient[]> {
    return mockResolve(CLIENTS_MOCK_DB);
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
