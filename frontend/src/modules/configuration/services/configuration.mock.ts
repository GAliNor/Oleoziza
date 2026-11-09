import { mockReject, mockResolve } from 'global/services/mock';
import { LOTS_MOCK_DB } from 'lot/services/lot.mock';
import { equipmentInUse } from 'configuration/composables/equipment';
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
    const inUse = equipmentInUse(LOTS_MOCK_DB, siteId);
    if (update.boxes && update.boxes.count < inUse.highestBox) return mockReject(new Error('box_in_use'));
    if (update.tanks && configuration.tanks.some((tank) => inUse.tankIds.has(tank.id) && !update.tanks?.some((kept) => kept.id === tank.id))) return mockReject(new Error('tank_in_use'));
    if (update.pressLines && configuration.pressLines.some((line) => inUse.lineIds.has(line.id) && !update.pressLines?.some((kept) => kept.id === line.id))) return mockReject(new Error('line_in_use'));
    if (update.boxes) {
      Object.assign(configuration, { boxCount: update.boxes.count, boxCapacityKg: update.boxes.capacityKg });
      configuration.history.unshift({ id: update.id, key: 'boxes', value: null, method: null, equipment: { boxCount: update.boxes.count, boxCapacityKg: update.boxes.capacityKg }, by: update.by, at });
    }
    if (update.tanks) {
      configuration.tanks = update.tanks;
      configuration.history.unshift({ id: update.id, key: 'tanks', value: null, method: null, equipment: { tanks: update.tanks }, by: update.by, at });
    }
    if (update.pressLines) {
      configuration.pressLines = update.pressLines;
      configuration.history.unshift({ id: update.id, key: 'pressLines', value: null, method: null, equipment: { pressLines: update.pressLines }, by: update.by, at });
    }
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
