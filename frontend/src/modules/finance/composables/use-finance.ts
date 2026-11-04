import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFinanceStore } from 'finance/stores/finance';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { withPendingPayments } from 'finance/composables/sales-figures';
import { formatMoney } from 'global/composables/money';
import { toIsoDate } from 'global/composables/date';
import { periodRange, usePeriod } from 'global/composables/use-period';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { formatOilKg } from 'lot/composables/quantity';
import type { IMovement, ISalesFigures, Settlement } from 'finance/types/finance';

/** The Finances page: this Site's movements, the sales tiles, and the decisions Management can take. */
export const useFinance = () => {
  // stores
  const { t } = useI18n();
  const financeStore = useFinanceStore();
  const siteStore = useSiteStore();
  const toastStore = useToastStore();
  const { isOnline } = useOnlineStatus();
  const { period } = usePeriod();

  // computed
  const scoped = computed((): IMovement[] => [...financeStore.movements].sort((first, second) => second.recordedAt.localeCompare(first.recordedAt)));
  const inPeriod = computed((): IMovement[] => {
    const { from, to } = periodRange(period.value.key);
    return scoped.value.filter((movement) => toIsoDate(movement.recordedAt) >= from && toIsoDate(movement.recordedAt) <= to);
  });
  const pending = computed((): IMovement[] => scoped.value.filter((movement) => movement.status === 'pending').reverse());
  const figures = computed((): ISalesFigures | null => (financeStore.sales ? withPendingPayments(financeStore.sales.figures, financeStore.movements) : null));
  const isReadOnly = computed((): boolean => siteStore.isAllSites);
  const canConfirm = computed((): boolean => !isReadOnly.value && siteStore.can('payment.confirm'));
  const canCancel = computed((): boolean => !isReadOnly.value && siteStore.can('payment.cancel'));

  // methods
  const confirm = async (movement: IMovement): Promise<void> => {
    if (!isOnline.value) {
      toastStore.push(t('finance.toasts.onlineOnly'), 'danger');
      return;
    }
    const updated = await financeStore.decide(movement, { status: 'confirmed' });
    if (updated) toastStore.push(t('finance.toasts.confirmed', { code: updated.code, amount: formatMoney(updated.amount) }), 'success');
    else toastStore.push(t('finance.toasts.error'), 'danger');
  };

  const reject = async (movement: IMovement, note: string): Promise<void> => {
    const updated = await financeStore.decide(movement, { status: 'rejected', note: note.trim() });
    if (!updated) {
      toastStore.push(t('finance.toasts.error'), 'danger');
      return;
    }
    const message = updated.method === 'oil' && updated.oilKg ? t('finance.toasts.rejectedOil', { code: updated.code, quantity: formatOilKg(updated.oilKg) }) : t('finance.toasts.rejected', { code: updated.code });
    toastStore.push(message, 'success');
  };

  const cancel = async (movement: IMovement, note: string, settlement: Settlement): Promise<void> => {
    const updated = await financeStore.decide(movement, { status: 'cancelled', note: note.trim(), settlement });
    if (!updated) {
      toastStore.push(t('finance.toasts.error'), 'danger');
      return;
    }
    toastStore.push(t(`finance.toasts.${settlement}`, { amount: formatMoney(updated.amount), client: updated.client }), 'success');
  };

  return { scoped, inPeriod, pending, figures, period, isOnline, isReadOnly, canConfirm, canCancel, confirm, reject, cancel };
};

/** Loads what the Finances page shows, again whenever the Site or the period changes. */
export const useFinanceLoader = (): { reload: () => void } => {
  const financeStore = useFinanceStore();
  const siteStore = useSiteStore();
  const { period } = usePeriod();

  const load = (isForced: boolean): void => {
    const siteId = siteStore.currentSiteId;
    if (!siteId) return;
    financeStore.fetchMovements(siteId, isForced);
    financeStore.fetchSales(siteId, period.value.key);
  };

  watch([() => siteStore.currentSiteId, () => period.value.key], () => load(false), { immediate: true });

  return { reload: () => load(true) };
};
