import { defineStore } from 'pinia';

import AiService from 'ai/services/ai';
import { cachedLoad, invalidateLoads, LOAD_TTL_MS } from 'global/composables/cached-load';
import { withStatus } from 'global/composables/with-status';
import { PAGE_SIZE } from 'global/constants/page';
import type { AiCallFeature, AiFeature, IAiProvider, IAiStore } from 'ai/types/ai';

const aiService = new AiService();

const currentMonth = (): string => new Date().toISOString().slice(0, 7);
let usageGeneration = 0;

export const useAiStore = defineStore('ai', {
  state: (): IAiStore => ({
    settings: null,
    usage: null,
    usageQuery: { month: currentMonth(), feature: null },
    isLoading: false,
    isUsageLoading: false,
    hasError: false,
    hasUsageError: false,
    isSaving: false,
    errorCode: null,
    testedModels: {},
  }),
  getters: {
    provider: (state): IAiProvider | null => state.settings?.providers[0] ?? null,
    isCurrentMonth: (state): boolean => state.usageQuery.month >= currentMonth(),
  },
  actions: {
    /** The provider, models and AI Feature settings every tab reads. */
    async fetchSettings(): Promise<void> {
      await cachedLoad('ai:settings', LOAD_TTL_MS.records, async () => {
        const settings = await withStatus(this, 'isLoading', () => aiService.getSettings(), { errorFlag: 'hasError' });
        if (!settings) return false;
        this.settings = settings;
        return true;
      });
    },
    /** One page of the chosen month's calls, with its budgets and totals; `isMore` appends the next page. */
    async fetchUsage(isMore = false): Promise<void> {
      if (isMore && this.isUsageLoading) return;
      usageGeneration += 1;
      const generation = usageGeneration;
      const offset = isMore ? (this.usage?.calls.length ?? 0) : 0;
      const usage = await withStatus(this, 'isUsageLoading', () => aiService.getUsage({ ...this.usageQuery, offset, limit: PAGE_SIZE }), { errorFlag: 'hasUsageError' });
      if (!usage || generation !== usageGeneration) return;
      this.usage = isMore && this.usage ? { ...usage, calls: [...this.usage.calls, ...usage.calls] } : usage;
    },
    shiftMonth(step: number): void {
      const [year, month] = this.usageQuery.month.split('-').map(Number);
      const moved = new Date(Date.UTC(year, month - 1 + step, 1));
      this.usageQuery = { ...this.usageQuery, month: moved.toISOString().slice(0, 7) };
      void this.fetchUsage();
    },
    filterFeature(feature: AiCallFeature | null): void {
      this.usageQuery = { ...this.usageQuery, feature };
      void this.fetchUsage();
    },
    keepProvider(provider: IAiProvider): void {
      if (this.settings) this.settings.providers = this.settings.providers.map((item) => (item.id === provider.id ? provider : item));
      invalidateLoads('ai:');
    },
    /** The key is saved only once a test call with it passes; the refusal code says why otherwise. */
    async saveKey(apiKey: string): Promise<boolean> {
      const provider = this.provider;
      const testModelId = this.settings?.features.find((item) => item.feature === 'assistant')?.modelId;
      if (!provider || !testModelId) return false;
      const saved = await withStatus(this, 'isSaving', () => aiService.setKey(provider.id, apiKey, testModelId), { errorCode: 'errorCode' });
      if (saved) this.keepProvider(saved);
      return Boolean(saved);
    },
    async removeKey(): Promise<void> {
      if (!this.provider) return;
      const saved = await withStatus(this, 'isSaving', () => aiService.removeKey(this.provider!.id), { errorCode: 'errorCode' });
      if (saved) this.keepProvider(saved);
    },
    async saveBudget(monthlyBudgetUsd: number): Promise<boolean> {
      if (!this.provider) return false;
      const saved = await withStatus(this, 'isSaving', () => aiService.setBudget(this.provider!.id, monthlyBudgetUsd), { errorCode: 'errorCode' });
      if (saved) this.keepProvider(saved);
      return Boolean(saved);
    },
    /** Points an AI Feature at another model; the backend tests the model first. */
    async saveFeatureModel(feature: AiFeature, modelId: string): Promise<boolean> {
      const current = this.settings?.features.find((item) => item.feature === feature);
      const saved = await withStatus(this, 'isSaving', () => aiService.setFeatureModel(feature, modelId, current?.payloadRetentionDays ?? null), { errorCode: 'errorCode' });
      if (saved && this.settings) this.settings.features = this.settings.features.map((item) => (item.feature === feature ? { ...item, modelId: saved.modelId } : item));
      if (saved) invalidateLoads('ai:');
      return Boolean(saved);
    },
    async testModel(modelId: string): Promise<void> {
      const result = await withStatus(this, 'isSaving', () => aiService.testModel(modelId));
      if (result) this.testedModels = { ...this.testedModels, [modelId]: result };
      invalidateLoads('ai:');
    },
  },
});
