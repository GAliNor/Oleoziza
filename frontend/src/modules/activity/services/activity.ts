import BaseService, { isMockModule } from 'global/services/base';
import ActivityMockService from 'activity/services/activity.mock';
import type { IPage, IPageQuery } from 'global/types/page';
import type { IActivity, IActivityDaySummary, IActivityFilter, IActivityService } from 'activity/types/activity';

type JournalEvent = Omit<IActivity, 'to'> & { entityType: string; entityId: string | null };

/** Where an event leads: its Lot, its Payment, the Refunds, its Expense, the debt follow-up or the Configuration. */
const linkOf = (entityType: string, entityId: string | null): IActivity['to'] => {
  if (entityType === 'configuration') return { name: 'configuration' };
  if (entityType === 'client') return { name: 'debt-follow-up' };
  if (entityType === 'refund') return { name: 'finance', query: { tab: 'refunds' } };
  if (!entityId) return null;
  if (entityType === 'lot') return { name: 'lot', query: { lot: entityId } };
  if (entityType === 'payment') return { name: 'finance', query: { movement: entityId } };
  if (entityType === 'expense') return { name: 'expense', query: { expense: entityId } };
  return null;
};

class ActivityApiService extends BaseService implements IActivityService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/audit/journal`;

  /** Money events are kept or left out by the backend from the session's finance.view. */
  getDaySummary(siteId: string, day: string): Promise<IActivityDaySummary> {
    return this.request<IActivityDaySummary>({ method: 'GET', url: `${this._BASE_API_URL}/summary`, params: { siteId, day } });
  }

  async getDayPage(siteId: string, day: string, filter: IActivityFilter, page: IPageQuery): Promise<IPage<IActivity>> {
    const answer = await this.request<IPage<JournalEvent>>({
      method: 'GET',
      url: this._BASE_API_URL,
      params: { siteId, day, group: filter.group ?? undefined, person: filter.person ?? undefined, offset: page.offset, limit: page.limit },
    });
    return { total: answer.total, items: answer.items.map(({ entityType, entityId, ...event }) => ({ ...event, to: linkOf(entityType, entityId) })) };
  }
}

export default isMockModule('activity') ? ActivityMockService : ActivityApiService;
