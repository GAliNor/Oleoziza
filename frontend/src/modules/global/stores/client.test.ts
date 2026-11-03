import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useClientStore } from 'global/stores/client';
import type { IClient } from 'global/types/client';

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
