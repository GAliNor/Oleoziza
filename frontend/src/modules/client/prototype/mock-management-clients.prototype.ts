// PROTOTYPE — mock rows and details for the Management Clients page (ticket 0030) until the Money and Stock data models exist.
import { CLIENTS_MOCK } from 'global/constants/mock-clients';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'global/constants/mock-sites';
import { CLIENTS, type IClientPrototype } from 'dashboard/prototype/mock-home.prototype';

export interface ISiteShareDetailPrototype {
  siteId: string;
  siteName: string;
  oliveKg: number;
  lots: number;
  oilStockKg: number;
  balance: number;
}

export interface IManagementClientPrototype extends IClientPrototype {
  id: string;
  phone: string;
  sites: ISiteShareDetailPrototype[];
  history: { code: string; siteName: string; step: string; kg: number; at: string }[];
  audit: { at: string; by: string; text: string }[];
}

const SITE_NAMES: Record<string, string> = { [SITE_OUJDA_ID]: 'Huilerie Oujda', [SITE_BERKANE_ID]: 'Huilerie Berkane' };

const EXTRA_CLIENTS: IClientPrototype[] = [
  { name: 'Abdelhak Bouhaddou', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 3620, lots: 2, oilStockKg: 0, balance: 0, lastVisit: 'il y a 4 j', lastVisitDays: 4, state: 'active' },
  { name: 'Aicha Zerrouki', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 1480, lots: 1, oilStockKg: 268, balance: 740, lastVisit: 'il y a 12 j', lastVisitDays: 12, state: 'at-risk' },
  { name: 'Coopérative Ain Sfa', kind: 'company', siteId: SITE_OUJDA_ID, seasonKg: 27400, lots: 7, oilStockKg: 0, balance: 6300, lastVisit: 'hier', lastVisitDays: 1, state: 'active' },
  { name: 'Brahim Lamrani', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2100, lots: 1, oilStockKg: 0, balance: 0, lastVisit: 'il y a 26 j', lastVisitDays: 26, state: 'inactive' },
  { name: 'Fouzia Belkadi', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 960, lots: 1, oilStockKg: 0, balance: 0, lastVisit: 'il y a 3 j', lastVisitDays: 3, state: 'active' },
  { name: 'Jamal Ouazzani', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 4870, lots: 3, oilStockKg: 610, balance: 1210, lastVisit: 'il y a 15 j', lastVisitDays: 15, state: 'at-risk' },
  { name: 'Huileries Triffa SARL', kind: 'company', siteId: SITE_BERKANE_ID, seasonKg: 19800, lots: 5, oilStockKg: 0, balance: 0, lastVisit: 'il y a 2 j', lastVisitDays: 2, state: 'active' },
  { name: 'Karim Mansouri', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 1350, lots: 1, oilStockKg: 0, balance: 0, lastVisit: 'il y a 30 j', lastVisitDays: 30, state: 'inactive' },
  { name: 'Malika Tazi', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2760, lots: 2, oilStockKg: 498, balance: 0, lastVisit: 'il y a 5 j', lastVisitDays: 5, state: 'active' },
  { name: 'Noureddine Haddouchi', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 3190, lots: 2, oilStockKg: 0, balance: 1595, lastVisit: 'il y a 18 j', lastVisitDays: 18, state: 'at-risk' },
  { name: 'Omar Chergui', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 840, lots: 1, oilStockKg: 0, balance: 0, lastVisit: 'il y a 6 j', lastVisitDays: 6, state: 'active' },
  { name: 'Samira El Ouafi', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 1920, lots: 1, oilStockKg: 0, balance: 0, lastVisit: 'il y a 24 j', lastVisitDays: 24, state: 'inactive' },
  { name: 'Domaine Beni Snassen', kind: 'company', siteId: SITE_BERKANE_ID, seasonKg: 22600, lots: 6, oilStockKg: 0, balance: 8150, lastVisit: 'il y a 8 j', lastVisitDays: 8, state: 'at-risk' },
  { name: 'Zakaria Bensaid', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2310, lots: 2, oilStockKg: 0, balance: 0, lastVisit: 'auj.', lastVisitDays: 0, state: 'active' },
];

const lotCode = (siteId: string, number: number): string => `${siteId === SITE_OUJDA_ID ? 'L' : 'B'}-${String(number).padStart(4, '0')}`;

export const MANAGEMENT_CLIENTS: IManagementClientPrototype[] = [...CLIENTS, ...EXTRA_CLIENTS].map((client, index) => {
  const source = CLIENTS_MOCK.find((item) => item.name === client.name);
  const siteIds = source?.siteIds ?? [client.siteId];
  const sites = siteIds.map((siteId, siteIndex) => {
    const share = siteIds.length > 1 ? (siteIndex === 0 ? 0.7 : 0.3) : 1;
    return {
      siteId,
      siteName: SITE_NAMES[siteId],
      oliveKg: Math.round(client.seasonKg * share),
      lots: Math.max(1, Math.round(client.lots * share)),
      oilStockKg: Math.round(client.oilStockKg * share),
      balance: Math.round(client.balance * share),
    };
  });
  return {
    ...client,
    id: source?.id ?? `prototype-${index}`,
    phone: source?.phone ?? '',
    sites,
    history: [
      { code: lotCode(client.siteId, 150 - index), siteName: SITE_NAMES[client.siteId], step: 'Pressé', kg: Math.round(client.seasonKg / client.lots), at: client.lastVisit },
      { code: lotCode(client.siteId, 110 - index), siteName: SITE_NAMES[client.siteId], step: 'Retiré', kg: Math.round((client.seasonKg / client.lots) * 0.9), at: 'il y a 2 sem.' },
    ],
    audit: [
      { at: client.lastVisit, by: 'Hamid', text: 'Réception enregistrée' },
      { at: 'il y a 6 j', by: 'Mohammed Taibi', text: 'Paiement confirmé (espèces)' },
      { at: 'il y a 3 sem.', by: 'Rachid', text: 'Téléphone corrigé · motif : erreur de saisie' },
    ],
  };
});

export const findManagementClient = (id: string): IManagementClientPrototype | undefined => MANAGEMENT_CLIENTS.find((client) => client.id === id);
