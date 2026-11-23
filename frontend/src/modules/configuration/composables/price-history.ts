import type { ConfigurationValueKey, IPriceChange } from 'configuration/types/configuration';

/** One price's versions, the one in force first; a version still to come leads, since it will replace it. */
export const priceHistory = (changes: readonly IPriceChange[], key: ConfigurationValueKey): IPriceChange[] =>
  changes.filter((change) => change.key === key).sort((first, second) => second.effectiveFrom.localeCompare(first.effectiveFrom));

/** The version in force: the latest one already started. */
export const priceInForce = (changes: readonly IPriceChange[], key: ConfigurationValueKey): IPriceChange | undefined => priceHistory(changes, key).find((change) => !change.isScheduled);
