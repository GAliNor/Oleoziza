import { mockResolve } from 'global/services/mock';
import { SITES_MOCK } from 'global/constants/mock-sites';
import type { ISite, ISiteService } from 'global/types/site';

export default class SiteMockService implements ISiteService {
  getAll(): Promise<ISite[]> {
    return mockResolve([...SITES_MOCK]);
  }
}
