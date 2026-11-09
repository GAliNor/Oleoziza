import type { PeriodKey } from 'global/types/period';

export type PaymentMethodKey = 'cash' | 'cheque' | 'transfer' | 'oil';

export type MovementKind = 'payment' | 'payout';

export type MovementStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export type MovementPurpose = 'fee' | 'sale' | 'purchase';

export type Settlement = 'credit_note' | 'refund';

/** The mill's account money lands on or leaves from. Stands in until the bank account library exists. */
export interface IBankAccount {
  bank: string;
  accountEnd: string;
}

/** An image or PDF a Client sent. It exists once, on the Payment, and shows under every Lot that Payment pays. */
export interface IPaymentDocument {
  id: string;
  name: string;
  url: string;
  isPdf: boolean;
  addedBy: string;
  addedAt: string;
}

export type RefundStatus = 'to_make' | 'made' | 'confirmed';

/** Money to give back after a surplus or a cancellation. Once paid back, a different person confirms it. */
export interface IRefund {
  id: string;
  siteId: string;
  clientId: string;
  client: string;
  sourceCode: string;
  amount: number;
  status: RefundStatus;
  createdAt: string;
  method?: PaymentMethodKey;
  reference?: string;
  documents: IPaymentDocument[];
  madeBy?: string;
  madeAt?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

/** The part of a Payment that pays one Lot's Milling Fee. */
export interface ILotPaymentLink {
  lotId: string;
  lotCode: string;
  amount: number;
}

/** A Payment received or a Payout paid. Provisional until the Money data model settles. */
export interface IMovement {
  id: string;
  code: string;
  kind: MovementKind;
  purpose: MovementPurpose;
  siteId: string;
  clientId: string;
  client: string;
  lotLinks: ILotPaymentLink[];
  amount: number;
  feeOffset?: number;
  method: PaymentMethodKey;
  reference?: string;
  bankAccount?: IBankAccount;
  oilLitres?: number;
  documents: IPaymentDocument[];
  status: MovementStatus;
  recordedBy: string;
  recordedAt: string;
  wasOffline?: boolean;
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
  settlement?: Settlement;
}

/** One line of the details printed on a movement's ticket. */
export interface ITicketFact {
  key: string;
  label: string;
  value: string;
  chip?: string;
  note?: string;
  isWide?: boolean;
}

/** Where the open movement sits among those still to confirm; `position` is null once it has left that list. */
export interface IPendingSteps {
  position: number | null;
  total: number;
  previousId: string | null;
  nextId: string | null;
}

export interface ISalesFigures {
  revenue: number;
  collected: number;
  pending: number;
  outstanding: number;
  pendingCount: number;
}

export interface ISalesBar {
  label: string;
  revenue: number;
  collected: number;
  isCurrent: boolean;
}

export interface IPaymentMethodShare {
  key: PaymentMethodKey;
  amount: number;
}

export interface ISales {
  figures: ISalesFigures;
  chartTitleKey: string;
  bars: ISalesBar[];
  methods: IPaymentMethodShare[];
}

export interface IMovementDecision {
  status: Extract<MovementStatus, 'confirmed' | 'rejected' | 'cancelled'>;
  by: string;
  note?: string;
  settlement?: Settlement;
}

/** `id` is minted when the form opens, so a retry after a lost response never records it twice. */
export interface IRecordPaymentPayload {
  id: string;
  siteId: string;
  clientId: string;
  client: string;
  lotLinks: ILotPaymentLink[];
  amount: number;
  method: PaymentMethodKey;
  reference?: string;
  oilLitres?: number;
  documents: IPaymentDocument[];
  recordedBy: string;
  /** Cash taken by someone who may confirm Payments is final at once; anything else waits for confirmation. */
  isFinal: boolean;
}

export type DebtContactKind = 'call' | 'sms' | 'visit' | 'note';

/** One step of the Debt Follow-up: a contact with a Client who owes, and the date they promised to pay, if any. */
export interface IDebtContact {
  id: string;
  siteId: string;
  clientId: string;
  kind: DebtContactKind;
  note: string;
  promisedOn: string | null;
  by: string;
  at: string;
}

/** `id` is minted when the form opens, so a retry never logs the contact twice. */
export type IDebtContactPayload = Omit<IDebtContact, 'at'>;

export interface IFinanceService {
  getMovements(siteId: string): Promise<IMovement[]>;
  decideMovement(id: string, decision: IMovementDecision): Promise<IMovement>;
  linkLots(id: string, lotLinks: ILotPaymentLink[]): Promise<IMovement>;
  addDocuments(id: string, documents: IPaymentDocument[]): Promise<IMovement>;
  getRefunds(siteId: string): Promise<IRefund[]>;
  makeRefund(id: string, made: Pick<IRefund, 'method' | 'reference' | 'documents' | 'madeBy'>): Promise<IRefund>;
  confirmRefund(id: string, by: string): Promise<IRefund>;
  recordPayment(payload: IRecordPaymentPayload): Promise<IMovement>;
  getSales(siteId: string, period: PeriodKey): Promise<ISales>;
  getDebtContacts(siteId: string): Promise<IDebtContact[]>;
  addDebtContact(payload: IDebtContactPayload): Promise<IDebtContact>;
}

export interface IFinanceStore {
  movements: IMovement[];
  refunds: IRefund[];
  debtContacts: IDebtContact[];
  sales: ISales | null;
  salesQuery: { siteId: string; period: PeriodKey } | null;
  loadedSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
