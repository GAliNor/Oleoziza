import { shiftDate, todayIso } from 'global/composables/date';
import { PREVIOUS_SEASON, SEASON_START } from 'global/constants/period';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { ExpensePaidBy, IExpense } from 'expense/types/expense';

interface ISeedExpense {
  siteId: string;
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  vatRate: number | null;
  supplier: string;
  supplierIce?: string;
  invoiceNumber?: string;
  paidBy: ExpensePaidBy;
  recordedBy?: string;
}

const ACCOUNTANT = 'Nadia Boukili';
const OWNER = 'Mohammed Taibi';
const SITE_CODES: Record<string, string> = { [SITE_OUJDA_ID]: 'OJ', [SITE_BERKANE_ID]: 'BK' };
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const SEASON_MONTHS = new Set([10, 11, 12, 1, 2]);

const isSeasonMonth = (isoDate: string): boolean => SEASON_MONTHS.has(Number(isoDate.slice(5, 7)));

const monthName = (isoDate: string): string => `${MONTHS[Number(isoDate.slice(5, 7)) - 1]} ${isoDate.slice(0, 4)}`;

/** The 5th of every month from the previous Season's start up to today. */
const monthlyDates = (today: string): string[] => {
  const dates: string[] = [];
  for (let cursor = new Date(`${PREVIOUS_SEASON.from}T12:00:00Z`); ; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const date = `${cursor.toISOString().slice(0, 7)}-05`;
    if (date > today) return dates;
    dates.push(date);
  }
};

const monthly = (date: string): ISeedExpense[] => {
  const inSeason = isSeasonMonth(date);
  const month = monthName(date);
  return [
    { siteId: SITE_OUJDA_ID, date, categoryId: 'salaries', description: `Salaires ${month}`, amount: inSeason ? 38400 : 14200, vatRate: null, supplier: 'Personnel AMANA OLIVE D’ORIENT', paidBy: 'transfer' },
    { siteId: SITE_OUJDA_ID, date, categoryId: 'cnss', description: `CNSS ${month}`, amount: inSeason ? 8150 : 3010, vatRate: null, supplier: 'CNSS', paidBy: 'transfer' },
    { siteId: SITE_BERKANE_ID, date, categoryId: 'salaries', description: `Salaires ${month}`, amount: inSeason ? 25600 : 9100, vatRate: null, supplier: 'Personnel Huilerie Berkane', paidBy: 'transfer' },
    { siteId: SITE_BERKANE_ID, date, categoryId: 'cnss', description: `CNSS ${month}`, amount: inSeason ? 5430 : 1930, vatRate: null, supplier: 'CNSS', paidBy: 'transfer' },
    { siteId: SITE_OUJDA_ID, date, categoryId: 'electricity', description: `Électricité ${month}`, amount: inSeason ? 11280 : 1860, vatRate: 20, supplier: 'ONEE Branche Électricité', supplierIce: '001531219000038', invoiceNumber: `E-${date.slice(0, 7)}-OJ`, paidBy: 'transfer' },
    { siteId: SITE_BERKANE_ID, date, categoryId: 'electricity', description: `Électricité ${month}`, amount: inSeason ? 7420 : 1240, vatRate: 20, supplier: 'ONEE Branche Électricité', supplierIce: '001531219000038', invoiceNumber: `E-${date.slice(0, 7)}-BK`, paidBy: 'transfer' },
    { siteId: SITE_OUJDA_ID, date, categoryId: 'water', description: `Eau ${month}`, amount: inSeason ? 1320 : 340, vatRate: 10, supplier: 'RADEEO', invoiceNumber: `W-${date.slice(0, 7)}`, paidBy: 'transfer' },
    { siteId: SITE_BERKANE_ID, date, categoryId: 'rent', description: `Loyer ${month}`, amount: 6500, vatRate: null, supplier: 'Famille Lahlou (bailleur)', paidBy: 'cheque' },
    { siteId: SITE_OUJDA_ID, date, categoryId: 'internet', description: `Internet et téléphone ${month}`, amount: 690, vatRate: 20, supplier: 'Maroc Telecom', invoiceNumber: `MT-${date.slice(0, 7)}`, paidBy: 'transfer' },
    { siteId: SITE_OUJDA_ID, date, categoryId: 'server_cloud', description: `Serveur de l’application ${month}`, amount: 480, vatRate: 20, supplier: 'Hébergeur cloud', paidBy: 'card' },
    ...(inSeason ? [{ siteId: SITE_OUJDA_ID, date, categoryId: 'seasonal_workers', description: `Saisonniers ${month}`, amount: 13500, vatRate: null, supplier: 'Équipe saisonnière', paidBy: 'cash' as const }] : []),
    ...(Number(date.slice(5, 7)) % 3 === 1 ? [{ siteId: SITE_OUJDA_ID, date, categoryId: 'accountant', description: `Honoraires comptables, trimestre de ${month}`, amount: 3600, vatRate: 20, supplier: 'Fiduciaire Oriental Conseil', supplierIce: '002145876000091', invoiceNumber: `FOC-${date.slice(0, 7)}`, paidBy: 'transfer' as const }] : []),
  ];
};

/** Small, frequent Expenses over the last six weeks, so every period shows some. */
const recent = (today: string): ISeedExpense[] => {
  const rows: ISeedExpense[] = [];
  for (let daysAgo = 1; daysAgo <= 42; daysAgo += 1) {
    const date = shiftDate(today, -daysAgo);
    const fuelId = daysAgo > 35 ? 'generator_diesel' : 'site_fuel';
    if (daysAgo % 4 === 1) rows.push({ siteId: SITE_OUJDA_ID, date, categoryId: fuelId, description: `Gasoil, ${190 + (daysAgo % 3) * 10} L`, amount: 2350 + (daysAgo % 3) * 120, vatRate: 10, supplier: 'Station-service route de Taourirt', supplierIce: '001622390000071', invoiceNumber: `BON-${date}`, paidBy: 'cash' });
    if (daysAgo % 6 === 2) rows.push({ siteId: SITE_OUJDA_ID, date, categoryId: 'staff_meals', description: 'Café, eau et casse-croûte de l’équipe', amount: 640, vatRate: null, supplier: 'Café Al Andalous', paidBy: 'cash' });
    if (daysAgo % 8 === 6) rows.push({ siteId: SITE_OUJDA_ID, date, categoryId: 'olive_pomace', description: 'Grignon d’olive pour la chaudière, 4 t', amount: 2400, vatRate: null, supplier: 'Huilerie Al Baraka (grignon)', paidBy: 'cash' });
    if (daysAgo % 7 === 3) rows.push({ siteId: SITE_BERKANE_ID, date, categoryId: fuelId, description: 'Gasoil, 140 L', amount: 1780, vatRate: 10, supplier: 'Station-service Berkane centre', supplierIce: '001733120000045', invoiceNumber: `BON-${date}`, paidBy: 'cash' });
    if (daysAgo % 9 === 4) rows.push({ siteId: SITE_OUJDA_ID, date, categoryId: 'cleaning_products', description: 'Produits de nettoyage et gants', amount: 860, vatRate: 20, supplier: 'Droguerie Al Wahda', invoiceNumber: `DW-${date}`, paidBy: 'cash' });
    if (daysAgo % 10 === 5) rows.push({ siteId: SITE_OUJDA_ID, date, categoryId: 'greasing', description: 'Graisse pour les malaxeurs et le décanteur', amount: 1150, vatRate: 20, supplier: 'Lubrifiants de l’Oriental', supplierIce: '002011876000033', invoiceNumber: `LO-${date}`, paidBy: 'cash' });
    if (daysAgo % 12 === 2) rows.push({ siteId: SITE_OUJDA_ID, date, categoryId: 'olives', description: 'Picholine, 1,1 t, verger de Sidi Bouhria', amount: 9200, vatRate: null, supplier: 'Ahmed Bensaid (agriculteur)', paidBy: 'cash' });
  }
  rows.push({ siteId: SITE_OUJDA_ID, date: shiftDate(today, -8), categoryId: 'lab_analyses', description: 'Analyse de l’huile (acidité, peroxydes)', amount: 1200, vatRate: 20, supplier: 'Laboratoire agro-alimentaire d’Oujda', supplierIce: '002233440000019', invoiceNumber: 'LAB-2611-17', paidBy: 'cheque' });
  rows.push({ siteId: SITE_OUJDA_ID, date: shiftDate(today, -15), categoryId: 'bottles', description: 'Bouteilles 1 L et bidons 5 L', amount: 18600, vatRate: 20, supplier: 'Emballages du Maroc oriental', supplierIce: '001987654000027', invoiceNumber: 'EMO-4471', paidBy: 'transfer' });
  rows.push({ siteId: SITE_BERKANE_ID, date: shiftDate(today, -10), categoryId: 'spare_parts', description: 'Joints et vis sans fin du malaxeur', amount: 4300, vatRate: 20, supplier: 'Atelier mécanique Berkane', invoiceNumber: 'AMB-118', paidBy: 'cheque' });
  return rows;
};

const OFF_SEASON: ISeedExpense[] = [
  { siteId: SITE_OUJDA_ID, date: '2026-08-12', categoryId: 'machine_upkeep', description: 'Révision du décanteur et des malaxeurs', amount: 28400, vatRate: 20, supplier: 'Atelier mécanique Berkane', supplierIce: '002301458000054', invoiceNumber: 'AMB-097', paidBy: 'transfer' },
  { siteId: SITE_OUJDA_ID, date: '2026-08-20', categoryId: 'spare_parts', description: 'Couteaux du broyeur, tamis', amount: 9600, vatRate: 20, supplier: 'Oléo Équipement Casablanca', invoiceNumber: 'OEC-2208', paidBy: 'transfer' },
  { siteId: SITE_OUJDA_ID, date: '2026-09-08', categoryId: 'painting', description: 'Peinture de la salle de pressage', amount: 4500, vatRate: null, supplier: 'Peintre (auto-entrepreneur)', paidBy: 'cash' },
  { siteId: SITE_OUJDA_ID, date: '2026-09-14', categoryId: 'weighbridge_check', description: 'Vérification du pont-bascule', amount: 1500, vatRate: 20, supplier: 'Bureau de métrologie', invoiceNumber: 'MET-0914', paidBy: 'cheque' },
  { siteId: SITE_OUJDA_ID, date: '2026-10-20', categoryId: 'machines', description: 'Malaxeur n° 5', amount: 186000, vatRate: 20, supplier: 'Oléo Équipement Casablanca', supplierIce: '001456789000012', invoiceNumber: 'OEC-2291', paidBy: 'transfer', recordedBy: OWNER },
  { siteId: SITE_OUJDA_ID, date: '2026-10-02', categoryId: 'extinguishers', description: 'Recharge des extincteurs', amount: 1800, vatRate: 20, supplier: 'Sécurité Incendie Oriental', invoiceNumber: 'SIO-552', paidBy: 'cheque' },
  { siteId: SITE_OUJDA_ID, date: '2026-10-09', categoryId: 'onssa', description: 'Autorisation sanitaire ONSSA', amount: 1000, vatRate: null, supplier: 'ONSSA', paidBy: 'transfer' },
  { siteId: SITE_OUJDA_ID, date: '2026-10-15', categoryId: 'fire_insurance', description: 'Assurance incendie, campagne 2026-2027', amount: 7400, vatRate: null, supplier: 'Assureur', invoiceNumber: 'POL-26-118', paidBy: 'transfer' },
  { siteId: SITE_BERKANE_ID, date: '2025-10-10', categoryId: 'tanks', description: 'Cuve inox 10 000 L', amount: 42000, vatRate: 20, supplier: 'Inox Fès', invoiceNumber: 'IF-2025-301', paidBy: 'transfer', recordedBy: OWNER },
  { siteId: SITE_BERKANE_ID, date: '2026-09-25', categoryId: 'pest_control', description: 'Dératisation avant la campagne', amount: 900, vatRate: 20, supplier: 'Hygiène 3D Oriental', paidBy: 'cash' },
  { siteId: SITE_OUJDA_ID, date: '2026-01-20', categoryId: 'trade_fairs', description: 'Stand au salon de l’olivier', amount: 5200, vatRate: 20, supplier: 'Organisateur du salon', paidBy: 'transfer' },
];

const paymentReference = (seed: ISeedExpense, index: number): string => {
  if (seed.paidBy === 'cheque') return `Chèque n° ${4410200 + index}`;
  return seed.paidBy === 'transfer' ? `Virement ${seed.date.replaceAll('-', '')}-${index}` : '';
};

const seasonCode = (date: string): string => (date >= SEASON_START ? '2627' : '2526');

/** A drawn invoice, standing in for the photo the Accountant takes. */
const invoiceImage = (seed: ISeedExpense, code: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
    <rect width="360" height="480" rx="10" fill="#FFFFFF" stroke="#D6D3D1"/>
    <text x="24" y="44" font-family="sans-serif" font-size="17" font-weight="700" fill="#1C1917">${seed.supplier}</text>
    <text x="24" y="66" font-family="monospace" font-size="11" fill="#78716C">${seed.supplierIce ? `ICE ${seed.supplierIce}` : ''}</text>
    <text x="336" y="44" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="700" fill="#44403C">FACTURE</text>
    <text x="336" y="66" text-anchor="end" font-family="monospace" font-size="11" fill="#78716C">${seed.invoiceNumber ?? ''}</text>
    <line x1="24" y1="92" x2="336" y2="92" stroke="#E7E5E4"/>
    <text x="24" y="130" font-family="sans-serif" font-size="13" fill="#44403C">${seed.description}</text>
    <text x="24" y="152" font-family="sans-serif" font-size="11" fill="#78716C">${seed.date} · ${code}</text>
    <line x1="24" y1="380" x2="336" y2="380" stroke="#E7E5E4"/>
    <text x="24" y="416" font-family="sans-serif" font-size="12" fill="#78716C">${seed.vatRate ? `dont TVA ${seed.vatRate} %` : 'Sans TVA'}</text>
    <text x="336" y="420" text-anchor="end" font-family="sans-serif" font-size="24" font-weight="700" fill="#1C1917">${seed.amount} DH TTC</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const nextCode = (sequences: Map<string, number>, siteId: string, date: string): string => {
  const key = `${siteId}:${seasonCode(date)}`;
  const sequence = (sequences.get(key) ?? 0) + 1;
  sequences.set(key, sequence);
  return `${SITE_CODES[siteId]}-C${seasonCode(date)}-${String(sequence).padStart(4, '0')}`;
};

const buildExpenses = (): IExpense[] => {
  const today = todayIso();
  const seeds = [...monthlyDates(today).flatMap(monthly), ...recent(today), ...OFF_SEASON].filter((seed) => seed.date <= today).sort((first, second) => first.date.localeCompare(second.date));
  const sequences = new Map<string, number>();
  const expenses = seeds.map((seed, index): IExpense => {
    const code = nextCode(sequences, seed.siteId, seed.date);
    const recordedAt = `${seed.date}T${String(9 + (index % 8)).padStart(2, '0')}:15:00+01:00`;
    return {
      id: `expense-${String(index + 1).padStart(4, '0')}`,
      code,
      siteId: seed.siteId,
      date: seed.date,
      categoryId: seed.categoryId,
      description: seed.description,
      amount: seed.amount,
      vatRate: seed.vatRate,
      supplierId: null,
      supplier: seed.supplier,
      supplierIce: seed.supplierIce ?? '',
      supplierIf: '',
      invoiceNumber: seed.invoiceNumber ?? '',
      invoiceDate: seed.invoiceNumber ? shiftDate(seed.date, -3) : null,
      paidBy: seed.paidBy,
      paymentReference: paymentReference(seed, index),
      documents: seed.invoiceNumber ? [{ id: `doc-expense-${index + 1}`, name: `Facture ${seed.invoiceNumber}`, url: invoiceImage(seed, code), isPdf: false, addedBy: seed.recordedBy ?? ACCOUNTANT, addedAt: recordedAt }] : [],
      status: 'recorded',
      recordedBy: seed.recordedBy ?? ACCOUNTANT,
      recordedAt,
    };
  });
  const duplicate = [...expenses].reverse().find((expense) => expense.categoryId === 'electricity' && expense.siteId === SITE_OUJDA_ID);
  if (duplicate) {
    expenses.push({ ...duplicate, id: 'expense-duplicate', code: nextCode(sequences, duplicate.siteId, duplicate.date), status: 'cancelled', cancelledBy: OWNER, cancelledAt: duplicate.recordedAt, cancelReason: 'Saisie en double' });
  }
  return expenses.reverse();
};

export const EXPENSES_MOCK: IExpense[] = buildExpenses();
