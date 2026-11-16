import { mockReject, mockResolve } from 'global/services/mock';
import { createId } from 'global/composables/crypto';
import { SITES_MOCK } from 'site/constants/mock-sites';
import type { ISite, ISiteForm, ISiteService } from 'site/types/site';

const fromForm = (form: ISiteForm): Omit<ISite, 'id' | 'code' | 'status'> => ({
  name: form.name,
  province: form.location.province ?? 'oujda-angad',
  city: form.location.city,
  address: form.location.address,
  phone: form.phone,
});

/** Seeded Sites hold records, as in the backend, so only a Site created in the session can be deleted. */
const SEEDED_IDS = new Set(SITES_MOCK.map((site) => site.id));

export default class SiteMockService implements ISiteService {
  getAll(): Promise<ISite[]> {
    return mockResolve([...SITES_MOCK]);
  }

  create(form: ISiteForm): Promise<ISite> {
    if (SITES_MOCK.some((site) => site.code === form.code)) return mockReject({ code: 'code_taken' });
    const site: ISite = { id: createId(), code: form.code, status: 'active', ...fromForm(form) };
    SITES_MOCK.push(site);
    return mockResolve({ ...site });
  }

  update(id: string, form: ISiteForm): Promise<ISite> {
    const site = SITES_MOCK.find((candidate) => candidate.id === id);
    if (!site) return mockReject({ code: 'site_not_found' });
    Object.assign(site, fromForm(form));
    return mockResolve({ ...site });
  }

  delete(id: string): Promise<void> {
    const index = SITES_MOCK.findIndex((candidate) => candidate.id === id);
    if (index === -1) return mockReject({ code: 'site_not_found' });
    if (SEEDED_IDS.has(id)) return mockReject({ code: 'site_has_records' });
    SITES_MOCK.splice(index, 1);
    return mockResolve(undefined);
  }
}
