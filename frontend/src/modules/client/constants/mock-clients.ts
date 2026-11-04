import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { IClient } from 'client/types/client';

const LISTED_CLIENTS: Omit<IClient, 'identifier'>[] = [
  { id: 'c0a1b2c3-0001-4000-8000-000000000001', kind: 'individual', name: 'Mohammed Benali', phone: '+212661234518', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000002', kind: 'individual', name: 'Fatima Zahra El Idrissi', phone: '+212670881240', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000003', kind: 'company', name: 'Coopérative Angad', phone: '+212536682109', siteIds: [SITE_OUJDA_ID, SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000004', kind: 'individual', name: 'Abdellah Moussaoui', phone: '+212662479033', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000005', kind: 'individual', name: 'Khadija Bouzidi', phone: '+212655107762', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000006', kind: 'individual', name: 'Mustapha Ouchen', phone: '+212668310594', siteIds: [SITE_OUJDA_ID, SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000007', kind: 'individual', name: 'Said Tahiri', phone: '+212661921827', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000008', kind: 'individual', name: 'Youssef Kaddouri', phone: '+212672554011', siteIds: [SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000009', kind: 'company', name: 'Domaine Zegzel', phone: '+212536614470', siteIds: [SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000010', kind: 'individual', name: 'Rkia Hammouti', phone: '+212650036685', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000011', kind: 'individual', name: 'Latifa Berrada', phone: '+212671203398', siteIds: [SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000012', kind: 'individual', name: 'Abdelhak Bouhaddou', phone: '+212661407732', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000013', kind: 'individual', name: 'Aicha Zerrouki', phone: '+212670553218', siteIds: [SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000014', kind: 'company', name: 'Coopérative Ain Sfa', phone: '+212536690144', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000015', kind: 'individual', name: 'Brahim Lamrani', phone: '+212662818045', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000016', kind: 'individual', name: 'Fouzia Belkadi', phone: '+212655742906', siteIds: [SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000017', kind: 'individual', name: 'Jamal Ouazzani', phone: '+212668114573', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000018', kind: 'company', name: 'Huileries Triffa SARL', phone: '+212536625581', siteIds: [SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000019', kind: 'individual', name: 'Karim Mansouri', phone: '+212671980327', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000020', kind: 'individual', name: 'Malika Tazi', phone: '+212650417760', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000021', kind: 'individual', name: 'Noureddine Haddouchi', phone: '+212663250918', siteIds: [SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000022', kind: 'individual', name: 'Omar Chergui', phone: '+212672036411', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000023', kind: 'individual', name: 'Samira El Ouafi', phone: '+212661553794', siteIds: [SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000024', kind: 'company', name: 'Domaine Beni Snassen', phone: '+212536618932', siteIds: [SITE_BERKANE_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000025', kind: 'individual', name: 'Zakaria Bensaid', phone: '+212669741205', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000026', kind: 'company', name: 'Restaurant Al Andalous', phone: '+212536684417', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000027', kind: 'company', name: 'Épicerie Zitouna', phone: '+212536702286', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
  { id: 'c0a1b2c3-0001-4000-8000-000000000028', kind: 'company', name: 'Hôtel Atlas Oujda', phone: '+212536691350', siteIds: [SITE_OUJDA_ID], isPendingSync: false },
];

const EXTRA_CLIENT_NAMES = [
  'Driss Amrani', 'Naima Lahlou', 'Hassan Ziani', 'Abdellah Mansouri', 'Fatima Zahra Elidrissi', 'Coopérative Zegzel', 'Mustapha Kaddouri', 'Naima Belhaj',
  'Yassine Amrani', 'Domaine Sidi Yahya', 'Rachid Ouali', 'Aicha Bennani', 'Driss Lahlou', 'Karima Tazi', 'Omar Benjelloun', 'Huilerie Taourirt', 'Brahim Saidi',
  'Zineb Chraibi', 'Mehdi Alaoui', 'Hafida Bouchta', 'Youssef Ghali', 'Latifa Hamdouchi', 'Coopérative Ahfir', 'Malika Tazi',
];

const COMPANY_NAME_PATTERN = /coop|domaine|sarl|huilerie/i;

const EXTRA_CLIENTS: Omit<IClient, 'identifier'>[] = EXTRA_CLIENT_NAMES.filter((name) => !LISTED_CLIENTS.some((client) => client.name === name)).map((name, index) => ({
  id: `c0a1b2c3-0002-4000-8000-${String(index + 1).padStart(12, '0')}`,
  kind: COMPANY_NAME_PATTERN.test(name) ? 'company' : 'individual',
  name,
  phone: `+21266${String(1100000 + index * 7919).padStart(7, '0')}`,
  siteIds: index % 3 === 2 ? [SITE_BERKANE_ID] : [SITE_OUJDA_ID],
  isPendingSync: false,
}));

export const CLIENTS_MOCK: IClient[] = [...LISTED_CLIENTS, ...EXTRA_CLIENTS].map((client) => ({ ...client, identifier: null }));
