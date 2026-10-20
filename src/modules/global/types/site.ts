export interface ISite {
  id: string;
  name: string;
  city: string;
}

export interface ISiteService {
  getAll(): Promise<ISite[]>;
}

export interface ISiteStore {
  sites: ISite[];
  currentSiteId: string | null;
  isLoading: boolean;
  hasError: boolean;
}
