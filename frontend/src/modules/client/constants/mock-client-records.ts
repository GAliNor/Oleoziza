import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { ORIGIN_SUGGESTIONS } from 'reception/constants/reception';
import { SITES_MOCK, SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { ClientFollowUp, ClientKind, IClientRecord } from 'client/types/client';

interface ISeedRecord {
  name: string;
  kind: ClientKind;
  siteId: string;
  seasonKg: number;
  lots: number;
  oilStockKg: number;
  balance: number;
  lastVisitDays: number;
  followUp: ClientFollowUp;
}

const SEEDS: ISeedRecord[] = [
  { name: 'Coopérative Angad', kind: 'company', siteId: SITE_OUJDA_ID, seasonKg: 48200, lots: 12, oilStockKg: 0, balance: 18400, lastVisitDays: 0, followUp: 'at-risk' },
  { name: 'Domaine Zegzel', kind: 'company', siteId: SITE_BERKANE_ID, seasonKg: 36900, lots: 8, oilStockKg: 0, balance: 4120, lastVisitDays: 0, followUp: 'active' },
  { name: 'Mohammed Benali', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 5140, lots: 3, oilStockKg: 412, balance: 920, lastVisitDays: 0, followUp: 'active' },
  { name: 'Said Tahiri', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 4310, lots: 2, oilStockKg: 389, balance: 1025, lastVisitDays: 0, followUp: 'active' },
  { name: 'Hassan Ziani', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 2980, lots: 2, oilStockKg: 172, balance: 495, lastVisitDays: 9, followUp: 'at-risk' },
  { name: 'Khadija Bouzidi', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2240, lots: 2, oilStockKg: 0, balance: 0, lastVisitDays: 0, followUp: 'active' },
  { name: 'Latifa Berrada', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 1720, lots: 2, oilStockKg: 151, balance: 430, lastVisitDays: 0, followUp: 'active' },
  { name: 'Rkia Hammouti', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 1200, lots: 1, oilStockKg: 0, balance: 0, lastVisitDays: 21, followUp: 'inactive' },
  { name: 'Abdelhak Bouhaddou', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 3620, lots: 2, oilStockKg: 0, balance: 0, lastVisitDays: 4, followUp: 'active' },
  { name: 'Aicha Zerrouki', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 1480, lots: 1, oilStockKg: 268, balance: 740, lastVisitDays: 12, followUp: 'at-risk' },
  { name: 'Coopérative Ain Sfa', kind: 'company', siteId: SITE_OUJDA_ID, seasonKg: 27400, lots: 7, oilStockKg: 0, balance: 6300, lastVisitDays: 1, followUp: 'active' },
  { name: 'Brahim Lamrani', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2100, lots: 1, oilStockKg: 0, balance: 0, lastVisitDays: 26, followUp: 'inactive' },
  { name: 'Fouzia Belkadi', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 960, lots: 1, oilStockKg: 0, balance: 0, lastVisitDays: 3, followUp: 'active' },
  { name: 'Jamal Ouazzani', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 4870, lots: 3, oilStockKg: 610, balance: 1210, lastVisitDays: 15, followUp: 'at-risk' },
  { name: 'Huileries Triffa SARL', kind: 'company', siteId: SITE_BERKANE_ID, seasonKg: 19800, lots: 5, oilStockKg: 0, balance: 0, lastVisitDays: 2, followUp: 'active' },
  { name: 'Karim Mansouri', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 1350, lots: 1, oilStockKg: 0, balance: 0, lastVisitDays: 30, followUp: 'inactive' },
  { name: 'Malika Tazi', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2760, lots: 2, oilStockKg: 498, balance: 0, lastVisitDays: 5, followUp: 'active' },
  { name: 'Noureddine Haddouchi', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 3190, lots: 2, oilStockKg: 0, balance: 1595, lastVisitDays: 18, followUp: 'at-risk' },
  { name: 'Omar Chergui', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 840, lots: 1, oilStockKg: 0, balance: 0, lastVisitDays: 6, followUp: 'active' },
  { name: 'Samira El Ouafi', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 1920, lots: 1, oilStockKg: 0, balance: 0, lastVisitDays: 24, followUp: 'inactive' },
  { name: 'Domaine Beni Snassen', kind: 'company', siteId: SITE_BERKANE_ID, seasonKg: 22600, lots: 6, oilStockKg: 0, balance: 8150, lastVisitDays: 8, followUp: 'at-risk' },
  { name: 'Zakaria Bensaid', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2310, lots: 2, oilStockKg: 0, balance: 0, lastVisitDays: 0, followUp: 'active' },
];

const siteNameOf = (siteId: string): string => SITES_MOCK.find((site) => site.id === siteId)?.name ?? '';

const lotCode = (siteId: string, number: number): string => `${siteId === SITE_OUJDA_ID ? 'OJ' : 'BK'}-2627-${String(number).padStart(4, '0')}`;

const slugOf = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '');

const identifierOf = (seed: ISeedRecord, index: number): string =>
  seed.kind === 'company'
    ? String(150_000_000_000_000 + (index + 1) * 7_919_311_013 + 4_217)
    : `${seed.siteId === SITE_OUJDA_ID ? 'F' : 'FA'}${String(100_000 + ((index * 48_271) % 900_000)).slice(0, 6)}`;

const emailOf = (seed: ISeedRecord, index: number): string | null => {
  if (seed.kind === 'company') return `contact@${slugOf(seed.name).replace(/\./g, '-')}.ma`;
  return index % 3 === 1 ? null : `${slugOf(seed.name)}@gmail.com`;
};

export const CLIENT_RECORDS_MOCK: IClientRecord[] = SEEDS.map((seed, index) => {
  const client = CLIENTS_MOCK.find((item) => item.name === seed.name);
  const siteIds = client?.siteIds ?? [seed.siteId];
  return {
    id: client?.id ?? '',
    name: seed.name,
    kind: seed.kind,
    followUp: seed.followUp,
    phone: client?.phone ?? '',
    identifier: identifierOf(seed, index),
    region: ORIGIN_SUGGESTIONS[(index * 5) % ORIGIN_SUGGESTIONS.length],
    email: emailOf(seed, index),
    lots: seed.lots,
    oilStockKg: seed.oilStockKg,
    balance: seed.balance,
    sites: siteIds.map((siteId, siteIndex) => {
      const share = siteIds.length > 1 ? (siteIndex === 0 ? 0.7 : 0.3) : 1;
      return {
        siteId,
        siteName: siteNameOf(siteId),
        oliveKg: Math.round(seed.seasonKg * share),
        oilStockKg: Math.round(seed.oilStockKg * share),
        balance: Math.round(seed.balance * share),
      };
    }),
    history: [
      { code: lotCode(seed.siteId, 150 - index), siteName: siteNameOf(seed.siteId), status: 'pressed', kg: Math.round(seed.seasonKg / seed.lots), daysAgo: seed.lastVisitDays },
      { code: lotCode(seed.siteId, 110 - index), siteName: siteNameOf(seed.siteId), status: 'withdrawn', kg: Math.round((seed.seasonKg / seed.lots) * 0.9), daysAgo: 14 },
    ],
  };
});
