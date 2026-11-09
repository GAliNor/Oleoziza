import { mockResolve } from 'global/services/mock';
import { LOTS_MOCK_DB } from 'lot/services/lot.mock';
import { DEBT_CONTACTS_DB, MOVEMENTS_DB, REFUNDS_DB } from 'finance/services/finance.mock';
import { CLIENTS_MOCK_DB } from 'client/services/client.mock';
import { configurationOf } from 'configuration/services/configuration.mock';
import { buildActivityFeed } from 'activity/composables/activity-feed';
import type { IActivity, IActivityService } from 'activity/types/activity';

export default class ActivityMockService implements IActivityService {
  getDay(siteId: string, day: string): Promise<IActivity[]> {
    const ofSite = <T extends { siteId: string }>(items: readonly T[]): T[] => items.filter((item) => item.siteId === siteId);
    return mockResolve(
      buildActivityFeed(
        {
          lots: ofSite(LOTS_MOCK_DB),
          movements: ofSite(MOVEMENTS_DB),
          refunds: ofSite(REFUNDS_DB),
          debtContacts: ofSite(DEBT_CONTACTS_DB),
          configurationChanges: configurationOf(siteId).history,
          clientNames: Object.fromEntries(CLIENTS_MOCK_DB.map((client) => [client.id, client.name])),
        },
        day,
      ),
    );
  }
}
