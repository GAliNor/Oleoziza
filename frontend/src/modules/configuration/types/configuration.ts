import type { PaymentMethodKey } from 'finance/types/finance';
import type { SeasonStatus } from 'season/types/season';

export type ConfigurationValueKey = 'millingRate' | 'discountLimit' | 'oilPrice';

export interface IPaymentMethodSetting {
  key: PaymentMethodKey;
  isEnabled: boolean;
  needsProof: boolean;
}

/** A numbered Tank of the Site, with its capacity. */
export interface ITankSetting {
  id: string;
  number: number;
  capacityLitres: number;
}

/** A numbered Press Line of the Site, with an optional name. */
export interface IPressLineSetting {
  id: string;
  number: number;
  name: string;
}

export type EquipmentKey = 'boxes' | 'tanks' | 'pressLines';

/** What a Site's Boxes, Tanks or Press Lines became after one change. */
export interface IEquipmentSnapshot {
  boxCount?: number;
  boxCapacityKg?: number;
  tanks?: ITankSetting[];
  pressLines?: IPressLineSetting[];
}

export interface IConfigurationValues {
  millingRate: number;
  discountLimit: number;
  oilPrice: number;
}

/** One change, kept for good: a value of a setting, or how a Payment Method is set. */
export interface IConfigurationChange {
  id: string;
  key: ConfigurationValueKey | PaymentMethodKey | EquipmentKey;
  value: number | null;
  method: Omit<IPaymentMethodSetting, 'key'> | null;
  equipment?: IEquipmentSnapshot;
  by: string;
  at: string;
}

export interface IPriceChange {
  id: string;
  key: ConfigurationValueKey;
  value: number;
  effectiveFrom: string;
  by: string;
  isScheduled: boolean;
}

export interface IConfiguration extends IConfigurationValues {
  siteId: string;
  seasonId: string;
  seasonLabel: string;
  seasonStatus: SeasonStatus;
  priceChanges: IPriceChange[];
  methods: IPaymentMethodSetting[];
  boxCount: number;
  boxCapacityKg: number;
  tanks: ITankSetting[];
  pressLines: IPressLineSetting[];
  history: IConfigurationChange[];
}

/** `id` is minted when the change starts, so a retry after a lost response never records it twice. */
export interface IConfigurationUpdate {
  id: string;
  seasonId?: string;
  value?: { key: ConfigurationValueKey; amount: number; effectiveOn?: string };
  method?: IPaymentMethodSetting;
  boxes?: { count: number; capacityKg: number };
  tanks?: ITankSetting[];
  pressLines?: IPressLineSetting[];
}

export interface IConfigurationUpdatePayload extends IConfigurationUpdate {
  by: string;
}

export interface IConfigurationService {
  getOne(siteId: string, seasonId?: string): Promise<IConfiguration>;
  update(siteId: string, update: IConfigurationUpdatePayload): Promise<IConfiguration>;
  cancelPriceChange(siteId: string, changeId: string): Promise<IConfiguration>;
}

export interface IConfigurationStore {
  bySite: Record<string, IConfiguration>;
  bySeason: Record<string, IConfiguration>;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
