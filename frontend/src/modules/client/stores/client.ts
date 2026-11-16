import { defineStore } from 'pinia';

import ClientService from 'client/services/client';
import { outbox } from 'global/services/app-outbox';
import { withStatus } from 'global/composables/with-status';
import { EMPTY_ACCOUNT } from 'client/constants/mock-accounts';
import type { IClient, IClientContact, IClientAccount, IClientRecord, IClientStore, ICreateClientPayload } from 'client/types/client';

const clientService = new ClientService();

export const CLIENT_CREATE_WRITE = 'client.create';

outbox.register(CLIENT_CREATE_WRITE, async (payload) => {
  const client = await clientService.create(payload as ICreateClientPayload);
  useClientStore().keepCreated(client);
});

export const useClientStore = defineStore('client', {
  state: (): IClientStore => ({
    clients: [],
    accounts: {},
    records: [],
    histories: {},
    isLoaded: false,
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  getters: {
    clientById: (state) => (id: string): IClient | undefined => state.clients.find((client) => client.id === id),
    clientByIdentifier: (state) => (identifier: string): IClient | undefined => state.clients.find((client) => client.identifier === identifier),
    recordById: (state) => (id: string): IClientRecord | undefined => state.records.find((record) => record.id === id),
    accountOf: (state) => (clientId: string): IClientAccount => state.accounts[clientId] ?? EMPTY_ACCOUNT,
  },
  actions: {
    async fetchClients(isForced = false): Promise<void> {
      if (!isForced && this.isLoaded && !this.hasError) return;
      const clients = await withStatus(this, 'isLoading', () => clientService.getAll(), { errorFlag: 'hasError' });
      if (!clients) return;
      this.clients = clients;
      this.isLoaded = true;
    },
    async fetchRecords(): Promise<void> {
      if (this.records.length) return;
      const records = await withStatus(this, 'isLoading', () => clientService.getRecords(), { errorFlag: 'hasError' });
      if (records) this.records = records;
    },
    async fetchAccount(clientId: string): Promise<void> {
      if (this.accounts[clientId]) return;
      this.accounts[clientId] = await clientService.getAccount(clientId);
    },
    searchClients(query: string, limit = 6): IClient[] {
      const text = query.trim().toLowerCase();
      const digits = query.replace(/\D/g, '').replace(/^0/, '');
      if (!text) return this.clients.slice(0, limit);
      return this.clients
        .filter((client) => client.name.toLowerCase().includes(text) || (digits.length >= 3 && client.phone.includes(digits)))
        .slice(0, limit);
    },
    /** Works offline: the Client appears at once, marked pending, and the outbox sends it; the server's answer replaces it. */
    async createClient(payload: ICreateClientPayload): Promise<IClient> {
      const client: IClient = { id: payload.id, kind: payload.kind, name: payload.name, phone: payload.phone, email: payload.email, identifier: payload.identifier, creditDh: 0, siteIds: [payload.siteId], isPendingSync: true };
      this.clients = [client, ...this.clients.filter((item) => item.id !== client.id)];
      this.records = [];
      await outbox.enqueue(CLIENT_CREATE_WRITE, payload.id, payload.id, payload);
      return client;
    },
    keepCreated(client: IClient): void {
      const index = this.clients.findIndex((item) => item.id === client.id);
      const synced = { ...client, isPendingSync: false };
      if (index === -1) this.clients.unshift(synced);
      else this.clients.splice(index, 1, synced);
      this.records = [];
    },
    /** Past Lots of a Client on one Site, across Seasons; loaded once per Client and Site. */
    async fetchHistory(clientId: string, siteId: string): Promise<void> {
      const key = `${clientId}:${siteId}`;
      if (this.histories[key]) return;
      const lines = await withStatus(this, 'isLoading', () => clientService.getHistory(clientId, siteId));
      if (lines) this.histories[key] = lines;
    },
    async updateContact(clientId: string, contact: IClientContact): Promise<IClient | null> {
      const updated = await withStatus(this, 'isSaving', () => clientService.updateContact(clientId, contact));
      if (!updated) return null;
      const index = this.clients.findIndex((client) => client.id === clientId);
      if (index !== -1) this.clients.splice(index, 1, updated);
      this.records = [];
      return updated;
    },
  },
});
