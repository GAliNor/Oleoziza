import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';

import { USER_TITLES } from 'global/constants/title';
import type { ISelectOption } from 'global/types/select';
import type { UserTitle } from 'global/types/session';

/** The civility choices, « Aucune » first, and the reading of a picked value back into a title or null. */
export const useTitleOptions = (): { titleOptionsComputed: ComputedRef<ISelectOption[]>; toTitle: (value: string | null) => UserTitle | null } => {
  const { t } = useI18n();
  const titleOptionsComputed = computed((): ISelectOption[] => [
    { value: '', label: t('user.form.noCivility') },
    ...USER_TITLES.map((title) => ({ value: title, label: t(`global.titles.${title}`) })),
  ]);
  const toTitle = (value: string | null): UserTitle | null => USER_TITLES.find((title) => title === value) ?? null;
  return { titleOptionsComputed, toTitle };
};
