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
  tankName: string | null;
  withdrawnLitres: number;
  boxNumbers: number[];
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
export interface ILotMove {
  id: string;
  oilLitres?: number;
  photoUrl?: string;
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

export interface ILotService {
  getLots(siteId: string): Promise<ILot[]>;
  moveLot(lotId: string, move: ILotMovePayload): Promise<ILot>;
  clearMissingContact(lotId: string): Promise<ILot>;
  decideDiscount(lotId: string, decision: IDiscountDecision & { by: string }): Promise<ILot>;
}

export interface ILotStore {
  lots: ILot[];
  loadedSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
