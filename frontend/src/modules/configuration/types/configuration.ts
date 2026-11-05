import type { PaymentMethodKey } from 'finance/types/finance';

export type ConfigurationValueKey = 'millingRate' | 'discountLimit' | 'oilPrice';

export interface IPaymentMethodSetting {
  key: PaymentMethodKey;
  isEnabled: boolean;
  needsProof: boolean;
}

export interface IConfigurationValues {
  millingRate: number;
  discountLimit: number;
  oilPrice: number;
}

/** One change, kept for good: a value of a setting, or how a Payment Method is set. */
export interface IConfigurationChange {
  id: string;
  key: ConfigurationValueKey | PaymentMethodKey;
  value: number | null;
  method: Omit<IPaymentMethodSetting, 'key'> | null;
  by: string;
  at: string;
}

export interface IConfiguration extends IConfigurationValues {
  siteId: string;
  methods: IPaymentMethodSetting[];
  history: IConfigurationChange[];
}

/** `id` is minted when the change starts, so a retry after a lost response never records it twice. */
export interface IConfigurationUpdate {
  id: string;
  value?: { key: ConfigurationValueKey; amount: number };
  method?: IPaymentMethodSetting;
}

export interface IConfigurationUpdatePayload extends IConfigurationUpdate {
  by: string;
}

export interface IConfigurationService {
  getOne(siteId: string): Promise<IConfiguration>;
  update(siteId: string, update: IConfigurationUpdatePayload): Promise<IConfiguration>;
}

export interface IConfigurationStore {
  bySite: Record<string, IConfiguration>;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
