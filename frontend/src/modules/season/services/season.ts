import BaseService, { isMockModule } from 'global/services/base';
import SeasonMockService from 'season/services/season.mock';
import type { ISeason, ISeasonService, SeasonArtVariant } from 'season/types/season';

class SeasonApiService extends BaseService implements ISeasonService {
  private _BASE_API_URL = import.meta.env.VITE_APP_API_BASE_URL + '/site/seasons';

  getAll(): Promise<ISeason[]> {
    return this.request<ISeason[]>({ method: 'GET', url: this._BASE_API_URL });
  }

  prepareNext(): Promise<ISeason> {
    return this.request<ISeason>({ method: 'POST', url: this._BASE_API_URL });
  }

  open(id: string): Promise<ISeason> {
    return this.request<ISeason>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/open` });
  }

  close(id: string): Promise<ISeason> {
    return this.request<ISeason>({ method: 'POST', url: `${this._BASE_API_URL}/${id}/close` });
  }

  uploadIllustration(id: string, variant: SeasonArtVariant, file: File): Promise<ISeason> {
    const data = new FormData();
    data.append('file', file);
    return this.request<ISeason>({ method: 'PUT', url: `${this._BASE_API_URL}/${id}/illustration`, params: { variant }, data, headers: { 'Content-Type': 'multipart/form-data' } });
  }
}

export default isMockModule('season') ? SeasonMockService : SeasonApiService;
