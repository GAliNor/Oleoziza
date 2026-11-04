import { describe, expect, it } from 'vitest';

import { toInitials } from 'global/composables/avatar';

describe('toInitials', () => {
  it.each([
    ['Mohammed Benali', 'MB'],
    ['Fatima Zahra El Idrissi', 'FZ'],
    ['Coopérative Angad', 'CA'],
    ['Domaine de Zegzel', 'DZ'],
    ['Hamid', 'H'],
    ['Al', 'A'],
  ])('reads %s as %s', (name, initials) => {
    expect(toInitials(name)).toBe(initials);
  });
});
