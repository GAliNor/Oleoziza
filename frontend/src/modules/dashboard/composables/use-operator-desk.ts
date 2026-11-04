import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useClientStore } from 'client/stores/client';
import { useLotStore } from 'lot/stores/lot';
import { useReceptionStore } from 'reception/stores/reception';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { clientAvatarVariant } from 'client/composables/avatar-variant';
import { daysSince, formatTime } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { formatBoxes } from 'lot/composables/lot-boxes';
import { formatKg } from 'lot/composables/quantity';
import { LOT_STATUSES } from 'lot/constants/lot';
import type { IClientAccount } from 'client/types/client';
import type { AvatarVariant } from 'global/types/avatar';
import type { ILot, ILotMove, LotStatus } from 'lot/types/lot';

export interface IDeskClient {
  id: string;
  name: string;
  avatarVariant: AvatarVariant;
  lots: ILot[];
  account: IClientAccount;
}

const nextStatus = (status: LotStatus): LotStatus => LOT_STATUSES[Math.min(LOT_STATUSES.length - 1, LOT_STATUSES.indexOf(status) + 1)];

/** What the Operator Home shows and does: every Lot still in process, Client lookup, and moving a Lot along. */
export const useOperatorDesk = () => {
  // stores
  const router = useRouter();
  const { t } = useI18n();
  const clientStore = useClientStore();
  const lotStore = useLotStore();
  const receptionStore = useReceptionStore();
  const siteStore = useSiteStore();
  const toastStore = useToastStore();

  // computed
  const siteLots = computed((): ILot[] => [...lotStore.lots].sort((first, second) => second.receivedAt.localeCompare(first.receivedAt)));
  const activeLots = computed((): ILot[] => siteLots.value.filter((lot) => lot.status !== 'withdrawn'));

  // watchers
  watch(
    () => siteStore.currentSite?.id,
    (siteId) => {
      if (siteId) receptionStore.fetchSite(siteId);
    },
    { immediate: true },
  );

  // methods
  const avatarVariantOf = (lot: ILot): AvatarVariant => clientAvatarVariant(clientStore.clientById(lot.clientId)?.kind ?? 'individual');

  const toDeskClient = (id: string, name: string, kind: string): IDeskClient => ({
    id,
    name,
    avatarVariant: clientAvatarVariant(kind),
    lots: siteLots.value.filter((lot) => lot.clientId === id),
    account: clientStore.accountOf(id),
  });

  const searchClients = (query: string): IDeskClient[] => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    const matchingLotClients = siteLots.value.filter((lot) => lot.clientName.toLowerCase().includes(text)).map((lot) => lot.clientId);
    const ids = [...new Set([...matchingLotClients, ...clientStore.searchClients(query, 8).map((client) => client.id)])];
    return ids
      .map((id) => clientStore.clientById(id))
      .filter((client) => client !== undefined)
      .slice(0, 6)
      .map((client) => toDeskClient(client.id, client.name, client.kind));
  };

  const queueAhead = (lot: ILot): number => siteLots.value.filter((other) => other.status === 'waiting' && other.receivedAt < lot.receivedAt).length;

  const ageLabel = (lot: ILot): string => {
    const days = daysSince(lot.receivedAt);
    if (days === 0) return t('dashboard.operator.age.today', { time: formatTime(lot.receivedAt) });
    return days === 1 ? t('dashboard.operator.age.yesterday', { time: formatTime(lot.receivedAt) }) : t('dashboard.operator.age.days', { count: days });
  };

  const stageSentence = (lot: ILot): string => {
    if (lot.status === 'waiting') {
      const ahead = queueAhead(lot);
      const queue = ahead ? t('dashboard.operator.stage.waitingAhead', { count: ahead }) : t('dashboard.operator.stage.waitingNext');
      return lot.boxNumbers.length ? `${queue} · ${formatBoxes(lot.boxNumbers)}` : queue;
    }
    if (lot.status === 'pressed') return t('dashboard.operator.stage.pressed', { quantity: formatKg(lot.oilKg ?? 0) });
    return t(`dashboard.operator.stage.${lot.status}`);
  };

  const accountLines = (client: IDeskClient): string[] => {
    const lines: string[] = [];
    if (client.account.oilStockKg) lines.push(t('dashboard.operator.account.oilStock', { quantity: formatKg(client.account.oilStockKg) }));
    if (client.account.dueDh) lines.push(t('dashboard.operator.account.due', { amount: formatMoney(client.account.dueDh) }));
    if (client.account.payoutDh) lines.push(t('dashboard.operator.account.payout', { amount: formatMoney(client.account.payoutDh) }));
    return lines.length ? lines : [t('dashboard.operator.account.none')];
  };

  const needsConfirmation = (lot: ILot): boolean => lot.status !== 'received' && lot.status !== 'withdrawn';

  const nextLabel = (lot: ILot): string => t(`lot.status.${nextStatus(lot.status)}`);

  const openStation = (lot: ILot): void => {
    router.push({ name: 'reception-station', params: { code: lot.code } });
  };

  const move = async (lot: ILot, lotMove: ILotMove): Promise<boolean> => {
    const from = lot.status;
    const updated = await lotStore.moveLot(lot, lotMove);
    if (!updated) {
      toastStore.push(t('dashboard.operator.moveError'), 'danger');
      return false;
    }
    toastStore.push(t('dashboard.operator.moved', { client: updated.clientName, from: t(`lot.status.${from}`), to: t(`lot.status.${updated.status}`) }), 'success');
    return true;
  };

  const deskClientOf = (lot: ILot): IDeskClient => toDeskClient(lot.clientId, lot.clientName, clientStore.clientById(lot.clientId)?.kind ?? 'individual');

  const createClient = (name?: string): void => {
    router.push({ name: 'reception-new', query: { tab: 'client', ...(name ? { name } : {}) } });
  };

  const receive = (clientId?: string): void => {
    router.push({ name: 'reception-new', query: clientId ? { client: clientId } : {} });
  };

  return { activeLots, avatarVariantOf, searchClients, stageSentence, ageLabel, accountLines, deskClientOf, needsConfirmation, nextLabel, openStation, move, receive, createClient };
};
