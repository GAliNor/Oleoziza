import { defineStore } from 'pinia';

import ClientService from 'global/services/client';
import { useSyncStore } from 'global/stores/sync';
import { createId } from 'global/composables/crypto';
import type { ClientKind, IClient, IClientStore } from 'global/types/client';

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
      this.isLoading = true;
      this.hasError = false;
      try {
        this.clients = await clientService.getAll();
        this.isLoaded = true;
        this.reportPending();
      } catch (error) {
        this.hasError = true;
        console.error(error);
      } finally {
        this.isLoading = false;
      }
    },
    searchClients(query: string, limit = 6): IClient[] {
      const text = query.trim().toLowerCase();
      const digits = query.replace(/\D/g, '').replace(/^0/, '');
      if (!text) return this.clients.slice(0, limit);
      return this.clients
        .filter((client) => client.name.toLowerCase().includes(text) || (digits.length >= 3 && client.phone.includes(digits)))
        .slice(0, limit);
    },
    async createClient(kind: ClientKind, name: string, phone: string, siteId: string): Promise<IClient | null> {
      this.isSaving = true;
      try {
        const client = await clientService.create({ id: createId(), kind, name, phone, siteId });
        this.clients.unshift(client);
        this.reportPending();
        return client;
      } catch (error) {
        console.error(error);
        return null;
      } finally {
        this.isSaving = false;
      }
    },
    reportPending(): void {
      useSyncStore().setPending('clients', this.clients.filter((client) => client.isPendingSync).length);
    },
  },
});
