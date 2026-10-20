import { mockReject, mockResolve } from 'global/services/mock';
import { SITES_MOCK } from 'global/constants/mock-sites';
import type { ISite } from 'global/types/site';
import type { ISiteAdminService, ISiteForm } from 'site/types/site';

export default class SiteAdminMockService implements ISiteAdminService {
  create(form: ISiteForm): Promise<ISite> {
    const site: ISite = { id: crypto.randomUUID(), ...form };
    SITES_MOCK.push(site);
    return mockResolve(site);
  }

  update(id: string, form: ISiteForm): Promise<ISite> {
    const site = SITES_MOCK.find((candidate) => candidate.id === id);
    if (!site) return mockReject(new Error('site_not_found'));
    Object.assign(site, form);
    return mockResolve(site);
  }
}
