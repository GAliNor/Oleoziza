import BaseService, { isMockModule } from 'global/services/base';
import TerritoryMockService from 'territory/services/territory.mock';
import type { IProvince, ITerritoryService } from 'territory/types/territory';

class TerritoryApiService extends BaseService implements ITerritoryService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/territory`;

  getProvinces(): Promise<IProvince[]> {
    return this.request<IProvince[]>({ method: 'GET', url: `${this._BASE_API_URL}/provinces` });
  }
}

export default isMockModule('territory') ? TerritoryMockService : TerritoryApiService;
