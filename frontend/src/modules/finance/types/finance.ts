import type { PeriodKey } from 'global/types/period';

export type PaymentMethodKey = 'cash' | 'cheque' | 'transfer' | 'oil';

export type MovementKind = 'payment' | 'payout';

export type MovementStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export type MovementPurpose = 'fee' | 'sale' | 'purchase';

export type Settlement = 'credit_note' | 'refund';

/** A Payment received or a Payout paid. Provisional until the Money data model settles. */
export interface IMovement {
  id: string;
  code: string;
  kind: MovementKind;
  purpose: MovementPurpose;
  siteId: string;
  client: string;
  label: string;
  amount: number;
  feeOffset?: number;
  method: PaymentMethodKey;
  reference?: string;
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
