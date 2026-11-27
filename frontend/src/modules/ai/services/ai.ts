import BaseService, { isMockModule } from 'global/services/base';
import AiMockService from 'ai/services/ai.mock';
import type { AiFeature, IAiConnectionTest, IAiFeatureSetting, IAiProvider, IAiService, IAiSettings, IAiUsage, IAiUsageQuery } from 'ai/types/ai';

class AiApiService extends BaseService implements IAiService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/ai`;

  getSettings(): Promise<IAiSettings> {
    return this.request({ method: 'GET', url: `${this._BASE_API_URL}/settings` });
  }

  /** A month's budgets and totals per AI Feature and per User, with one page of its calls. */
  getUsage(query: IAiUsageQuery): Promise<IAiUsage> {
    return this.request({ method: 'GET', url: `${this._BASE_API_URL}/usage`, params: { month: query.month, feature: query.feature ?? undefined, offset: query.offset, limit: query.limit } });
  }

  setKey(providerId: string, apiKey: string, testModelId: string): Promise<IAiProvider> {
    return this.request({ method: 'PUT', url: `${this._BASE_API_URL}/providers/${providerId}/key`, data: { apiKey, testModelId } });
  }

  removeKey(providerId: string): Promise<IAiProvider> {
    return this.request({ method: 'DELETE', url: `${this._BASE_API_URL}/providers/${providerId}/key` });
  }

  setBudget(providerId: string, monthlyBudgetUsd: number): Promise<IAiProvider> {
    return this.request({ method: 'PUT', url: `${this._BASE_API_URL}/providers/${providerId}/budget`, data: { monthlyBudgetUsd } });
  }

  testModel(modelId: string): Promise<IAiConnectionTest> {
    return this.request({ method: 'POST', url: `${this._BASE_API_URL}/models/${modelId}/test` });
  }

  setFeatureModel(feature: AiFeature, modelId: string, payloadRetentionDays: number | null): Promise<IAiFeatureSetting> {
    return this.request({ method: 'PUT', url: `${this._BASE_API_URL}/features/${feature}`, data: { modelId, payloadRetentionDays } });
  }
}

export default isMockModule('ai') ? AiMockService : AiApiService;
