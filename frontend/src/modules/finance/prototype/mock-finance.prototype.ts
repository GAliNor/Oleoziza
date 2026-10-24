// PROTOTYPE — Payments and Payouts for the Management Finances page (ticket 0034), until the Money data model exists.
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'global/constants/mock-sites';
import type { PaymentMethodKey } from 'dashboard/prototype/mock-home.prototype';

export type MovementKind = 'payment' | 'payout';

export type MovementStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export type MovementPurpose = 'fee' | 'sale' | 'purchase';

export type Settlement = 'credit_note' | 'refund';

export interface IMovementPrototype {
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
  hasProof: boolean;
  status: MovementStatus;
  recordedBy: string;
  recordedAt: string;
  wasOffline?: boolean;
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
  settlement?: Settlement;
}

export const METHOD_LABELS: Record<PaymentMethodKey, string> = { cash: 'Espèces', cheque: 'Chèque', transfer: 'Virement', oil: 'Part d’huile' };

export const STATUS_LABELS: Record<MovementStatus, string> = { pending: 'À confirmer', confirmed: 'Confirmé', rejected: 'Rejeté', cancelled: 'Annulé' };

export const STATUS_CLASSES: Record<MovementStatus, string> = {
  pending: 'bg-warning-amber/15 text-warning-amber',
  confirmed: 'bg-success-green/10 text-success-green',
  rejected: 'bg-danger-red/10 text-danger-red',
  cancelled: 'bg-neutral-200 text-neutral-600',
};

export const PURPOSE_LABELS: Record<MovementPurpose, string> = { fee: 'Frais de trituration', sale: 'Vente', purchase: 'Achat d’olives' };

export const SETTLEMENT_LABELS: Record<Settlement, string> = { credit_note: 'Avoir', refund: 'Remboursement' };

const O = SITE_OUJDA_ID;
const B = SITE_BERKANE_ID;

export const MOVEMENTS_MOCK: IMovementPrototype[] = [
  { id: 'm01', code: 'P-0412', kind: 'payment', purpose: 'fee', siteId: O, client: 'Said Tahiri', label: 'Frais L-0152 · 2 050 kg × 0,50 DH', amount: 1025, method: 'cash', hasProof: false, status: 'pending', recordedBy: 'Hamid Zerrouki', recordedAt: '2026-10-24T11:40:00+01:00' },
  { id: 'm02', code: 'P-0411', kind: 'payment', purpose: 'sale', siteId: O, client: 'Restaurant Al Andalous', label: 'Vente 60 L d’huile vierge', amount: 3900, method: 'cheque', reference: 'Chèque n° 4410278 · Attijariwafa bank', hasProof: true, status: 'pending', recordedBy: 'Imane Saidi', recordedAt: '2026-10-24T10:55:00+01:00' },
  { id: 'm03', code: 'V-0058', kind: 'payout', purpose: 'purchase', siteId: O, client: 'Coopérative Angad', label: 'Achat L-0156 · 3 210 kg × 4,20 DH', amount: 12852, feeOffset: 630, method: 'transfer', reference: 'Virement réf. CIH-20261024-118', hasProof: true, status: 'pending', recordedBy: 'Hamid Zerrouki', recordedAt: '2026-10-24T09:30:00+01:00' },
  { id: 'm04', code: 'P-0410', kind: 'payment', purpose: 'fee', siteId: O, client: 'Naima Lahlou', label: 'Frais L-0151 · 780 kg × 0,50 DH', amount: 390, method: 'oil', oilKg: 9.75, hasProof: false, status: 'pending', recordedBy: 'Hamid Zerrouki', recordedAt: '2026-10-23T17:10:00+01:00', wasOffline: true },
  { id: 'm05', code: 'P-0409', kind: 'payment', purpose: 'sale', siteId: O, client: 'Épicerie Zitouna', label: 'Vente 40 bouteilles 1 L', amount: 2400, method: 'transfer', reference: 'Virement réf. BP-77812', hasProof: true, status: 'pending', recordedBy: 'Soufiane Mrabet', recordedAt: '2026-10-23T15:25:00+01:00' },
  { id: 'm06', code: 'P-0408', kind: 'payment', purpose: 'fee', siteId: O, client: 'Driss Amrani', label: 'Frais L-0149 · 1 300 kg × 0,50 DH', amount: 650, method: 'cash', hasProof: false, status: 'confirmed', recordedBy: 'Hamid Zerrouki', recordedAt: '2026-10-23T16:05:00+01:00', decidedBy: 'Nadia Boukili', decidedAt: '2026-10-23T18:30:00+01:00' },
  { id: 'm07', code: 'P-0407', kind: 'payment', purpose: 'sale', siteId: O, client: 'Hôtel Atlas Oujda', label: 'Vente 120 L d’huile vierge extra', amount: 8400, method: 'transfer', reference: 'Virement réf. BMCE-552190', hasProof: true, status: 'confirmed', recordedBy: 'Imane Saidi', recordedAt: '2026-10-22T11:20:00+01:00', decidedBy: 'Mohammed Taibi', decidedAt: '2026-10-22T19:02:00+01:00' },
  { id: 'm08', code: 'P-0406', kind: 'payment', purpose: 'sale', siteId: O, client: 'Karim Mansouri', label: 'Vente 20 L d’huile vierge', amount: 1300, method: 'cash', hasProof: false, status: 'rejected', recordedBy: 'Soufiane Mrabet', recordedAt: '2026-10-22T10:40:00+01:00', decidedBy: 'Nadia Boukili', decidedAt: '2026-10-22T18:15:00+01:00', note: 'Montant absent de la caisse du soir.' },
  { id: 'm09', code: 'P-0405', kind: 'payment', purpose: 'sale', siteId: O, client: 'Malika Tazi', label: 'Vente 30 L d’huile vierge', amount: 1950, method: 'cheque', reference: 'Chèque n° 0098812 · Banque Populaire', hasProof: true, status: 'cancelled', recordedBy: 'Imane Saidi', recordedAt: '2026-10-21T12:00:00+01:00', decidedBy: 'Mohammed Taibi', decidedAt: '2026-10-21T18:40:00+01:00', note: 'Chèque revenu impayé.', settlement: 'credit_note' },
  { id: 'm10', code: 'V-0057', kind: 'payout', purpose: 'purchase', siteId: O, client: 'Abdelhak Bouhaddou', label: 'Achat L-0146 · 1 860 kg × 4,10 DH', amount: 7626, method: 'cash', hasProof: false, status: 'confirmed', recordedBy: 'Hamid Zerrouki', recordedAt: '2026-10-21T09:10:00+01:00', decidedBy: 'Nadia Boukili', decidedAt: '2026-10-21T18:20:00+01:00' },
  { id: 'm11', code: 'P-0404', kind: 'payment', purpose: 'fee', siteId: O, client: 'Jamal Ouazzani', label: 'Frais L-0144 · 2 420 kg × 0,50 DH', amount: 1210, method: 'cash', hasProof: false, status: 'confirmed', recordedBy: 'Hamid Zerrouki', recordedAt: '2026-10-20T16:45:00+01:00', decidedBy: 'Nadia Boukili', decidedAt: '2026-10-20T18:50:00+01:00' },
  { id: 'm12', code: 'P-0403', kind: 'payment', purpose: 'sale', siteId: O, client: 'Coopérative Ain Sfa', label: 'Vente 200 L d’huile vierge', amount: 12600, method: 'transfer', reference: 'Virement réf. CAM-310045', hasProof: true, status: 'confirmed', recordedBy: 'Imane Saidi', recordedAt: '2026-10-19T14:30:00+01:00', decidedBy: 'Mohammed Taibi', decidedAt: '2026-10-19T20:10:00+01:00' },
  { id: 'm13', code: 'P-0402', kind: 'payment', purpose: 'fee', siteId: O, client: 'Omar Chergui', label: 'Frais L-0139 · 840 kg × 0,50 DH', amount: 420, method: 'oil', oilKg: 10.5, hasProof: false, status: 'confirmed', recordedBy: 'Hamid Zerrouki', recordedAt: '2026-10-18T15:00:00+01:00', decidedBy: 'Nadia Boukili', decidedAt: '2026-10-18T18:05:00+01:00' },
  { id: 'm14', code: 'P-0401', kind: 'payment', purpose: 'sale', siteId: O, client: 'Zakaria Bensaid', label: 'Vente 10 L d’huile vierge', amount: 650, method: 'cash', hasProof: false, status: 'confirmed', recordedBy: 'Soufiane Mrabet', recordedAt: '2026-10-17T11:15:00+01:00', decidedBy: 'Nadia Boukili', decidedAt: '2026-10-17T18:00:00+01:00' },
  { id: 'm15', code: 'P-0215', kind: 'payment', purpose: 'fee', siteId: B, client: 'Hassan Ziani', label: 'Frais B-0084 · 990 kg × 0,50 DH', amount: 495, method: 'cash', hasProof: false, status: 'pending', recordedBy: 'Abdelkader Mansouri', recordedAt: '2026-10-24T12:05:00+01:00' },
  { id: 'm16', code: 'V-0031', kind: 'payout', purpose: 'purchase', siteId: B, client: 'Domaine Zegzel', label: 'Acompte achat B-0085 · 4 120 kg', amount: 10000, method: 'cheque', reference: 'Chèque n° 7781004 · Crédit Agricole', hasProof: true, status: 'pending', recordedBy: 'Abdelkader Mansouri', recordedAt: '2026-10-24T08:20:00+01:00' },
  { id: 'm17', code: 'P-0214', kind: 'payment', purpose: 'sale', siteId: B, client: 'Huileries Triffa SARL', label: 'Vente 300 L d’huile vierge', amount: 18900, method: 'transfer', reference: 'Virement réf. SG-889120', hasProof: true, status: 'confirmed', recordedBy: 'Mustapha Ziani', recordedAt: '2026-10-22T10:00:00+01:00', decidedBy: 'Nadia Boukili', decidedAt: '2026-10-22T17:45:00+01:00' },
  { id: 'm18', code: 'P-0213', kind: 'payment', purpose: 'fee', siteId: B, client: 'Aicha Zerrouki', label: 'Frais B-0079 · 1 480 kg × 0,50 DH', amount: 740, method: 'cash', hasProof: false, status: 'confirmed', recordedBy: 'Abdelkader Mansouri', recordedAt: '2026-10-21T16:30:00+01:00', decidedBy: 'Nadia Boukili', decidedAt: '2026-10-21T18:10:00+01:00' },
  { id: 'm19', code: 'P-0212', kind: 'payment', purpose: 'sale', siteId: B, client: 'Domaine Beni Snassen', label: 'Vente 150 L d’huile vierge extra', amount: 10500, method: 'cheque', reference: 'Chèque n° 3301987 · BMCI', hasProof: true, status: 'confirmed', recordedBy: 'Mustapha Ziani', recordedAt: '2026-10-19T11:40:00+01:00', decidedBy: 'Mohammed Taibi', decidedAt: '2026-10-19T19:30:00+01:00' },
  { id: 'm20', code: 'P-0211', kind: 'payment', purpose: 'fee', siteId: B, client: 'Fouzia Belkadi', label: 'Frais B-0075 · 960 kg × 0,50 DH', amount: 480, method: 'cash', hasProof: false, status: 'confirmed', recordedBy: 'Abdelkader Mansouri', recordedAt: '2026-10-18T15:20:00+01:00', decidedBy: 'Nadia Boukili', decidedAt: '2026-10-18T18:00:00+01:00' },
];

const PROOF_TITLES: Record<PaymentMethodKey, string> = { cash: 'REÇU', cheque: 'CHÈQUE', transfer: 'AVIS DE VIREMENT', oil: 'BON' };

export const proofImage = (movement: IMovementPrototype): string => {
  const amount = movement.amount.toLocaleString('fr-FR');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280" viewBox="0 0 480 280">
    <rect width="480" height="280" rx="14" fill="#FBF8F1" stroke="#D6D3D1"/>
    <rect x="0" y="0" width="480" height="54" rx="14" fill="#E9E4D8"/>
    <text x="24" y="35" font-family="sans-serif" font-size="18" font-weight="700" fill="#44403C">${PROOF_TITLES[movement.method]}</text>
    <text x="456" y="35" text-anchor="end" font-family="monospace" font-size="14" fill="#78716C">${movement.code}</text>
    <text x="24" y="98" font-family="sans-serif" font-size="13" fill="#78716C">Bénéficiaire / payeur</text>
    <text x="24" y="122" font-family="sans-serif" font-size="18" fill="#1C1917">${movement.client}</text>
    <line x1="24" y1="140" x2="456" y2="140" stroke="#E7E5E4"/>
    <text x="24" y="172" font-family="sans-serif" font-size="13" fill="#78716C">${movement.reference ?? ''}</text>
    <text x="456" y="232" text-anchor="end" font-family="sans-serif" font-size="30" font-weight="700" fill="#1C1917">${amount} DH</text>
    <path d="M24 236 q20 -26 40 0 t40 0 t40 0" stroke="#5C6A47" stroke-width="2" fill="none"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatDay = (iso: string): string => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
