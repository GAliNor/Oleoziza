import { describe, expect, it } from 'vitest';

import { millingFigures, millingSales } from 'finance/composables/milling-figures';
import type { IMovement } from 'finance/types/finance';
import type { ILot, ILotDiscount } from 'lot/types/lot';

const lot = (id: string, receivedAt: string, paid: Partial<Pick<ILot, 'paidDh' | 'pendingDh' | 'creditDh'>> = {}, discount: ILotDiscount | null = null): ILot =>
  ({ id, code: id, receivedAt, netKg: 1000, millingRatePerKg: 0.5, discount, paidDh: 0, pendingDh: 0, creditDh: 0, ...paid }) as ILot;

const payment = (status: IMovement['status'], lotId: string, amount: number, decidedAt?: string, method: IMovement['method'] = 'cash'): IMovement =>
  ({ status, method, decidedAt, lotLinks: [{ lotId, lotCode: lotId, amount }] }) as IMovement;

const DAY = '2026-11-05';
const pendingDiscount: ILotDiscount = { amountDh: 100, percent: 20, state: 'pending', givenBy: 'H', givenAt: DAY };

describe('the money figures on Milling Fees', () => {
  const lots = [lot('paid', `${DAY}T08:00:00+01:00`, { paidDh: 500 }), lot('waiting', `${DAY}T09:00:00+01:00`, { pendingDh: 200 }), lot('unpaid', `${DAY}T10:00:00+01:00`, {}, pendingDiscount), lot('old', '2026-10-01T10:00:00+01:00')];
  const movements = [payment('confirmed', 'paid', 500, `${DAY}T12:00:00+01:00`, 'transfer'), payment('pending', 'waiting', 200)];

  it('count the fees of the Lots received in the period, at full price while a Discount waits', () => {
    expect(millingFigures(lots, movements, DAY, DAY)).toEqual({ revenue: 1500, collected: 500, pending: 200, outstanding: 800, pendingCount: 1 });
  });

  it('always add up', () => {
    const figures = millingFigures(lots, movements, '2026-10-01', DAY);
    expect(figures.collected + figures.pending + figures.outstanding).toBe(figures.revenue);
  });

  it('count a Credit Note taken off a Lot as collected', () => {
    expect(millingFigures([lot('credited', `${DAY}T08:00:00+01:00`, { creditDh: 300 })], [], DAY, DAY).collected).toBe(300);
  });

  it('chart the week by day, and split what was collected by method', () => {
    const sales = millingSales(lots, movements, 'week', DAY, (day) => day.slice(8), 'S');
    expect(sales.bars.map((bar) => bar.label)).toEqual(['30', '31', '01', '02', '03', '04', '05']);
    expect(sales.bars.at(-1)).toMatchObject({ revenue: 1500, collected: 500, isCurrent: true });
    expect(sales.methods.find((method) => method.key === 'transfer')?.amount).toBe(500);
  });
});
