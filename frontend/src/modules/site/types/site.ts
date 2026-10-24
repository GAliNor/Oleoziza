import type { ISite } from 'global/types/site';

export interface ISiteForm {
  name: string;
  city: string;
}

export interface ISiteAdminService {
  create(form: ISiteForm): Promise<ISite>;
  update(id: string, form: ISiteForm): Promise<ISite>;
  delete(id: string): Promise<void>;
}

export interface ISiteAdminStore {
  isSaving: boolean;
  hasError: boolean;
}
