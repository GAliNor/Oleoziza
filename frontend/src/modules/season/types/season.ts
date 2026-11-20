export type SeasonStatus = 'planned' | 'open' | 'closed';

export interface ISeason {
  id: string;
  code: string;
  label: string;
  startsOn: string;
  endsOn: string | null;
  status: SeasonStatus;
  closedAt: string | null;
  seasonIllustrationId: string | null;
  illustrationUrl: string | null;
  illustrationDarkUrl: string | null;
}

export interface ISeasonIllustration {
  id: string;
  code: string;
  illustrationUrl: string;
  illustrationDarkUrl: string;
}

export type SeasonArtImages = Pick<ISeason, 'code' | 'illustrationUrl' | 'illustrationDarkUrl'>;

export interface ISeasonService {
  getAll(): Promise<ISeason[]>;
  getIllustrations(): Promise<ISeasonIllustration[]>;
  prepareNext(seasonIllustrationId: string | null): Promise<ISeason>;
  open(id: string): Promise<ISeason>;
  close(id: string): Promise<ISeason>;
  chooseIllustration(id: string, seasonIllustrationId: string | null): Promise<ISeason>;
}

export interface ISeasonStore {
  seasons: ISeason[];
  illustrations: ISeasonIllustration[];
  isLoading: boolean;
  isLoadingIllustrations: boolean;
  isSaving: boolean;
  hasError: boolean;
  hasIllustrationsError: boolean;
}
