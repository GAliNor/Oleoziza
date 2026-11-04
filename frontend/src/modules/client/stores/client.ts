import { defineStore } from 'pinia';

import ClientService from 'client/services/client';
import { useSyncStore } from 'global/stores/sync';
import { withStatus } from 'global/composables/with-status';
import type { IClient, IClientStore, ICreateClientPayload } from 'client/types/client';

const clientService = new ClientService();

export const useClientStore = defineStore('client', {
  state: (): IClientStore => ({
    clients: [],
    isLoaded: false,
    isLoading: false,
    isSaving: false,
    hasError: false,
  }),
  getters: {
    clientById: (state) => (id: string): IClient | undefined => state.clients.find((client) => client.id === id),
  },
  actions: {
    async fetchClients(isForced = false): Promise<void> {
      if (!isForced && this.isLoaded && !this.hasError) return;
      const clients = await withStatus(this, 'isLoading', () => clientService.getAll(), { errorFlag: 'hasError' });
      if (!clients) return;
      this.clients = clients;
      this.isLoaded = true;
      this.reportPending();
    },
    searchClients(query: string, limit = 6): IClient[] {
      const text = query.trim().toLowerCase();
      const digits = query.replace(/\D/g, '').replace(/^0/, '');
      if (!text) return this.clients.slice(0, limit);
      return this.clients
        .filter((client) => client.name.toLowerCase().includes(text) || (digits.length >= 3 && client.phone.includes(digits)))
        .slice(0, limit);
    },
    async createClient(payload: ICreateClientPayload): Promise<IClient | null> {
      const client = await withStatus(this, 'isSaving', () => clientService.create(payload));
      if (!client) return null;
      this.clients.unshift(client);
      this.reportPending();
      return client;
    },
    reportPending(): void {
      useSyncStore().setPending('clients', this.clients.filter((client) => client.isPendingSync).length);
    },
  },
});
