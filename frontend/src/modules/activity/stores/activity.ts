import { defineStore } from 'pinia';

import ActivityService from 'activity/services/activity';
import { withStatus } from 'global/composables/with-status';
import { PAGE_SIZE } from 'global/constants/page';
import type { IActivityFilter, IActivityQuery, IActivityStore } from 'activity/types/activity';

const activityService = new ActivityService();

const isSameQuery = (first: IActivityQuery | null, second: IActivityQuery): boolean =>
  !!first && first.siteId === second.siteId && first.day === second.day && first.group === second.group && first.person === second.person && first.includeMoney === second.includeMoney;

/** One day of a Site's Activity Feed: its summary, and its events a page at a time. */
export const useActivityStore = defineStore('activity', {
  state: (): IActivityStore => ({
    summary: null,
    items: [],
    total: 0,
    query: null,
    loadedDay: null,
    isLoading: false,
    isLoadingMore: false,
    hasError: false,
  }),
  getters: {
    hasMore: (state): boolean => state.items.length < state.total,
  },
  actions: {
    /** A new day or Site: its summary and first page together, so they change at once on screen. */
    async fetchDay(siteId: string, day: string, filter: IActivityFilter): Promise<void> {
      const query = { siteId, day, ...filter };
      this.query = query;
      const result = await withStatus(
        this,
        'isLoading',
        () => Promise.all([activityService.getDaySummary(siteId, day, filter.includeMoney), activityService.getDayPage(siteId, day, filter, { offset: 0, limit: PAGE_SIZE })]),
        { errorFlag: 'hasError' },
      );
      if (!result || !isSameQuery(this.query, query)) return;
      const [summary, page] = result;
      this.summary = summary;
      this.items = page.items;
      this.total = page.total;
      this.loadedDay = day;
    },
    /** Another group or person on the same day: the summary stays, the list restarts from its first page. */
    async fetchFiltered(filter: IActivityFilter): Promise<void> {
      if (!this.query) return;
      const query = { ...this.query, ...filter };
      if (isSameQuery(this.query, query)) return;
      this.query = query;
      const page = await withStatus(this, 'isLoading', () => activityService.getDayPage(query.siteId, query.day, filter, { offset: 0, limit: PAGE_SIZE }), { errorFlag: 'hasError' });
      if (!page || !isSameQuery(this.query, query)) return;
      this.items = page.items;
      this.total = page.total;
    },
    async fetchMore(): Promise<void> {
      const query = this.query;
      if (!query || this.isLoadingMore || !this.hasMore) return;
      const page = await withStatus(this, 'isLoadingMore', () => activityService.getDayPage(query.siteId, query.day, query, { offset: this.items.length, limit: PAGE_SIZE }));
      if (!page || !isSameQuery(this.query, query)) return;
      this.items = [...this.items, ...page.items];
      this.total = page.total;
    },
  },
});
