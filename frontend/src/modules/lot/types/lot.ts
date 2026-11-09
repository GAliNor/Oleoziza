export type ReceptionMode = 'service' | 'purchase';
export type LotStatus = 'waiting' | 'pressing' | 'pressed' | 'withdrawn';

/** A status a Lot reached, with who moved it and when. Provisional until the Operations data model settles. */
export interface ILotMoveRecord {
  status: LotStatus;
  at: string;
  by: string;
}

export type LotStepKey = LotStatus | 'reception' | 'stored' | 'discount' | 'notification';

export type NotificationChoice = 'sms' | 'email' | 'none';

export type DiscountState = 'applied' | 'pending' | 'approved' | 'refused';

/** A reduction of one Lot's Milling Fee. Over the Discount Limit it stays pending, and the fee at full price, until decided. */
export interface ILotDiscount {
  amountDh: number;
  percent: number;
  state: DiscountState;
  givenBy: string;
  givenAt: string;
  decidedBy?: string;
  decidedAt?: string;
  refusalReason?: string;
}

export type PaymentState = 'unpaid' | 'partial' | 'to_confirm' | 'paid';

export type NotificationEvent = 'pressed' | 'payment_confirmed';

/** A message a Client was sent, or could not be sent for lack of a contact. Sending is simulated. */
export interface ILotNotification {
  event: NotificationEvent;
  channel: Exclude<NotificationChoice, 'none'>;
  at: string;
  isFailed: boolean;
}

export type StorageOwnerKind = 'client' | 'mill';

/** Some of a Lot's oil kept in one Tank for its owner, from a date and optionally until a planned one; it ends once all withdrawn. */
export interface ILotStorage {
  id: string;
  tankId: string;
  litres: number;
  withdrawnLitres: number;
  from: string;
  plannedUntil: string | null;
  endedAt: string | null;
  by: string;
}

export interface ILotStep {
  key: LotStepKey;
  label: string;
  detail: string;
  at: string;
  by: string;
  imageUrl: string | null;
}

export interface ILot {
  id: string;
  code: string;
  siteId: string;
  clientId: string;
  clientName: string;
  mode: ReceptionMode;
  variety: string;
  status: LotStatus;
  netKg: number;
  oilLitres: number | null;
  withdrawnLitres: number;
  boxNumbers: number[];
  pressLineId: string | null;
  plannedStartAt: string | null;
  storages: ILotStorage[];
  dailyPricePerKg: number | null;
  millingRatePerKg: number;
  discount: ILotDiscount | null;
  notificationChoice: NotificationChoice;
  isContactMissing: boolean;
  notifications: ILotNotification[];
  paidDh: number;
  pendingDh: number;
  creditDh: number;
  moves: ILotMoveRecord[];
  stepPhotos: Partial<Record<LotStepKey, string>>;
  receivedAt: string;
  receivedBy: string;
  isPendingSync: boolean;
}

/** One step of a Lot along its statuses; `id` is minted once per user intent, so a retry never moves it twice. */
/** One share of a Lot's oil going into one Tank. */
export interface ITankPour {
  tankId: string;
  litres: number;
}

/** At the end of a Pressing the oil splits: some handed over at once into the Client's containers, the rest stored in Tanks. */
export interface ILotMove {
  id: string;
  oilLitres?: number;
  photoUrl?: string;
  pressLineId?: string;
  handedLitres?: number;
  pours?: ITankPour[];
  plannedUntil?: string | null;
}

/** How the Operator splits a Lot's oil at the end of its Pressing, and whether that split can be saved. */
export type IOilSplit = Required<Pick<ILotMove, 'handedLitres' | 'pours' | 'plannedUntil'>> & { isValid: boolean };

/** `id` is minted when the change starts, so a retry never moves the Lot twice. */
export interface ILotSchedule {
  id: string;
  pressLineId: string;
  plannedStartAt: string;
}

export interface ILotMovePayload extends ILotMove {
  by: string;
}

/** `id` is minted when the decision starts, so a retry never records it twice. */
export interface IDiscountDecision {
  id: string;
  isApproved: boolean;
  reason?: string;
}

/** `id` is minted when the form opens, so a retry never gives the Discount twice. */
export interface IDiscountGift {
  id: string;
  amountDh: number;
  percent: number;
  isOverLimit: boolean;
}

export interface ILotService {
  getLots(siteId: string): Promise<ILot[]>;
  moveLot(lotId: string, move: ILotMovePayload): Promise<ILot>;
  clearMissingContact(lotId: string): Promise<ILot>;
  decideDiscount(lotId: string, decision: IDiscountDecision & { by: string }): Promise<ILot>;
  giveDiscount(lotId: string, gift: IDiscountGift & { by: string }): Promise<ILot>;
  scheduleLot(lotId: string, schedule: ILotSchedule): Promise<ILot>;
}

export interface ILotStore {
  lots: ILot[];
  loadedSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
