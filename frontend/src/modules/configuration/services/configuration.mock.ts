import { mockResolve } from 'global/services/mock';
import { CONFIGURATIONS_MOCK, DEFAULT_CONFIGURATION } from 'configuration/constants/mock-configuration';
import type { ConfigurationValueKey, IConfiguration, IConfigurationService, IConfigurationUpdatePayload } from 'configuration/types/configuration';

const configurations: Record<string, IConfiguration> = structuredClone(CONFIGURATIONS_MOCK);

/** A Site's configuration in the mock database, read by the other mock services too. */
export const configurationOf = (siteId: string): IConfiguration =>
  configurations[siteId] ?? (configurations[siteId] = { ...structuredClone(DEFAULT_CONFIGURATION), siteId });

const applyValue = (configuration: IConfiguration, key: ConfigurationValueKey, amount: number): void => {
  configuration[key] = amount;
};

export default class ConfigurationMockService implements IConfigurationService {
  getOne(siteId: string): Promise<IConfiguration> {
    return mockResolve(configurationOf(siteId));
  }

  update(siteId: string, update: IConfigurationUpdatePayload): Promise<IConfiguration> {
    const configuration = configurationOf(siteId);
    if (configuration.history.some((change) => change.id === update.id)) return mockResolve(configuration);
    const at = new Date().toISOString();
    if (update.value) {
      applyValue(configuration, update.value.key, update.value.amount);
      configuration.history.unshift({ id: update.id, key: update.value.key, value: update.value.amount, method: null, by: update.by, at });
    }
    if (update.method) {
      const { key, isEnabled, needsProof } = update.method;
      configuration.methods = configuration.methods.map((method) => (method.key === key ? { key, isEnabled, needsProof } : method));
      configuration.history.unshift({ id: update.id, key, value: null, method: { isEnabled, needsProof }, by: update.by, at });
    }
    return mockResolve(configuration);
  }
}
