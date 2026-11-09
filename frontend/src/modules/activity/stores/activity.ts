import { defineStore } from 'pinia';

import ActivityService from 'activity/services/activity';
import { withStatus } from 'global/composables/with-status';
import type { IActivityStore } from 'activity/types/activity';

const activityService = new ActivityService();

/** One day of a Site's Activity Feed. */
export const useActivityStore = defineStore('activity', {
  state: (): IActivityStore => ({
    items: [],
    query: null,
    isLoading: false,
    hasError: false,
  }),
  actions: {
    async fetchDay(siteId: string, day: string): Promise<void> {
      this.query = { siteId, day };
      const items = await withStatus(this, 'isLoading', () => activityService.getDay(siteId, day), { errorFlag: 'hasError' });
      if (items && this.query.siteId === siteId && this.query.day === day) this.items = items;
    },
  },
});
