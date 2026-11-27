import { describe, expect, it } from 'vitest';

import { describeAnswerRange, describeMethod } from 'assistant/composables/answer-method';

describe('how an answer was calculated', () => {
  it('names what was read, the grouping, and the period as an inclusive date range', () => {
    const steps = describeMethod({
      queries: [
        {
          entity: 'lot',
          measures: ['revenue'],
          groupBy: ['client_name'],
          filters: [
            { field: 'mode', op: 'eq', value: 'service_milling' },
            { field: 'received_date', op: 'gte', value: '2026-11-01' },
            { field: 'received_date', op: 'lt', value: '2026-11-28' },
          ],
          period: null,
          compare: 'previous_season',
        },
      ],
      calcs: [],
    });

    expect(steps).toHaveLength(1);
    expect(steps[0].title).toBe('Étape 1 · lu dans les lots');
    expect(steps[0].details[0]).toBe('Calculé : CA');
    expect(steps[0].details[1]).toBe('Par : Client');
    expect(steps[0].details).toContain('Type : Trituration à façon');
    expect(steps[0].details.find((line) => line.includes(' du '))).toMatch(/1 nov\.? 2026 au 27 nov\.? 2026/);
    expect(steps[0].details.at(-1)).toBe('Comparé à la saison précédente');
  });

  it('names earlier results by their step instead of showing raw references', () => {
    const steps = describeMethod({
      queries: [
        { entity: 'client', measures: [], groupBy: [], filters: [{ field: 'name', op: 'matches', value: 'Bennani' }], period: null, compare: null },
        { entity: 'lot', measures: ['outstanding'], groupBy: [], filters: [{ field: 'client_id', op: 'eq', value: '{q1.id}' }], period: null, compare: null },
      ],
      calcs: [{ op: 'days_between', left: 'today', right: '{q2.planned_start_date}' }],
    });

    expect(steps.map((step) => step.title)).toEqual(['Étape 1 · lu dans les clients', 'Étape 2 · lu dans les lots', 'Calcul 1']);
    expect(steps[0].details).toEqual(['Liste des fiches', 'Nom contient « Bennani »']);
    expect(steps[1].details).toContain('Client : la fiche trouvée à l’étape 1');
    expect(steps[2].details[0]).toMatch(/^Jours entre aujourd’hui et .+ trouvé à l’étape 2$/);
  });

  it('states the dates an answer covers only when every dated query covers the same ones', () => {
    const query = (from: string, to: string) => ({ entity: 'lot', measures: ['revenue'], groupBy: [], filters: [{ field: 'received_date', op: 'gte' as const, value: from }, { field: 'received_date', op: 'lt' as const, value: to }], period: null, compare: null });

    expect(describeAnswerRange({ queries: [query('2026-11-01', '2026-11-28')], calcs: [] })).toMatch(/^du 1 nov\.? 2026 au 27 nov\.? 2026$/);
    expect(describeAnswerRange({ queries: [query('2026-11-01', '2026-11-28'), query('2025-11-01', '2025-11-28')], calcs: [] })).toBeNull();
    expect(describeAnswerRange({ queries: [{ entity: 'tank', measures: [], groupBy: [], filters: [], period: null, compare: null }], calcs: [] })).toBeNull();
  });
});
