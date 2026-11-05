import { formatNumber } from 'global/composables/number';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import { LOTS_MOCK } from 'lot/constants/mock-lots';
import { millingFee } from 'lot/composables/fee';
import type { ILot } from 'lot/types/lot';
import type { IBankAccount, IMovement, IRefund, MovementStatus, PaymentMethodKey } from 'finance/types/finance';

interface ISeedMovement extends Omit<IMovement, 'documents' | 'clientId'> {
  hasProof: boolean;
}

const O = SITE_OUJDA_ID;

const ACCOUNTS: Record<string, IBankAccount> = {
  [O]: { bank: 'Banque Populaire', accountEnd: '4521' },
  [SITE_BERKANE_ID]: { bank: 'Crédit Agricole', accountEnd: '2290' },
};
const OIL_PRICE_PER_LITRE = 40;
const METHOD_CYCLE: PaymentMethodKey[] = ['cash', 'cash', 'transfer', 'cash', 'cheque', 'oil'];
const REFERENCES: Partial<Record<PaymentMethodKey, string>> = { transfer: 'VIR-', cheque: 'N° ' };

/** A Payment of one Lot, or part of it, made on the day it reached a step. */
const paymentOf = (lot: ILot, index: number, status: MovementStatus, amount: number, method: PaymentMethodKey = METHOD_CYCLE[index % METHOD_CYCLE.length], extra: Partial<ISeedMovement> = {}): ISeedMovement => {
  const lastMove = lot.moves[lot.moves.length - 1];
  const prefix = REFERENCES[method];
  return {
    id: `m${String(index + 1).padStart(3, '0')}`,
    code: `P-${String(400 + index)}`,
    kind: 'payment',
    purpose: 'fee',
    siteId: lot.siteId,
    client: lot.clientName,
    lotLinks: [{ lotId: lot.id, lotCode: lot.code, amount }],
    amount,
    method,
    hasProof: method === 'transfer' || method === 'cheque',
    status,
    recordedBy: lastMove.by,
    recordedAt: lastMove.at,
    ...(prefix ? { reference: `${prefix}${lot.code.slice(-4)}${index}`, bankAccount: ACCOUNTS[lot.siteId] } : {}),
    ...(method === 'oil' ? { oilLitres: Math.round((amount / OIL_PRICE_PER_LITRE) * 100) / 100 } : {}),
    ...(status === 'pending' ? {} : { decidedBy: 'Khadija Amrani', decidedAt: lastMove.at }),
    ...extra,
  };
};

const lotByCode = (code: string): ILot => LOTS_MOCK.find((lot) => lot.code === code) as ILot;

/** Lots paid, partly paid or waiting for confirmation; the others stay unpaid. */
const buildSeeds = (): ISeedMovement[] => {
  const named: ISeedMovement[] = [
    paymentOf(lotByCode('OJ-2627-0152'), 0, 'pending', millingFee(lotByCode('OJ-2627-0152')), 'cash'),
    paymentOf(lotByCode('OJ-2627-0151'), 1, 'pending', millingFee(lotByCode('OJ-2627-0151')), 'oil'),
    paymentOf(lotByCode('BK-2627-0084'), 2, 'pending', millingFee(lotByCode('BK-2627-0084')), 'cash'),
    paymentOf(lotByCode('OJ-2627-0153'), 3, 'pending', 300, 'transfer'),
    paymentOf(lotByCode('OJ-2627-0149'), 4, 'rejected', millingFee(lotByCode('OJ-2627-0149')), 'cash', { note: 'Montant absent de la caisse' }),
    paymentOf(lotByCode('OJ-2627-0149'), 5, 'confirmed', millingFee(lotByCode('OJ-2627-0149')), 'cheque'),
  ];
  const withdrawn = LOTS_MOCK.filter((lot) => lot.status === 'withdrawn' && lot.code !== 'OJ-2627-0149');
  return [
    ...named,
    ...withdrawn.flatMap((lot, index) => {
      const position = named.length + index;
      if (index % 7 === 6) return [];
      const amount = index % 5 === 4 ? Math.round(millingFee(lot) / 2) : millingFee(lot);
      return [paymentOf(lot, position, 'confirmed', amount)];
    }),
  ];
};

const PROOF_TITLES: Record<PaymentMethodKey, string> = { cash: 'REÇU', cheque: 'CHÈQUE', transfer: 'AVIS DE VIREMENT', oil: 'BON' };

const proofImage = (movement: ISeedMovement): string => {
  const amount = formatNumber(movement.amount);
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

export const MOVEMENTS_MOCK: IMovement[] = buildSeeds().map(({ hasProof, ...seed }) => ({
  ...seed,
  clientId: CLIENTS_MOCK.find((client) => client.name === seed.client)?.id ?? '',
  documents: hasProof ? [{ id: `doc-${seed.id}`, name: PROOF_TITLES[seed.method], url: proofImage({ hasProof, ...seed }), isPdf: false, addedBy: seed.recordedBy, addedAt: seed.recordedAt }] : [],
}));

const cancelledMovement = MOVEMENTS_MOCK.find((movement) => movement.status === 'confirmed' && movement.method === 'cash') as IMovement;

export const REFUNDS_MOCK: IRefund[] = [
  { id: 'r001', siteId: cancelledMovement.siteId, clientId: cancelledMovement.clientId, client: cancelledMovement.client, sourceCode: 'P-0388', amount: 150, status: 'to_make', createdAt: cancelledMovement.recordedAt, documents: [] },
];
