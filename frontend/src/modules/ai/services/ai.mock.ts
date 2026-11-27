import { mockResolve } from 'global/services/mock';
import type { AiCallFeature, AiFeature, IAiCall, IAiConnectionTest, IAiFeatureSetting, IAiProvider, IAiService, IAiSettings, IAiUsage, IAiUsageQuery } from 'ai/types/ai';

const SETTINGS: IAiSettings = {
  providers: [{ id: 'provider-openai', kind: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', hasKey: false, keyLastFour: null, monthlyBudgetUsd: 20, spentThisMonthUsd: 0.42 }],
  models: [
    { id: 'model-luna', providerId: 'provider-openai', name: 'gpt-6-luna', inputPricePerMillion: 0.1, outputPricePerMillion: 0.5, isArchived: false },
    { id: 'model-transcribe', providerId: 'provider-openai', name: 'gpt-transcribe', inputPricePerMillion: 0, outputPricePerMillion: 0, isArchived: false },
  ],
  features: [
    { feature: 'assistant', modelId: 'model-luna', payloadRetentionDays: 30 },
    { feature: 'assistant_transcription', modelId: 'model-transcribe', payloadRetentionDays: 30 },
  ],
  hasSecretsKey: true,
};

const MEMBERS = ['Mohammed Taibi', 'Omar Taibi'];
const FEATURES: AiCallFeature[] = ['assistant', 'assistant', 'assistant', 'assistant_transcription'];
const CALLS: IAiCall[] = Array.from({ length: 37 }, (_, index) => {
  const feature = FEATURES[index % FEATURES.length];
  const isFailed = index % 11 === 5;
  return {
    id: `call-${index}`,
    createdAt: new Date(Date.now() - index * 3_600_000 * 5).toISOString(),
    feature,
    status: isFailed ? 'failed' : 'succeeded',
    userName: MEMBERS[index % MEMBERS.length],
    providerLabel: 'OpenAI',
    modelName: feature === 'assistant' ? 'gpt-6-luna' : 'gpt-transcribe',
    inputTokens: feature === 'assistant' ? 2400 + index * 13 : 0,
    outputTokens: feature === 'assistant' ? 380 + index * 7 : 0,
    costUsd: isFailed ? 0 : feature === 'assistant' ? 0.0012 + index / 100_000 : 0.0045,
    durationInMilliseconds: 900 + index * 40,
    errorCode: isFailed ? 'ai_provider_timeout' : null,
  };
});
const total = (calls: IAiCall[], key: (call: IAiCall) => string) =>
  [...new Set(calls.map(key))].map((value) => {
    const matching = calls.filter((call) => key(call) === value);
    return { key: value, label: value, callCount: matching.length, costUsd: matching.reduce((sum, call) => sum + call.costUsd, 0) };
  });

export default class AiMockService implements IAiService {
  getSettings(): Promise<IAiSettings> {
    return mockResolve(SETTINGS);
  }

  getUsage(query: IAiUsageQuery): Promise<IAiUsage> {
    const isCurrent = query.month === new Date().toISOString().slice(0, 7);
    const monthCalls = isCurrent ? CALLS : CALLS.slice(0, 12);
    const calls = monthCalls.filter((call) => !query.feature || call.feature === query.feature);
    const spentUsd = monthCalls.reduce((sum, call) => sum + call.costUsd, 0);
    return mockResolve({
      month: query.month,
      budgets: [{ providerId: 'provider-openai', label: 'OpenAI', monthlyBudgetUsd: SETTINGS.providers[0].monthlyBudgetUsd, spentUsd, reservedUsd: 0 }],
      byFeature: total(monthCalls, (call) => call.feature),
      byMember: total(monthCalls, (call) => call.userName ?? ''),
      calls: calls.slice(query.offset, query.offset + query.limit),
      total: calls.length,
    });
  }

  setKey(_providerId: string, apiKey: string): Promise<IAiProvider> {
    Object.assign(SETTINGS.providers[0], { hasKey: true, keyLastFour: apiKey.slice(-4) });
    return mockResolve(SETTINGS.providers[0]);
  }

  removeKey(): Promise<IAiProvider> {
    Object.assign(SETTINGS.providers[0], { hasKey: false, keyLastFour: null });
    return mockResolve(SETTINGS.providers[0]);
  }

  setBudget(_providerId: string, monthlyBudgetUsd: number): Promise<IAiProvider> {
    SETTINGS.providers[0].monthlyBudgetUsd = monthlyBudgetUsd;
    return mockResolve(SETTINGS.providers[0]);
  }

  setFeatureModel(feature: AiFeature, modelId: string, payloadRetentionDays: number | null): Promise<IAiFeatureSetting> {
    const setting = SETTINGS.features.find((item) => item.feature === feature)!;
    Object.assign(setting, { modelId, payloadRetentionDays });
    return mockResolve(setting);
  }

  testModel(): Promise<IAiConnectionTest> {
    return mockResolve({ isOk: SETTINGS.providers[0].hasKey, code: SETTINGS.providers[0].hasKey ? null : 'ai_provider_key_missing' });
  }
}
