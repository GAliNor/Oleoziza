// PROTOTYPE — mock state for the Operator Home (ticket 0037). Nothing is saved.
import { computed, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useSessionStore } from 'global/stores/session';
import { useClientStore } from 'client/stores/client';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useReceptionStore } from 'reception/stores/reception';
import { useLotStore } from 'lot/stores/lot';
import { CLIENT_ACCOUNTS_PROTOTYPE, EMPTY_ACCOUNT, type IAccountPrototype } from 'client/prototype/mock-accounts.prototype';
import { toPrototypeLot } from 'dashboard/prototype/reception-bridge.prototype';
import { advanceLot, createLots, formatDh, formatKg, LOT_STATUSES, STATUS_LABELS, type ILotPrototype, type LotStatus } from 'dashboard/prototype/mock-home.prototype';
import { SITE_BERKANE_ID, SITE_OUJDA_ID } from 'site/constants/mock-sites';
import type { AvatarKind } from 'global/types/avatar';

export interface IDeskClient {
  name: string;
  kind: AvatarKind;
  phone: string;
  lots: ILotPrototype[];
  account: IAccountPrototype;
}

export const MOVE_LABELS: Record<LotStatus, string | null> = {
  received: 'Peser',
  waiting: 'Lancer le pressage',
  pressing: 'Saisir l’huile',
  pressed: 'Marquer retiré',
  withdrawn: null,
};

export const MOVE_TONES: Record<LotStatus, string> = {
  received: 'bg-info-subtle text-fg-info',
  waiting: 'bg-accent-subtle text-fg-accent',
  pressing: 'bg-action text-fg-on-action',
  pressed: 'bg-selected text-fg-brand',
  withdrawn: 'bg-subtle text-fg-secondary-paragraph',
};

const COMPANY_PATTERN = /coop|domaine|sarl|huilerie|société|ste /i;
const OLDER_CLIENTS = [
  'Abdellah Mansouri', 'Fatima Zahra Elidrissi', 'Coopérative Zegzel', 'Mustapha Kaddouri', 'Naima Belhaj', 'Yassine Amrani',
  'Domaine Sidi Yahya', 'Rachid Ouali', 'Aicha Bennani', 'Driss Lahlou', 'Karima Tazi', 'Omar Benjelloun', 'Huilerie Taourirt',
  'Brahim Saidi', 'Zineb Chraibi', 'Mehdi Alaoui', 'Hafida Bouchta', 'Youssef Ghali', 'Latifa Hamdouchi', 'Coopérative Ahfir',
];
const OLDER_STATUSES: LotStatus[] = ['pressed', 'pressed', 'waiting', 'pressed', 'pressed', 'waiting'];
const olderLots = (): ILotPrototype[] =>
  Array.from({ length: 64 }, (_, index) => {
    const daysAgo = 1 + Math.floor(index / 4);
    const status = daysAgo > 3 ? 'pressed' : OLDER_STATUSES[index % OLDER_STATUSES.length];
    const netKg = 600 + ((index * 379) % 3400);
    const siteId = index % 3 === 2 ? SITE_BERKANE_ID : SITE_OUJDA_ID;
    const code = `${siteId === SITE_BERKANE_ID ? 'BK' : 'OJ'}-2627-${String(100 - index).padStart(4, '0')}`;
    return {
      id: code,
      code,
      siteId,
      client: OLDER_CLIENTS[index % OLDER_CLIENTS.length],
      variety: index % 4 === 0 ? 'Haouzia' : 'Picholine marocaine',
      mode: index % 7 === 0 ? 'purchase' : 'service',
      status,
      netKg,
      oilKg: status === 'pressed' ? Math.round(netKg * (0.15 + (index % 5) / 100)) : null,
      receivedAt: `${String(7 + (index % 10)).padStart(2, '0')}:${String((index * 17) % 60).padStart(2, '0')}`,
      operator: index % 2 ? 'Abdelkader' : 'Hamid',
      isMine: index % 2 === 0,
      isPendingSync: false,
      steps: [],
      daysAgo,
    };
  });
const lots = reactive<ILotPrototype[]>([...createLots(), ...olderLots()]);
const isOlder = (first: ILotPrototype, second: ILotPrototype): boolean =>
  (first.daysAgo ?? 0) !== (second.daysAgo ?? 0) ? (first.daysAgo ?? 0) > (second.daysAgo ?? 0) : first.receivedAt < second.receivedAt;

export const useOperatorDesk = () => {
  // stores
  const router = useRouter();
  const sessionStore = useSessionStore();
  const clientStore = useClientStore();
  const siteStore = useSiteStore();
  const toastStore = useToastStore();
  const receptionStore = useReceptionStore();
  const lotStore = useLotStore();

  // computed
  const siteLots = computed((): ILotPrototype[] =>
    lots.filter((lot) => siteStore.isAllSites || lot.siteId === siteStore.currentSiteId).sort((first, second) => (isOlder(first, second) ? 1 : -1)),
  );
  const activeLots = computed((): ILotPrototype[] => siteLots.value.filter((lot) => lot.status !== 'withdrawn'));
  const todoLots = computed((): ILotPrototype[] => {
    const order: LotStatus[] = ['pressing', 'pressed', 'waiting', 'received'];
    return [...activeLots.value].sort((first, second) => order.indexOf(first.status) - order.indexOf(second.status));
  });
  const clientsToday = computed((): IDeskClient[] => [...new Set(siteLots.value.map((lot) => lot.client))].map(toDeskClient));

  // watchers
  watch(
    () => siteStore.currentSite?.id,
    (siteId) => {
      if (siteId) receptionStore.fetchSite(siteId);
    },
    { immediate: true },
  );

  watch(
    () => lotStore.lots,
    (receptionLots) => {
      receptionLots.forEach((receptionLot) => {
        const mapped = toPrototypeLot(receptionLot, sessionStore.session?.firstName ?? '');
        const index = lots.findIndex((lot) => lot.code === mapped.code);
        if (index === -1) lots.unshift(mapped);
        else lots.splice(index, 1, mapped);
      });
    },
    { immediate: true, deep: true },
  );

  // methods
  const avatarKind = (name: string): AvatarKind => {
    const known = clientStore.clients.find((client) => client.name === name);
    if (known) return known.kind === 'company' ? 'company' : 'client';
    return COMPANY_PATTERN.test(name) ? 'company' : 'client';
  };

  const toDeskClient = (name: string): IDeskClient => ({
    name,
    kind: avatarKind(name),
    phone: clientStore.clients.find((client) => client.name === name)?.phone ?? '',
    lots: siteLots.value.filter((lot) => lot.client === name),
    account: CLIENT_ACCOUNTS_PROTOTYPE[name] ?? EMPTY_ACCOUNT,
  });

  const searchClients = (query: string): IDeskClient[] => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    const names = new Set([
      ...siteLots.value.map((lot) => lot.client).filter((name) => name.toLowerCase().includes(text)),
      ...clientStore.searchClients(query, 8).map((client) => client.name),
    ]);
    return [...names].slice(0, 6).map(toDeskClient);
  };

  const queueAhead = (lot: ILotPrototype): number =>
    siteLots.value.filter((other) => other.status === 'waiting' && other.siteId === lot.siteId && isOlder(other, lot)).length;

  const ageLabel = (lot: ILotPrototype): string => {
    if (!lot.daysAgo) return `Aujourd’hui ${lot.receivedAt}`;
    return lot.daysAgo === 1 ? `Hier ${lot.receivedAt}` : `Il y a ${lot.daysAgo} jours`;
  };

  const stageSentence = (lot: ILotPrototype): string => {
    if (lot.status === 'received') return 'Arrivé, à peser';
    if (lot.status === 'waiting') {
      const ahead = queueAhead(lot);
      return ahead ? `Attend le pressage · ${ahead} avant` : 'Attend le pressage · le prochain';
    }
    if (lot.status === 'pressing') return 'En train d’être pressé';
    if (lot.status === 'pressed') return `Huile prête · ${formatKg(lot.oilKg ?? 0)}`;
    return 'Huile retirée';
  };

  const taskSentence = (lot: ILotPrototype): string => {
    if (lot.status === 'received') return `Peser les olives de ${lot.client}`;
    if (lot.status === 'waiting') return `Lancer le pressage de ${lot.client}`;
    if (lot.status === 'pressing') return `Saisir l’huile de ${lot.client}`;
    return `Remettre l’huile à ${lot.client}`;
  };

  const accountLines = (client: IDeskClient): string[] => {
    const lines: string[] = [];
    if (client.account.oilStockKg) lines.push(`Huile en stock : ${formatKg(client.account.oilStockKg)}`);
    if (client.account.dueDh) lines.push(`Reste à payer : ${formatDh(client.account.dueDh)}`);
    if (client.account.payoutDh) lines.push(`Le moulin lui doit : ${formatDh(client.account.payoutDh)}`);
    if (!lines.length) lines.push('Rien à payer, rien en stock');
    return lines;
  };

  const needsConfirmation = (lot: ILotPrototype): boolean => lot.status !== 'received' && lot.status !== 'withdrawn';

  const nextLabel = (lot: ILotPrototype): string => STATUS_LABELS[LOT_STATUSES[Math.min(LOT_STATUSES.length - 1, LOT_STATUSES.indexOf(lot.status) + 1)]];

  const move = (lot: ILotPrototype, oilKg?: number): void => {
    if (lot.status === 'received') {
      router.push({ name: 'reception-station', params: { code: lot.code } });
      return;
    }
    const from = STATUS_LABELS[lot.status];
    advanceLot(lot, oilKg);
    toastStore.push(`${lot.client} : ${from} → ${STATUS_LABELS[lot.status]}`, 'success');
  };

  const receive = (clientId?: string): void => {
    router.push({ name: 'reception-new', query: clientId ? { client: clientId } : {} });
  };

  clientStore.fetchClients();

  return {
    siteLots,
    activeLots,
    todoLots,
    clientsToday,
    avatarKind,
    searchClients,
    stageSentence,
    ageLabel,
    taskSentence,
    accountLines,
    needsConfirmation,
    nextLabel,
    move,
    receive,
  };
};
