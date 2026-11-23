import type { NotificationChoice } from 'lot/types/lot';
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
  /** The setting before the change, kept by the mock so its Journal tells old and new values. */
  before?: Pick<IConfigurationChange, 'value' | 'method' | 'equipment'>;
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
  /** Season of the prices; null when none is open: the prices are then the defaults and the rest still holds. */
  seasonId: string | null;
  seasonLabel: string | null;
  seasonStatus: SeasonStatus | null;
  priceChanges: IPriceChange[];
  methods: IPaymentMethodSetting[];
  boxCount: number;
  boxCapacityKg: number;
  tanks: ITankSetting[];
  pressLines: IPressLineSetting[];
  /** Next numbers the Site may give: a retired one keeps its number (B18). */
  nextTankNumber: number;
  nextPressLineNumber: number;
  history: IConfigurationChange[];
  /** The company's Notification Channels, carried by every Configuration so Reception needs no extra request. */
  notificationChannels: INotificationChannelSetting[];
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

/** A way the mill messages Clients about their Lots (glossary: Notification Channel). */
export type NotificationChannel = Exclude<NotificationChoice, 'none'>;

export interface INotificationChannelSetting {
  channel: NotificationChannel;
  /** The mill can really send through it; a channel not implemented can't be switched on. */
  isImplemented: boolean;
  isEnabled: boolean;
}

export interface IConfigurationService {
  getAll(siteIds: string[], seasonId?: string): Promise<IConfiguration[]>;
  updateNotificationChannel(channel: NotificationChannel, isEnabled: boolean): Promise<INotificationChannelSetting[]>;
  update(siteId: string, update: IConfigurationUpdatePayload): Promise<IConfiguration>;
  deletePriceChange(siteId: string, changeId: string): Promise<IConfiguration>;
}

export interface IConfigurationStore {
  bySite: Record<string, IConfiguration>;
  bySeason: Record<string, IConfiguration>;
  /** The company's channels, last known on this device until read again; null before the first read. */
  notificationChannels: INotificationChannelSetting[] | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
