import { mockReject, mockResolve } from 'global/services/mock';
import { createId } from 'global/composables/crypto';
import { SITES_MOCK } from 'site/constants/mock-sites';
import type { ISite, ISiteForm, ISiteService } from 'site/types/site';

export default class SiteMockService implements ISiteService {
  getAll(): Promise<ISite[]> {
    return mockResolve([...SITES_MOCK]);
  }

  create(form: ISiteForm): Promise<ISite> {
    const site: ISite = { id: createId(), ...form };
    SITES_MOCK.push(site);
    return mockResolve(site);
  }

  update(id: string, form: ISiteForm): Promise<ISite> {
    const site = SITES_MOCK.find((candidate) => candidate.id === id);
    if (!site) return mockReject(new Error('site_not_found'));
    Object.assign(site, form);
    return mockResolve(site);
  }

  delete(id: string): Promise<void> {
    const index = SITES_MOCK.findIndex((candidate) => candidate.id === id);
    if (index === -1) return mockReject(new Error('site_not_found'));
    SITES_MOCK.splice(index, 1);
    return mockResolve(undefined);
  }
}
