import { mockResolve } from 'global/services/mock';
import { slicePage } from 'global/composables/page';
import { LOTS_MOCK_DB } from 'lot/services/lot.mock';
import { DEBT_CONTACTS_DB, MOVEMENTS_DB, REFUNDS_DB } from 'finance/services/finance.mock';
import { CLIENTS_MOCK_DB } from 'client/services/client.mock';
import { EXPENSES_DB } from 'expense/services/expense.mock';
import { configurationOf } from 'configuration/services/configuration.mock';
import { buildActivityFeed, daySummary, filterFeed } from 'activity/composables/activity-feed';
import type { IPage, IPageQuery } from 'global/types/page';
import type { IActivity, IActivityDaySummary, IActivityFilter, IActivityService } from 'activity/types/activity';

const dayFeed = (siteId: string, day: string): IActivity[] => {
  const ofSite = <T extends { siteId: string }>(items: readonly T[]): T[] => items.filter((item) => item.siteId === siteId);
  return buildActivityFeed(
    {
      lots: ofSite(LOTS_MOCK_DB),
      movements: ofSite(MOVEMENTS_DB),
      refunds: ofSite(REFUNDS_DB),
      expenses: ofSite(EXPENSES_DB),
      debtContacts: ofSite(DEBT_CONTACTS_DB),
      configurationChanges: configurationOf(siteId).history,
      clientNames: Object.fromEntries(CLIENTS_MOCK_DB.map((client) => [client.id, client.name])),
    },
    day,
  );
};

export default class ActivityMockService implements IActivityService {
  getDaySummary(siteId: string, day: string, includeMoney: boolean): Promise<IActivityDaySummary> {
    return mockResolve(daySummary(filterFeed(dayFeed(siteId, day), { group: null, person: null, includeMoney })));
  }

  getDayPage(siteId: string, day: string, filter: IActivityFilter, page: IPageQuery): Promise<IPage<IActivity>> {
    return mockResolve(slicePage(filterFeed(dayFeed(siteId, day), filter), page));
  }
}
