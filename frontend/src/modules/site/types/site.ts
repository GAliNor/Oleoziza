export interface ISite {
  id: string;
  name: string;
  city: string;
}

export interface ISiteForm {
  name: string;
  city: string;
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
}
