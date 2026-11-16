import BaseService, { isMockModule } from 'global/services/base';
import DashboardMockService from 'dashboard/services/dashboard.mock';
import { formatPressLine, formatTank } from 'configuration/composables/equipment';
import { labelBucket, toSales, type ISalesAnswer } from 'finance/composables/sales-buckets';
import { ALL_SITES } from 'site/constants/site';
import type { IDashboard, IDashboardService, IPressLineFigures, ISiteFigures, ITank } from 'dashboard/types/dashboard';
import type { IExpenseSummary } from 'expense/types/expense';
import type { PeriodKey } from 'global/types/period';

interface IDashboardAnswer extends Omit<IDashboard, 'oliveChart' | 'tanks' | 'pressLines' | 'sales' | 'expenseSummary'> {
  oliveChartTitleKey: string;
  oliveBuckets: { startsOn: string; oliveKg: number; oilLitres: number; isCurrent: boolean }[];
  tanks: (Omit<ITank, 'name'> & { number: number; siteName: string })[];
  pressLines: (Omit<IPressLineFigures, 'name'> & { number: number; name: string | null; siteName: string })[];
  sites: ISiteFigures[];
  sales: ISalesAnswer | null;
  expenseSummary: IExpenseSummary | null;
}

/** Equipment named as before: « Cuve 2 », prefixed with its Site when several are in scope. */
const withSite = (label: string, siteName: string, isMultiSite: boolean): string => (isMultiSite ? `${siteName} · ${label}` : label);

class DashboardApiService extends BaseService implements IDashboardService {
  private _BASE_API_URL = `${import.meta.env.VITE_APP_API_BASE_URL}/dashboard`;

  /** One request for the whole Home, the Finances figures included for those who see them. */
  async getDashboard(siteId: string, period: PeriodKey): Promise<IDashboard> {
    const answer = await this.request<IDashboardAnswer>({ method: 'GET', url: this._BASE_API_URL, params: { ...(siteId === ALL_SITES ? {} : { siteId }), period } });
    const isMultiSite = answer.sites.length > 1;
    const isDaily = answer.oliveChartTitleKey.endsWith('.days');
    const { oliveChartTitleKey, oliveBuckets, tanks, pressLines, sales, expenseSummary, ...figures } = answer;
    return {
      ...figures,
      oliveChart: { titleKey: oliveChartTitleKey, bars: oliveBuckets.map((bucket, index) => ({ label: labelBucket(bucket.startsOn, index, isDaily), oliveKg: bucket.oliveKg, oilLitres: bucket.oilLitres, isCurrent: bucket.isCurrent })) },
      tanks: tanks.map(({ number, siteName, ...tank }) => ({ ...tank, name: withSite(formatTank({ number }), siteName, isMultiSite) })),
      pressLines: pressLines.map(({ number, name, siteName, ...line }) => ({ ...line, name: withSite(formatPressLine({ number, name: name ?? '' }), siteName, isMultiSite) })),
      sales: sales ? toSales(sales) : undefined,
      expenseSummary: expenseSummary ?? undefined,
    };
  }
}

export default isMockModule('dashboard') ? DashboardMockService : DashboardApiService;
