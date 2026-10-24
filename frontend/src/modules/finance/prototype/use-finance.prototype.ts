// PROTOTYPE — in-memory Payments and Payouts shared by the Finances variants (ticket 0034), with rules H3 (online only), M4 (oil back on rejection), M10 (Credit Note or Refund) and A4 (read only on "Tous les sites").
import { computed, ref } from 'vue';

import { useAuthStore } from 'auth/stores/auth';
import { useSiteStore } from 'global/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { SITE_FIGURES, salesFigures, type ISalesFiguresPrototype } from 'dashboard/prototype/mock-home.prototype';
import { usePeriod } from 'dashboard/prototype/use-period.prototype';
import { MOVEMENTS_MOCK, type IMovementPrototype, type Settlement } from 'finance/prototype/mock-finance.prototype';

const movements = ref<IMovementPrototype[]>(structuredClone(MOVEMENTS_MOCK));

const MOCK_NOW = new Date('2026-10-24T13:00:00+01:00').getTime();
const DAY_MS = 86_400_000;
const TOTAL_REVENUE = SITE_FIGURES.reduce((sum, site) => sum + site.revenueSeason, 0);

export const useFinancePrototype = () => {
  // stores
  const authStore = useAuthStore();
  const siteStore = useSiteStore();
  const toastStore = useToastStore();
  const { isOnline } = useOnlineStatus();
  const { period, selectPeriod } = usePeriod();

  // computed
  const me = computed((): string => authStore.fullName);
  const scoped = computed((): IMovementPrototype[] =>
    movements.value
      .filter((movement) => siteStore.isAllSites || movement.siteId === siteStore.currentSiteId)
      .sort((first, second) => second.recordedAt.localeCompare(first.recordedAt)),
  );
  const inPeriod = computed((): IMovementPrototype[] => scoped.value.filter((movement) => MOCK_NOW - new Date(movement.recordedAt).getTime() < period.value.days * DAY_MS));
  const pending = computed((): IMovementPrototype[] => scoped.value.filter((movement) => movement.status === 'pending').reverse());
  const scopeShare = computed((): number => {
    const sites = siteStore.isAllSites ? SITE_FIGURES : SITE_FIGURES.filter((site) => site.siteId === siteStore.currentSiteId);
    return sites.reduce((sum, site) => sum + site.revenueSeason, 0) / TOTAL_REVENUE || 1;
  });
  const figures = computed((): ISalesFiguresPrototype => {
    const base = salesFigures(period.value.factor * scopeShare.value);
    const pendingPayments = pending.value.filter((movement) => movement.kind === 'payment');
    const pendingAmount = pendingPayments.reduce((sum, movement) => sum + movement.amount, 0);
    const outstanding = Math.min(base.outstanding, base.revenue - pendingAmount);
    return { revenue: base.revenue, pending: pendingAmount, pendingCount: pendingPayments.length, outstanding, collected: base.revenue - pendingAmount - outstanding };
  });
  const isReadOnly = computed((): boolean => siteStore.isAllSites);
  const canConfirm = computed((): boolean => !isReadOnly.value && authStore.can('payment.confirm'));
  const canCancel = computed((): boolean => !isReadOnly.value && authStore.can('payment.cancel'));

  // methods
  const siteName = (siteId: string): string => siteStore.sites.find((site) => site.id === siteId)?.name ?? '—';

  const decide = (movement: IMovementPrototype, changes: Partial<IMovementPrototype>): void => {
    Object.assign(movement, { ...changes, decidedBy: me.value, decidedAt: new Date().toISOString() });
  };

  const confirm = (movement: IMovementPrototype): boolean => {
    if (!canConfirm.value || movement.status !== 'pending') return false;
    if (!isOnline.value) {
      toastStore.push('La confirmation se fait en ligne uniquement.', 'danger');
      return false;
    }
    decide(movement, { status: 'confirmed' });
    toastStore.push(`${movement.code} confirmé · ${movement.amount.toLocaleString('fr-FR')} DH`, 'success');
    return true;
  };

  const reject = (movement: IMovementPrototype, note: string): boolean => {
    if (!canConfirm.value || movement.status !== 'pending' || !note.trim() || !isOnline.value) return false;
    decide(movement, { status: 'rejected', note: note.trim() });
    toastStore.push(
      movement.method === 'oil' ? `${movement.code} rejeté · ${movement.oilKg} kg d’huile rendus au stock du Client` : `${movement.code} rejeté ; le montant reste dû`,
      'success',
    );
    return true;
  };

  const cancel = (movement: IMovementPrototype, note: string, settlement: Settlement): boolean => {
    if (!canCancel.value || movement.status !== 'confirmed' || movement.kind !== 'payment' || !note.trim() || !isOnline.value) return false;
    decide(movement, { status: 'cancelled', note: note.trim(), settlement });
    toastStore.push(settlement === 'credit_note' ? `Avoir de ${movement.amount.toLocaleString('fr-FR')} DH créé pour ${movement.client}` : `Remboursement de ${movement.amount.toLocaleString('fr-FR')} DH à faire à ${movement.client}`, 'success');
    return true;
  };

  const find = (id: string | null): IMovementPrototype | undefined => movements.value.find((movement) => movement.id === id);

  return { movements, scoped, inPeriod, pending, figures, period, selectPeriod, isOnline, isReadOnly, canConfirm, canCancel, siteName, confirm, reject, cancel, find };
};
