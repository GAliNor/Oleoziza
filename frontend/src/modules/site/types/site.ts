import type { ILocation, ProvinceId } from 'territory/types/territory';

export type SiteStatus = 'active' | 'closed';

export interface ISite {
  id: string;
  /** Two letters, prefix of every human code (`OJ`); never changes. */
  code: string;
  name: string;
  province: ProvinceId;
  city: string;
  address: string;
  phone: string | null;
  status: SiteStatus;
}

export interface ISiteForm {
  code: string;
  name: string;
  location: ILocation;
  phone: string | null;
}

export interface ISiteService {
  getAll(): Promise<ISite[]>;
  create(form: ISiteForm): Promise<ISite>;
  update(id: string, form: ISiteForm): Promise<ISite>;
  delete(id: string): Promise<void>;
}

export interface ISiteStore {
  sites: ISite[];
  currentSiteId: string | null;
  loadedForUserId: string | null;
  isLoading: boolean;
  hasError: boolean;
  isSaving: boolean;
  hasSaveError: boolean;
  /** Why the last save or delete was refused (`code_taken`, `site_has_records`), for the form to say. */
  saveErrorCode: string | null;
}
