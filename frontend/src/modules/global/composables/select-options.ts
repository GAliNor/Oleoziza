import type { ISelectOption, SelectRow } from 'global/types/select';

/** Lower case without accents, so « electricite » finds « Électricité ». */
export const foldText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** The options matching a query, on their label, detail or group. */
export const filterOptions = (options: readonly ISelectOption[], query: string): ISelectOption[] => {
  const needle = foldText(query.trim());
  return needle ? options.filter((option) => [option.label, option.detail ?? '', option.group ?? ''].some((text) => foldText(text).includes(needle))) : [...options];
};

/** The rows to draw: a heading each time the group changes, then its options. */
export const selectRows = (options: readonly ISelectOption[]): SelectRow[] => {
  const rows: SelectRow[] = [];
  options.forEach((option, index) => {
    const previous = options[index - 1];
    if (option.group && option.group !== previous?.group) rows.push({ kind: 'group', label: option.group });
    rows.push({ kind: 'option', option, index });
  });
  return rows;
};
