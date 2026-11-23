import { defineStore } from 'pinia';

import { i18n } from '~/plugins/i18n';

import SeasonService from 'season/services/season';
import { withStatus } from 'global/composables/with-status';
import { keepSeasonDates } from 'global/composables/season-dates';
import { cachedLoad, invalidateLoads, LOAD_TTL_MS } from 'global/composables/cached-load';
import type { ISeason, ISeasonStore } from 'season/types/season';

const seasonService = new SeasonService();

/** The harvest Seasons, shared by every Site: one open at a time, the next one prepared ahead. */
export const useSeasonStore = defineStore('season', {
  state: (): ISeasonStore => ({
    seasons: [],
    illustrations: [],
    isLoaded: false,
    isLoading: false,
    isLoadingIllustrations: false,
    isSaving: false,
    saveErrorCode: null,
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
              this.keep(await seasonService.getAll());
            },
            isForced,
          ),
        { errorFlag: 'hasError' },
      );
    },
    /** Every list of Seasons goes through here, so the periods « Saison » follow their real dates. */
    keep(seasons: ISeason[]): void {
      this.seasons = seasons;
      this.isLoaded = true;
      keepSeasonDates(seasons.filter((season) => season.status !== 'planned').map((season) => season.startsOn));
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
      const season = await this.run(() => seasonService.prepareNext(seasonIllustrationId));
      if (season) this.keep([...this.seasons, season]);
      return season;
    },
    async open(id: string): Promise<ISeason | null> {
      const season = await this.run(() => seasonService.open(id));
      if (season) await this.reloadAfterChange();
      return season;
    },
    async close(id: string): Promise<ISeason | null> {
      const season = await this.run(() => seasonService.close(id));
      if (season) await this.reloadAfterChange();
      return season;
    },
    async reopen(id: string): Promise<ISeason | null> {
      const season = await this.run(() => seasonService.reopen(id));
      if (season) await this.reloadAfterChange();
      return season;
    },
    async delete(id: string): Promise<boolean> {
      const isDeleted = await this.run(async () => {
        await seasonService.delete(id);
        return true;
      });
      if (isDeleted) await this.reloadAfterChange();
      return !!isDeleted;
    },
    /** Its name stays; a refusal is told under the dates, by its code. */
    async setDates(id: string, startsOn: string, endsOn: string): Promise<ISeason | null> {
      const season = await withStatus(this, 'isSaving', () => seasonService.setDates(id, startsOn, endsOn), { errorCode: 'saveErrorCode' });
      if (!season) return null;
      ['expense-summary:', 'sales:', 'dashboard:', 'movements:'].forEach(invalidateLoads);
      await this.reloadAfterChange();
      return season;
    },
    async chooseIllustration(id: string, seasonIllustrationId: string | null): Promise<ISeason | null> {
      const season = await this.run(() => seasonService.chooseIllustration(id, seasonIllustrationId));
      if (season) this.keep(this.seasons.map((item) => (item.id === season.id ? season : item)));
      return season;
    },
    /** A refusal is told in its own words. */
    run<T>(task: () => Promise<T>): Promise<T | null> {
      return withStatus(this, 'isSaving', task, { errorMessage: i18n.global.t('configuration.saveError') });
    },
    /** Opening, closing or deleting a Season changes the others, the prices in force and every list read for the open Season. */
    async reloadAfterChange(): Promise<void> {
      invalidateLoads('configuration:');
      invalidateLoads('lots:');
      await this.fetchSeasons(true);
    },
  },
});
