import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'global/constants/mock-sites';
import type { IClient } from 'global/types/client';

export const CLIENTS_MOCK: IClient[] = [
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
];
