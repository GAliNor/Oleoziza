import { mockReject, mockResolve } from 'global/services/mock';
import { createId } from 'global/composables/crypto';
import { SEASON_ILLUSTRATIONS_MOCK, SEASONS_MOCK } from 'season/constants/mock-seasons';
import type { ISeason, ISeasonIllustration, ISeasonService } from 'season/types/season';

/** The mock Seasons, read by the configuration mock to date its prices. */
export const SEASONS_MOCK_DB: ISeason[] = structuredClone(SEASONS_MOCK);

export default class SeasonMockService implements ISeasonService {
  getAll(): Promise<ISeason[]> {
    return mockResolve([...SEASONS_MOCK_DB].sort((a, b) => a.startsOn.localeCompare(b.startsOn)));
  }

  getIllustrations(): Promise<ISeasonIllustration[]> {
    return mockResolve([...SEASON_ILLUSTRATIONS_MOCK]);
  }

  prepareNext(seasonIllustrationId: string | null): Promise<ISeason> {
    if (SEASONS_MOCK_DB.some((season) => season.status === 'planned')) return mockReject({ code: 'season_already_planned' });
    const illustration = findIllustration(seasonIllustrationId);
    if (illustration === undefined) return mockReject({ code: 'season_illustration_not_found' });
    const latest = [...SEASONS_MOCK_DB].sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
    const year = Number(latest.startsOn.slice(0, 4)) + 1;
    const season: ISeason = {
      id: createId(),
      code: `${String(year).slice(2)}${String(year + 1).slice(2)}`,
      label: `Saison ${year}-${year + 1}`,
      startsOn: `${year}-11-01`,
      endsOn: `${year + 1}-01-31`,
      status: 'planned',
      closedAt: null,
      ...buildIllustrationFields(illustration),
    };
    SEASONS_MOCK_DB.push(season);
    return mockResolve(season);
  }

  open(id: string): Promise<ISeason> {
    const season = SEASONS_MOCK_DB.find((item) => item.id === id);
    if (!season || season.status !== 'planned') return mockReject({ code: 'season_not_planned' });
    SEASONS_MOCK_DB.filter((item) => item.status === 'open').forEach((item) => Object.assign(item, { status: 'closed', closedAt: new Date().toISOString() }));
    season.status = 'open';
    return mockResolve(season);
  }

  close(id: string): Promise<ISeason> {
    const season = SEASONS_MOCK_DB.find((item) => item.id === id);
    if (!season || season.status !== 'open') return mockReject({ code: 'season_not_open' });
    Object.assign(season, { status: 'closed', closedAt: new Date().toISOString() });
    return mockResolve(season);
  }

  chooseIllustration(id: string, seasonIllustrationId: string | null): Promise<ISeason> {
    const season = SEASONS_MOCK_DB.find((item) => item.id === id);
    if (!season) return mockReject({ code: 'season_not_found' });
    const illustration = findIllustration(seasonIllustrationId);
    if (illustration === undefined) return mockReject({ code: 'season_illustration_not_found' });
    Object.assign(season, buildIllustrationFields(illustration));
    return mockResolve(season);
  }
}

const findIllustration = (seasonIllustrationId: string | null): ISeasonIllustration | null | undefined =>
  seasonIllustrationId === null ? null : SEASON_ILLUSTRATIONS_MOCK.find((illustration) => illustration.id === seasonIllustrationId);

const buildIllustrationFields = (illustration: ISeasonIllustration | null): Pick<ISeason, 'seasonIllustrationId' | 'illustrationUrl' | 'illustrationDarkUrl'> => ({
  seasonIllustrationId: illustration?.id ?? null,
  illustrationUrl: illustration?.illustrationUrl ?? null,
  illustrationDarkUrl: illustration?.illustrationDarkUrl ?? null,
});
