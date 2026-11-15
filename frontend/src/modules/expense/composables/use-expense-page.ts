import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useExpenseStore } from 'expense/stores/expense';
import { useSiteStore } from 'site/stores/site';
import { usePeriod } from 'global/composables/use-period';
import { DEFAULT_PERIOD } from 'global/constants/period';
import { PAGE_SIZE } from 'global/constants/page';
import type { IExpense } from 'expense/types/expense';
import type { PeriodKey } from 'global/types/period';

const SEARCH_DELAY_MS = 300;

const queryNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
};

/** The Charges page: period, type, page and open Expense kept in the URL; each page read from the server when it is shown. */
export const useExpensePage = () => {
  // stores
  const route = useRoute();
  const router = useRouter();
  const expenseStore = useExpenseStore();
  const siteStore = useSiteStore();
  const { period, periodOptions } = usePeriod();

  // variables
  const search = ref('');
  const searched = ref('');
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  // computed
  const categoryId = computed((): string | null => (typeof route.query.category === 'string' && expenseStore.categories.some((item) => item.id === route.query.category) ? route.query.category : null));
  const page = computed((): number => queryNumber(route.query.page));
  const openId = computed((): string | null => (typeof route.query.expense === 'string' ? route.query.expense : null));
  const openExpense = computed((): IExpense | null => {
    if (!openId.value) return null;
    return expenseStore.list.items.find((expense) => expense.id === openId.value) ?? (expenseStore.current?.id === openId.value ? expenseStore.current : null);
  });
  const isReadOnly = computed((): boolean => siteStore.isAllSites);
  const canManage = computed((): boolean => !isReadOnly.value && siteStore.can('expense.record'));

  // methods
  const setQuery = (patch: Record<string, string | undefined>): void => {
    router.replace({ query: { ...route.query, ...patch } });
  };

  const selectCategory = (id: string | null): void => setQuery({ category: id ?? undefined, page: undefined, expense: undefined });

  const selectPeriod = (key: PeriodKey): void => setQuery({ period: key === DEFAULT_PERIOD ? undefined : key, page: undefined, expense: undefined });

  const selectPage = (number: number): void => setQuery({ page: number > 1 ? String(number) : undefined });

  const open = (id: string): void => setQuery({ expense: id });

  const close = (): void => setQuery({ expense: undefined });

  const load = (isForced = false): void => {
    const siteId = siteStore.currentSiteId;
    if (!siteId) return;
    expenseStore.fetchCategories();
    expenseStore.fetchSummary(siteId, period.value.key);
    expenseStore.fetchPage({ siteId, period: period.value.key, categoryId: categoryId.value, search: searched.value }, page.value, isForced);
  };

  // watchers
  watch(search, (value) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searched.value = value.trim();
      if (page.value > 1) selectPage(1);
    }, SEARCH_DELAY_MS);
  });
  watch([() => siteStore.currentSiteId, () => period.value.key, categoryId, searched, page], () => load(), { immediate: true });
  watch(
    () => expenseStore.list.total,
    (total) => {
      const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (!expenseStore.list.isLoading && page.value > lastPage) selectPage(lastPage);
    },
  );
  watch(
    openId,
    (id) => {
      if (id && !expenseStore.list.items.some((expense) => expense.id === id)) expenseStore.fetchOne(id);
    },
    { immediate: true },
  );

  return { period, periodOptions, selectPeriod, search, categoryId, selectCategory, page, selectPage, openId, openExpense, open, close, isReadOnly, canManage, reload: () => load(true) };
};
