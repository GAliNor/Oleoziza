export type AiFeature = 'assistant' | 'assistant_transcription';

export type AiCallFeature = AiFeature | 'connection_test';

export type AiCallStatus = 'reserved' | 'succeeded' | 'failed' | 'refused';

export type AiTab = 'monitoring' | 'access' | 'models';

export interface IAiProvider {
  id: string;
  kind: string;
  label: string;
  baseUrl: string;
  hasKey: boolean;
  keyLastFour: string | null;
  monthlyBudgetUsd: number;
  spentThisMonthUsd: number;
}

export interface IAiModel {
  id: string;
  providerId: string;
  name: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  isArchived: boolean;
}

export interface IAiFeatureSetting {
  feature: AiFeature;
  modelId: string | null;
  payloadRetentionDays: number | null;
}

export interface IAiSettings {
  providers: IAiProvider[];
  models: IAiModel[];
  features: IAiFeatureSetting[];
  hasSecretsKey: boolean;
}

export interface IAiUsageTotal {
  key: string;
  label: string;
  callCount: number;
  costUsd: number;
}

export interface IAiProviderBudget {
  providerId: string;
  label: string;
  monthlyBudgetUsd: number;
  spentUsd: number;
  reservedUsd: number;
}

export interface IAiCall {
  id: string;
  createdAt: string;
  feature: AiCallFeature;
  status: AiCallStatus;
  userName: string | null;
  providerLabel: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationInMilliseconds: number | null;
  errorCode: string | null;
}

export interface IAiUsage {
  month: string;
  budgets: IAiProviderBudget[];
  byFeature: IAiUsageTotal[];
  byMember: IAiUsageTotal[];
  calls: IAiCall[];
  total: number;
}

export interface IAiUsageQuery {
  month: string;
  feature: AiCallFeature | null;
  offset: number;
  limit: number;
}

export interface IAiConnectionTest {
  isOk: boolean;
  code: string | null;
}

export interface IAiService {
  getSettings(): Promise<IAiSettings>;
  getUsage(query: IAiUsageQuery): Promise<IAiUsage>;
  setKey(providerId: string, apiKey: string, testModelId: string): Promise<IAiProvider>;
  removeKey(providerId: string): Promise<IAiProvider>;
  setBudget(providerId: string, monthlyBudgetUsd: number): Promise<IAiProvider>;
  testModel(modelId: string): Promise<IAiConnectionTest>;
  setFeatureModel(feature: AiFeature, modelId: string, payloadRetentionDays: number | null): Promise<IAiFeatureSetting>;
}

export interface IAiStore {
  settings: IAiSettings | null;
  usage: IAiUsage | null;
  usageQuery: Omit<IAiUsageQuery, 'offset' | 'limit'>;
  isLoading: boolean;
  isUsageLoading: boolean;
  hasError: boolean;
  hasUsageError: boolean;
  isSaving: boolean;
  errorCode: string | null;
  testedModels: Record<string, IAiConnectionTest>;
}
