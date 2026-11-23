import BaseService, { isMockModule } from 'global/services/base';
import SeasonMockService from 'season/services/season.mock';
import type { ISeason, ISeasonIllustration, ISeasonService } from 'season/types/season';

class SeasonApiService extends BaseService implements ISeasonService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/site/seasons';
  private _ILLUSTRATIONS_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/site/season-illustrations';

  getAll(): Promise<ISeason[]> {
    return this.request<ISeason[]>({ method: 'GET', url: this._BASE_API_URL });
  }

  getIllustrations(): Promise<ISeasonIllustration[]> {
    return this.request<ISeasonIllustration[]>({ method: 'GET', url: this._ILLUSTRATIONS_API_URL });
  }

  prepareNext(seasonIllustrationId: string | null): Promise<ISeason> {
    return this.request<ISeason>({ method: 'POST', url: this._BASE_API_URL, data: { seasonIllustrationId } });
  }

  open(id: string): Promise<ISeason> {
    return this.request<ISeason>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/open` });
  }

  close(id: string): Promise<ISeason> {
    return this.request<ISeason>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/close` });
  }

  reopen(id: string): Promise<ISeason> {
    return this.request<ISeason>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/reopen` });
  }

  delete(id: string): Promise<void> {
    return this.request<void>({ method: 'DELETE', url: `${this._BASE_API_URL}/${id}` });
  }

  setDates(id: string, startsOn: string, endsOn: string): Promise<ISeason> {
    return this.request<ISeason>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/dates`, data: { startsOn, endsOn } });
  }

  chooseIllustration(id: string, seasonIllustrationId: string | null): Promise<ISeason> {
    return this.request<ISeason>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/season-illustration`, data: { seasonIllustrationId } });
  }
}

export default isMockModule('season') ? SeasonMockService : SeasonApiService;
