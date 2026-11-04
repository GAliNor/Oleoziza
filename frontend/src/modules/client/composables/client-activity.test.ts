import { describe, expect, it } from 'vitest';

import { lotsInPeriod, siteConsumption, summarizeActivity } from 'client/composables/client-activity';
import type { IClientLotLine, IClientSiteFigures } from 'client/types/client';

const TODAY = '2026-11-04';

const lot = (code: string, siteId: string, receivedOn: string, kg: number, oilKg: number): IClientLotLine => ({ code, siteId, siteName: siteId, status: 'withdrawn', kg, oilKg, receivedOn });

const site = (siteId: string): IClientSiteFigures => ({ siteId, siteName: siteId, oilStockKg: 0, balance: 0 });

const LOTS = [lot('a', 'oujda', '2026-11-01', 1000, 180), lot('b', 'berkane', '2026-10-05', 3000, 540), lot('c', 'oujda', '2025-12-10', 500, 90), lot('d', 'oujda', '2024-12-10', 500, 90)];

describe('lotsInPeriod', () => {
  const codes = (key: Parameters<typeof lotsInPeriod>[1]): string[] => lotsInPeriod(LOTS, key, TODAY).map((line) => line.code);

  it('keeps every lot for all time', () => {
    expect(codes('all')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps the current season, the previous one and the month apart', () => {
    expect([codes('season'), codes('previous'), codes('month'), codes('week')]).toEqual([['a', 'b'], ['c'], ['a'], ['a']]);
  });
});

describe('summarizeActivity', () => {
  it('adds up the lots', () => {
    expect(summarizeActivity(LOTS.slice(0, 2))).toEqual({ lots: 2, oliveKg: 4000, oilKg: 720, generatedDh: 2000 });
  });
});

describe('siteConsumption', () => {
  it('splits the olives per Site, biggest first', () => {
    const consumption = siteConsumption(LOTS.slice(0, 2), [site('oujda'), site('berkane')]);
    expect(consumption.map((row) => [row.siteId, row.lots, row.oliveKg, row.sharePercent])).toEqual([
      ['berkane', 1, 3000, 75],
      ['oujda', 1, 1000, 25],
    ]);
  });

  it('keeps a Site with nothing over the period, at zero', () => {
    expect(siteConsumption([], [site('oujda')]).map((row) => [row.lots, row.sharePercent])).toEqual([[0, 0]]);
  });
});
