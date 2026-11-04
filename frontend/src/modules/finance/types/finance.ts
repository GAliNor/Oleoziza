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

/** A Payment received or a Payout paid. Provisional until the Money data model settles. */
export interface IMovement {
  id: string;
  code: string;
  kind: MovementKind;
  purpose: MovementPurpose;
  siteId: string;
  clientId: string;
  client: string;
  label: string;
  amount: number;
  feeOffset?: number;
  method: PaymentMethodKey;
  reference?: string;
  bankAccount?: IBankAccount;
  oilKg?: number;
  proofUrl: string | null;
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

export interface IFinanceService {
  getMovements(siteId: string): Promise<IMovement[]>;
  decideMovement(id: string, decision: IMovementDecision): Promise<IMovement>;
  getSales(siteId: string, period: PeriodKey): Promise<ISales>;
}

export interface IFinanceStore {
  movements: IMovement[];
  sales: ISales | null;
  loadedSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasError: boolean;
}
