export type SeasonStatus = 'planned' | 'open' | 'closed';

export type SeasonArtVariant = 'light' | 'dark';

export interface ISeason {
  id: string;
  code: string;
  label: string;
  startsOn: string;
  endsOn: string | null;
  status: SeasonStatus;
  closedAt: string | null;
  illustrationUrl: string | null;
  illustrationDarkUrl: string | null;
}

export interface ISeasonService {
  getAll(): Promise<ISeason[]>;
  prepareNext(): Promise<ISeason>;
  open(id: string): Promise<ISeason>;
  close(id: string): Promise<ISeason>;
  uploadIllustration(id: string, variant: SeasonArtVariant, file: File): Promise<ISeason>;
}

export interface ISeasonStore {
  seasons: ISeason[];
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
