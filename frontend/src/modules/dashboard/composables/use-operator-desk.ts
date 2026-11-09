import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useClientStore } from 'client/stores/client';
import { useLotStore } from 'lot/stores/lot';
import { useReceptionStore } from 'reception/stores/reception';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { clientAvatarVariant } from 'client/composables/avatar-variant';
import { daysSince, formatDateTime, formatTime, toIsoDate, todayIso } from 'global/composables/date';
import { useSiteEquipment } from 'configuration/composables/use-site-equipment';
import { formatPressLine } from 'configuration/composables/equipment';
import { isLate, lotsAhead } from 'lot/composables/press-schedule';
import { formatMoney } from 'global/composables/money';
import { clientMoney } from 'lot/composables/client-money';
import { formatBoxes } from 'lot/composables/lot-boxes';
import { formatLitres } from 'lot/composables/quantity';
import { LOT_STATUSES } from 'lot/constants/lot';
import { AMOUNT_PERMISSIONS } from 'finance/constants/finance';
import { paymentStateOf } from 'lot/composables/fee';
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
  const { pressLines, tanks } = useSiteEquipment(() => siteStore.currentSite?.id);

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
    account: { ...clientStore.accountOf(id), ...clientMoney(lotStore.lots, id) },
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

  const lineLabelOf = (lot: ILot): string => {
    const line = pressLines.value.find((item) => item.id === lot.pressLineId);
    return line ? formatPressLine(line) : t('dashboard.operator.stage.noLine');
  };

  const plannedLabel = (at: string): string => (toIsoDate(at) === todayIso() ? formatTime(at) : formatDateTime(at));

  const ageLabel = (lot: ILot): string => {
    const days = daysSince(lot.receivedAt);
    if (days === 0) return t('dashboard.operator.age.today', { time: formatTime(lot.receivedAt) });
    return days === 1 ? t('dashboard.operator.age.yesterday', { time: formatTime(lot.receivedAt) }) : t('dashboard.operator.age.days', { count: days });
  };

  const stageSentence = (lot: ILot): string => {
    if (lot.status === 'waiting') {
      const ahead = lotsAhead(siteLots.value, lot);
      const queue = ahead ? t('dashboard.operator.stage.waitingAhead', { count: ahead }) : t('dashboard.operator.stage.waitingNext');
      const planned = lot.plannedStartAt ? t(isLate(lot, new Date()) ? 'dashboard.operator.stage.late' : 'dashboard.operator.stage.planned', { at: plannedLabel(lot.plannedStartAt) }) : '';
      return [lineLabelOf(lot), planned, queue, lot.boxNumbers.length ? formatBoxes(lot.boxNumbers) : ''].filter(Boolean).join(' · ');
    }
    if (lot.status === 'pressing') return `${t('dashboard.operator.stage.pressing')} · ${lineLabelOf(lot)}`;
    if (lot.status === 'pressed') return t('dashboard.operator.stage.pressed', { quantity: formatLitres(lot.oilLitres ?? 0) });
    return t(`dashboard.operator.stage.${lot.status}`);
  };

  const accountLines = (client: IDeskClient): string[] => {
    const lines: string[] = [];
    if (client.account.oilStockLitres) lines.push(t('dashboard.operator.account.oilStock', { quantity: formatLitres(client.account.oilStockLitres) }));
    if (siteStore.can(AMOUNT_PERMISSIONS)) {
      if (client.account.dueDh) lines.push(t('dashboard.operator.account.due', { amount: formatMoney(client.account.dueDh) }));
      if (client.account.payoutDh) lines.push(t('dashboard.operator.account.payout', { amount: formatMoney(client.account.payoutDh) }));
    } else {
      const unpaid = client.lots.filter((lot) => ['unpaid', 'partial'].includes(paymentStateOf(lot))).length;
      if (unpaid) lines.push(t('dashboard.operator.account.unpaid', { count: unpaid }));
    }
    return lines.length ? lines : [t('dashboard.operator.account.none')];
  };

  const nextLabel = (lot: ILot): string => t(`lot.status.${nextStatus(lot.status)}`);

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

  return { activeLots, pressLines, tanks, avatarVariantOf, searchClients, stageSentence, ageLabel, accountLines, deskClientOf, nextLabel, move, receive, createClient };
};
