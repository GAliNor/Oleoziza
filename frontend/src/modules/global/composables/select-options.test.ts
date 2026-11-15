import { describe, expect, it } from 'vitest';

import { filterOptions, selectRows } from 'global/composables/select-options';

const OPTIONS = [
  { value: 'electricity', label: 'Électricité', group: 'Énergie & fluides' },
  { value: 'water', label: 'Eau', group: 'Énergie & fluides' },
  { value: 'rent', label: 'Loyer', group: 'Site & immobilier' },
];

describe('dropdown options', () => {
  it('finds an option without accents or capitals, on its label or its group', () => {
    expect(filterOptions(OPTIONS, 'electricite').map((option) => option.value)).toEqual(['electricity']);
    expect(filterOptions(OPTIONS, 'immobilier').map((option) => option.value)).toEqual(['rent']);
    expect(filterOptions(OPTIONS, '  ')).toHaveLength(3);
  });

  it('heads each group once, before its options', () => {
    expect(selectRows(OPTIONS).map((row) => (row.kind === 'group' ? `# ${row.label}` : row.option.value))).toEqual(['# Énergie & fluides', 'electricity', 'water', '# Site & immobilier', 'rent']);
  });
});
