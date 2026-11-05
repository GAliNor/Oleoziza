import { daysSince, shiftDate, todayIso } from 'global/composables/date';
import { SEASON_START } from 'global/constants/period';
import { CLIENTS_MOCK } from 'client/constants/mock-clients';
import { ORIGIN_SUGGESTIONS } from 'reception/constants/reception';
import { SITES_MOCK, SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { ClientFollowUp, ClientKind, IClientLotLine, IClientRecord } from 'client/types/client';
import type { ProvinceId } from 'territory/types/territory';

interface ISeedRecord {
  name: string;
  kind: ClientKind;
  siteId: string;
  seasonKg: number;
  lots: number;
  oilStockLitres: number;
  balance: number;
  lastVisitDays: number;
  followUp: ClientFollowUp;
}

const SEEDS: ISeedRecord[] = [
  { name: 'Coopérative Angad', kind: 'company', siteId: SITE_OUJDA_ID, seasonKg: 48200, lots: 12, oilStockLitres: 0, balance: 12400, lastVisitDays: 0, followUp: 'at-risk' },
  { name: 'Domaine Zegzel', kind: 'company', siteId: SITE_BERKANE_ID, seasonKg: 36900, lots: 8, oilStockLitres: 0, balance: 4120, lastVisitDays: 0, followUp: 'active' },
  { name: 'Mohammed Benali', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 5140, lots: 3, oilStockLitres: 450, balance: 920, lastVisitDays: 0, followUp: 'active' },
  { name: 'Said Tahiri', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 4310, lots: 2, oilStockLitres: 425, balance: 1025, lastVisitDays: 0, followUp: 'active' },
  { name: 'Hassan Ziani', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 2980, lots: 2, oilStockLitres: 188, balance: 495, lastVisitDays: 9, followUp: 'at-risk' },
  { name: 'Khadija Bouzidi', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2240, lots: 2, oilStockLitres: 0, balance: 560, lastVisitDays: 0, followUp: 'active' },
  { name: 'Latifa Berrada', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 1720, lots: 2, oilStockLitres: 165, balance: 430, lastVisitDays: 0, followUp: 'active' },
  { name: 'Rkia Hammouti', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 1200, lots: 1, oilStockLitres: 0, balance: 0, lastVisitDays: 21, followUp: 'inactive' },
  { name: 'Abdelhak Bouhaddou', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 3620, lots: 2, oilStockLitres: 0, balance: 0, lastVisitDays: 4, followUp: 'active' },
  { name: 'Aicha Zerrouki', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 1480, lots: 1, oilStockLitres: 293, balance: 740, lastVisitDays: 12, followUp: 'at-risk' },
  { name: 'Coopérative Ain Sfa', kind: 'company', siteId: SITE_OUJDA_ID, seasonKg: 27400, lots: 7, oilStockLitres: 0, balance: 6300, lastVisitDays: 1, followUp: 'active' },
  { name: 'Brahim Lamrani', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2100, lots: 1, oilStockLitres: 0, balance: 0, lastVisitDays: 26, followUp: 'inactive' },
  { name: 'Fouzia Belkadi', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 960, lots: 1, oilStockLitres: 0, balance: 0, lastVisitDays: 3, followUp: 'active' },
  { name: 'Jamal Ouazzani', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 4870, lots: 3, oilStockLitres: 666, balance: 1210, lastVisitDays: 15, followUp: 'at-risk' },
  { name: 'Huileries Triffa SARL', kind: 'company', siteId: SITE_BERKANE_ID, seasonKg: 19800, lots: 5, oilStockLitres: 0, balance: 0, lastVisitDays: 2, followUp: 'active' },
  { name: 'Karim Mansouri', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 1350, lots: 1, oilStockLitres: 0, balance: 0, lastVisitDays: 30, followUp: 'inactive' },
  { name: 'Malika Tazi', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2760, lots: 2, oilStockLitres: 544, balance: 0, lastVisitDays: 5, followUp: 'active' },
  { name: 'Noureddine Haddouchi', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 3190, lots: 2, oilStockLitres: 0, balance: 1595, lastVisitDays: 18, followUp: 'at-risk' },
  { name: 'Omar Chergui', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 840, lots: 1, oilStockLitres: 0, balance: 0, lastVisitDays: 6, followUp: 'active' },
  { name: 'Samira El Ouafi', kind: 'individual', siteId: SITE_BERKANE_ID, seasonKg: 1920, lots: 1, oilStockLitres: 0, balance: 0, lastVisitDays: 24, followUp: 'inactive' },
  { name: 'Domaine Beni Snassen', kind: 'company', siteId: SITE_BERKANE_ID, seasonKg: 22600, lots: 6, oilStockLitres: 0, balance: 8150, lastVisitDays: 8, followUp: 'at-risk' },
  { name: 'Zakaria Bensaid', kind: 'individual', siteId: SITE_OUJDA_ID, seasonKg: 2310, lots: 2, oilStockLitres: 0, balance: 0, lastVisitDays: 0, followUp: 'active' },
];

const siteNameOf = (siteId: string): string => SITES_MOCK.find((site) => site.id === siteId)?.name ?? '';

const ORIGIN_PROVINCES: Record<string, ProvinceId> = {
  'Oujda-Angad': 'oujda-angad',
  Ahfir: 'berkane',
  Berkane: 'berkane',
  Taourirt: 'taourirt',
  Jerada: 'jerada',
  'Bni Drar': 'oujda-angad',
  Naïma: 'oujda-angad',
  Madagh: 'berkane',
  Aklim: 'berkane',
};

const STREETS = ['Rue Al Massira', 'Avenue Hassan II', 'Quartier Al Qods', 'Douar Ouled Ali', 'Route de Berkane', 'Hay Al Andalous', 'Douar Ouled Sidi Ali'];

const MOCK_MILLING_RATE = 0.5;
const HISTORY_VARIETIES = ['Picholine marocaine', 'Haouzia', 'Menara', 'Picholine marocaine', 'Arbequina'];
const CURRENT_SEASON = '2627';
const PREVIOUS_SEASON = { code: '2526', start: '2025-10-01' };
const OLDER_SEASON = { code: '2425', start: '2024-10-01' };
const SEASON_LENGTH_DAYS = 170;

const lotCode = (siteId: string, season: string, number: number): string => `${siteId === SITE_OUJDA_ID ? 'OJ' : 'BK'}-${season}-${String(number).padStart(4, '0')}`;

/** Every third lot of a Client on two Sites goes to the second one. */
const lotSiteId = (siteIds: string[], lotIndex: number): string => siteIds[siteIds.length > 1 && lotIndex % 3 === 2 ? 1 : 0];

const buildLot = (siteIds: string[], season: string, seedIndex: number, lotIndex: number, line: Pick<IClientLotLine, 'status' | 'kg' | 'receivedOn'>): IClientLotLine => {
  const siteId = lotSiteId(siteIds, lotIndex);
  const litresPerKg = 0.175 + ((seedIndex * 7 + lotIndex * 3) % 6) / 100;
  return { ...line, code: lotCode(siteId, season, 100 + seedIndex * 13 + lotIndex), siteId, siteName: siteNameOf(siteId), oilLitres: Math.round(line.kg * litresPerKg), millingRatePerKg: MOCK_MILLING_RATE, variety: HISTORY_VARIETIES[(seedIndex + lotIndex) % HISTORY_VARIETIES.length], season };
};

/** The season's lots, adding up to the seed's olives, from the last visit back towards the season's start. */
const currentSeasonLots = (seed: ISeedRecord, siteIds: string[], seedIndex: number): IClientLotLine[] => {
  const averageKg = seed.seasonKg / seed.lots;
  const stepDays = Math.max(1, Math.floor((daysSince(SEASON_START) - seed.lastVisitDays) / seed.lots));
  let remainingKg = seed.seasonKg;
  return Array.from({ length: seed.lots }, (_, lotIndex) => {
    const kg = lotIndex === seed.lots - 1 ? remainingKg : Math.round(averageKg * (lotIndex % 2 ? 0.85 : 1.15));
    remainingKg -= kg;
    const status = lotIndex === 0 && seed.oilStockLitres ? 'pressed' : 'withdrawn';
    return buildLot(siteIds, CURRENT_SEASON, seedIndex, lotIndex, { status, kg, receivedOn: shiftDate(todayIso(), -(seed.lastVisitDays + lotIndex * stepDays)) });
  });
};

const pastSeasonLots = (seed: ISeedRecord, siteIds: string[], seedIndex: number, season: { code: string; start: string }, count: number): IClientLotLine[] =>
  Array.from({ length: count }, (_, lotIndex) =>
    buildLot(siteIds, season.code, seedIndex, lotIndex, {
      status: 'withdrawn',
      kg: Math.round((seed.seasonKg / seed.lots) * (0.8 + (lotIndex % 3) * 0.15)),
      receivedOn: shiftDate(season.start, 10 + (lotIndex * 37 + seedIndex * 11) % SEASON_LENGTH_DAYS),
    }),
  );

/** One Client in five is new this season; the others go back one or two seasons. */
const clientHistory = (seed: ISeedRecord, siteIds: string[], seedIndex: number): IClientLotLine[] => {
  const isNewClient = seedIndex % 5 === 4;
  const previousCount = seed.kind === 'company' ? Math.max(2, seed.lots - 1) : (seedIndex % 3) + 1;
  const lots = [
    ...currentSeasonLots(seed, siteIds, seedIndex),
    ...(isNewClient ? [] : pastSeasonLots(seed, siteIds, seedIndex, PREVIOUS_SEASON, previousCount)),
    ...(!isNewClient && seedIndex % 2 === 0 ? pastSeasonLots(seed, siteIds, seedIndex, OLDER_SEASON, Math.ceil(previousCount / 2)) : []),
  ];
  return lots.sort((first, second) => second.receivedOn.localeCompare(first.receivedOn));
};

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
  const region = ORIGIN_SUGGESTIONS[(index * 5) % ORIGIN_SUGGESTIONS.length];
  return {
    id: client?.id ?? '',
    name: seed.name,
    kind: seed.kind,
    followUp: seed.followUp,
    phone: client?.phone ?? '',
    identifier: identifierOf(seed, index),
    region,
    province: ORIGIN_PROVINCES[region] ?? null,
    address: `${((index * 7) % 90) + 1}, ${STREETS[index % STREETS.length]}`,
    email: emailOf(seed, index),
    oilStockLitres: seed.oilStockLitres,
    balance: seed.balance,
    sites: siteIds.map((siteId, siteIndex) => {
      const share = siteIds.length > 1 ? (siteIndex === 0 ? 0.7 : 0.3) : 1;
      return {
        siteId,
        siteName: siteNameOf(siteId),
        oilStockLitres: Math.round(seed.oilStockLitres * share),
        balance: Math.round(seed.balance * share),
      };
    }),
    history: clientHistory(seed, siteIds, index),
  };
});
