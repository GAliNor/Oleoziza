import { computed } from 'vue';

import { useClientStore } from 'client/stores/client';
import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useUserStore } from 'user/stores/user';
import { formatFullName } from 'user/composables/format';
import { TASK_GROUPS } from 'task/constants/task';
import type { ITask, TaskGroup } from 'task/types/task';

/** Whatever has waited longest comes first; undated tasks go last. */
const byOldest = (first: ITask, second: ITask): number => (first.at ?? '￿').localeCompare(second.at ?? '￿');

/** What Management has to act on in the current scope, read from the records each task comes from. */
export const useTasks = () => {
  // stores
  const clientStore = useClientStore();
  const financeStore = useFinanceStore();
  const lotStore = useLotStore();
  const sessionStore = useSessionStore();
  const siteStore = useSiteStore();
  const userStore = useUserStore();

  // methods
  const isInScope = (siteIds: string[]): boolean => siteStore.isAllSites || siteIds.includes(siteStore.currentSiteId ?? '');

  // computed
  const discountTasks = computed((): ITask[] => {
    if (!siteStore.can('discount.approve')) return [];
    return lotStore.pendingDiscountLots
      .filter((lot) => lot.discount && isInScope([lot.siteId]))
      .map((lot) => ({
        id: `discount-${lot.id}`,
        kind: 'discount',
        group: 'decide',
        subject: lot.clientName,
        params: { code: lot.code, percent: lot.discount!.percent, by: lot.discount!.givenBy },
        amount: lot.discount!.amountDh,
        at: lot.discount!.givenAt,
        to: { name: 'discount-queue' },
      }));
  });

  const movementTasks = computed((): ITask[] => {
    if (!siteStore.can('payment.confirm')) return [];
    return financeStore.movements
      .filter((movement) => movement.status === 'pending' && isInScope([movement.siteId]))
      .map((movement) => ({
        id: `movement-${movement.id}`,
        kind: movement.kind,
        group: 'decide',
        subject: movement.client,
        params: { code: movement.code, by: movement.recordedBy },
        amount: movement.amount,
        at: movement.recordedAt,
        to: { name: 'finance', query: { movement: movement.id } },
      }));
  });

  /** A Refund someone else paid back waits for a second person; the one who paid it has nothing left to do. */
  const refundTasks = computed((): ITask[] => {
    if (!siteStore.can('refund.manage')) return [];
    return financeStore.refunds
      .filter((refund) => isInScope([refund.siteId]) && (refund.status === 'to_make' || (refund.status === 'made' && refund.madeBy !== sessionStore.fullName)))
      .map((refund) => ({
        id: `refund-${refund.id}`,
        kind: refund.status === 'to_make' ? 'refund-make' : 'refund-confirm',
        group: 'money',
        subject: refund.client,
        params: { code: refund.sourceCode, by: refund.madeBy ?? '' },
        amount: refund.amount,
        at: refund.madeAt ?? refund.createdAt,
        to: { name: 'finance', query: { tab: 'refunds' } },
      }));
  });

  const clientTasks = computed((): ITask[] => {
    if (!siteStore.can('client.view')) return [];
    return clientStore.records
      .filter((client) => client.followUp === 'at-risk' && isInScope(client.sites.map((site) => site.siteId)))
      .map((client) => ({
        id: `client-${client.id}`,
        kind: 'client-at-risk',
        group: 'follow',
        subject: client.name,
        params: {},
        amount: client.balance > 0 ? client.balance : null,
        at: null,
        to: { name: 'client-search', query: { client: client.id } },
      }));
  });

  const invitationTasks = computed((): ITask[] => {
    if (!siteStore.can('user.manage')) return [];
    return userStore.users
      .filter((user) => user.status === 'invited' && isInScope(Object.keys(user.sites)))
      .map((user) => ({
        id: `invitation-${user.id}`,
        kind: 'invitation',
        group: 'follow',
        subject: formatFullName(user),
        params: {},
        amount: null,
        at: user.invitedAt,
        to: { name: 'user', query: { user: user.id } },
      }));
  });

  const tasks = computed((): ITask[] =>
    [...discountTasks.value, ...movementTasks.value, ...refundTasks.value, ...clientTasks.value, ...invitationTasks.value].sort(byOldest),
  );

  const groups = computed((): { group: TaskGroup; tasks: ITask[] }[] =>
    TASK_GROUPS.map((group) => ({ group, tasks: tasks.value.filter((task) => task.group === group) })).filter((entry) => entry.tasks.length),
  );

  // methods
  /** Reads only what is missing for this Site, so the shell can call it on every screen. */
  const load = async (): Promise<void> => {
    const siteId = siteStore.currentSiteId;
    if (!siteId) return;
    const isFinanceStale = financeStore.loadedSiteId !== siteId;
    await Promise.all([
      siteStore.can('discount.approve') ? lotStore.fetchLots(siteId) : null,
      siteStore.can(['payment.confirm', 'refund.manage']) ? financeStore.fetchMovements(siteId) : null,
      siteStore.can('refund.manage') && isFinanceStale ? financeStore.fetchRefunds(siteId) : null,
      siteStore.can('client.view') ? clientStore.fetchRecords() : null,
      siteStore.can('user.manage') && !userStore.users.length ? userStore.fetchUsers() : null,
    ]);
  };

  return { tasks, groups, load };
};
