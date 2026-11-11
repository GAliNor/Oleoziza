import { defineStore } from 'pinia';

import SeasonService from 'season/services/season';
import { withStatus } from 'global/composables/with-status';
import type { ISeason, ISeasonStore, SeasonArtVariant } from 'season/types/season';

const seasonService = new SeasonService();

/** The harvest Seasons, shared by every Site: one open at a time, the next one prepared ahead. */
export const useSeasonStore = defineStore('season', {
  state: (): ISeasonStore => ({
    seasons: [],
    isLoading: false,
    isSaving: false,
    hasError: false,
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
    async fetchSeasons(): Promise<void> {
      const seasons = await withStatus(this, 'isLoading', () => seasonService.getAll(), { errorFlag: 'hasError' });
      if (seasons) this.seasons = seasons;
    },
    async prepareNext(): Promise<ISeason | null> {
      const season = await withStatus(this, 'isSaving', () => seasonService.prepareNext());
      if (season) this.seasons.push(season);
      return season;
    },
    async open(id: string): Promise<ISeason | null> {
      const season = await withStatus(this, 'isSaving', () => seasonService.open(id));
      if (season) await this.fetchSeasons();
      return season;
    },
    async uploadIllustration(id: string, variant: SeasonArtVariant, file: File): Promise<ISeason | null> {
      const season = await withStatus(this, 'isSaving', () => seasonService.uploadIllustration(id, variant, file));
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
