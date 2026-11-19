import { useClientStore } from 'client/stores/client';
import { useFinanceStore } from 'finance/stores/finance';
import { useLotStore } from 'lot/stores/lot';
import { useSessionStore } from 'global/stores/session';
import { useSiteStore } from 'site/stores/site';
import { useUserStore } from 'user/stores/user';
import { formatFullName } from 'user/composables/format';
import { withClientTaskLinks } from 'task/composables/client-task-links';
import type { ITask } from 'task/types/task';

/** Whatever has waited longest comes first; undated tasks go last. */
export const byOldest = (first: ITask, second: ITask): number => (first.at ?? '\uffff').localeCompare(second.at ?? '\uffff');

/** Loads what the tasks are read from, for the mock: the Lots, Payments, Refunds, Client register and Users the person may act on. */
export const loadTaskSources = async (siteId: string): Promise<void> => {
  const siteStore = useSiteStore();
  const financeStore = useFinanceStore();
  await Promise.all([
    siteStore.can('discount.approve') ? useLotStore().fetchLots(siteId) : null,
    siteStore.can(['payment.confirm', 'refund.manage']) ? financeStore.fetchMovements(siteId) : null,
    siteStore.can('refund.manage') ? financeStore.fetchRefunds(siteId) : null,
    siteStore.can('client.view') ? useClientStore().fetchRecords() : null,
    siteStore.can('user.manage') ? useUserStore().fetchUsers() : null,
  ]);
};

/** What Management has to act on in the current scope, read from the records each task comes from (the mock's rules; the backend applies the same). */
export const deriveTasks = (): ITask[] => {
  const clientStore = useClientStore();
  const financeStore = useFinanceStore();
  const lotStore = useLotStore();
  const sessionStore = useSessionStore();
  const siteStore = useSiteStore();
  const userStore = useUserStore();
  const isInScope = (siteIds: string[]): boolean => siteStore.isAllSites || siteIds.includes(siteStore.currentSiteId ?? '');

  const discountTasks = (): ITask[] => {
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
  };

  const movementTasks = (): ITask[] => {
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
  };

  /** A Refund someone else paid back waits for a second person; the one who paid it has nothing left to do. */
  const refundTasks = (): ITask[] => {
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
  };

  const clientTasks = (): ITask[] => {
    if (!siteStore.can('client.view')) return [];
    return clientStore.records
      .filter((client) => client.followUp === 'at-risk' && isInScope(client.sites.map((site) => site.siteId)))
      .map((client) =>
        withClientTaskLinks(
          {
            id: `client-${client.id}`,
            kind: 'client-at-risk',
            group: 'follow',
            subject: client.name,
            params: {},
            amount: client.balance > 0 ? client.balance : null,
            at: null,
            to: { name: 'client-page', params: { id: client.id } },
          },
          client.id,
        ),
      );
  };

  const invitationTasks = (): ITask[] => {
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
  };

  return [...discountTasks(), ...movementTasks(), ...refundTasks(), ...clientTasks(), ...invitationTasks()].sort(byOldest);
};
