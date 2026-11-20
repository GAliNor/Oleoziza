import { defineStore } from 'pinia';

import SeasonService from 'season/services/season';
import { withStatus } from 'global/composables/with-status';
import { cachedLoad, invalidateLoads, LOAD_TTL_MS } from 'global/composables/cached-load';
import type { ISeason, ISeasonStore } from 'season/types/season';

const seasonService = new SeasonService();

/** The harvest Seasons, shared by every Site: one open at a time, the next one prepared ahead. */
export const useSeasonStore = defineStore('season', {
  state: (): ISeasonStore => ({
    seasons: [],
    illustrations: [],
    isLoading: false,
    isLoadingIllustrations: false,
    isSaving: false,
    hasError: false,
    hasIllustrationsError: false,
  }),
  getters: {
    openSeason: (state): ISeason | undefined => state.seasons.find((season) => season.status === 'open'),
    plannedSeason: (state): ISeason | undefined => state.seasons.find((season) => season.status === 'planned'),
    findSeason:
      (state) =>
      (id: string | null): ISeason | undefined =>
        state.seasons.find((season) => season.id === id),
  },
  actions: {
    async fetchSeasons(isForced = false): Promise<void> {
      await withStatus(
        this,
        'isLoading',
        () =>
          cachedLoad(
            'seasons',
            LOAD_TTL_MS.configuration,
            async () => {
              this.seasons = await seasonService.getAll();
            },
            isForced,
          ),
        { errorFlag: 'hasError' },
      );
    },
    async fetchIllustrations(): Promise<void> {
      await withStatus(
        this,
        'isLoadingIllustrations',
        () =>
          cachedLoad('season-illustrations', LOAD_TTL_MS.configuration, async () => {
            this.illustrations = await seasonService.getIllustrations();
          }),
        { errorFlag: 'hasIllustrationsError' },
      );
    },
    async prepareNext(seasonIllustrationId: string | null): Promise<ISeason | null> {
      const season = await withStatus(this, 'isSaving', () => seasonService.prepareNext(seasonIllustrationId));
      if (season) this.seasons.push(season);
      return season;
    },
    async open(id: string): Promise<ISeason | null> {
      const season = await withStatus(this, 'isSaving', () => seasonService.open(id));
      if (!season) return null;
      invalidateLoads('configuration:');
      await this.fetchSeasons(true);
      return season;
    },
    async chooseIllustration(id: string, seasonIllustrationId: string | null): Promise<ISeason | null> {
      const season = await withStatus(this, 'isSaving', () => seasonService.chooseIllustration(id, seasonIllustrationId));
      if (season) this.seasons = this.seasons.map((item) => (item.id === season.id ? season : item));
      return season;
    },
    async close(id: string): Promise<ISeason | null> {
      const season = await withStatus(this, 'isSaving', () => seasonService.close(id));
      if (season) this.seasons = this.seasons.map((item) => (item.id === season.id ? season : item));
      return season;
    },
  },
});
