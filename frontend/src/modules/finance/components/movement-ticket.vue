<template>
  <article class="ticket flex flex-col">
    <div class="ticket-body flex flex-col gap-6 rounded-t-card p-5 sm:p-6">
      <header class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="body-three">{{ $t(`finance.kinds.${movement.kind}`) }} · {{ $t(`finance.purposes.${movement.purpose}`) }}</p>
          <p class="figure text-display-xs text-fg-display sm:text-display-sm">{{ movement.code }}</p>
        </div>
        <div class="shrink-0 text-end">
          <p class="body-three">{{ $t('finance.ticket.amount') }}</p>
          <p class="figure text-display-xs whitespace-nowrap sm:text-display-sm" :class="isPayment ? 'text-fg-brand' : 'text-fg-accent'">
            {{ isPayment ? '+' : '−' }}{{ formatMoney(movement.amount) }}
          </p>
        </div>
      </header>

      <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 border-t border-subtle pt-6">
        <div class="min-w-0">
          <p class="body-three">{{ $t('finance.ticket.from') }}</p>
          <p class="text-xl font-semibold tracking-tight text-balance wrap-break-word" :class="from.isMissing ? 'text-fg-warning' : 'text-fg-display'">{{ from.name }}</p>
          <p v-if="from.detail" class="body-two mt-1">{{ from.detail }}</p>
        </div>
        <span class="mt-6 flex h-7 items-center gap-1 text-fg-muted" aria-hidden="true">
          <span class="hidden w-5 border-t border-dashed border-strong sm:block" />
          <arrow-right-line-icon class="h-4 w-4" />
        </span>
        <div class="min-w-0 text-end">
          <p class="body-three">{{ $t('finance.ticket.to') }}</p>
          <p class="text-xl font-semibold tracking-tight text-balance wrap-break-word" :class="to.isMissing ? 'text-fg-warning' : 'text-fg-display'">{{ to.name }}</p>
          <p v-if="to.detail" class="body-two mt-1">{{ to.detail }}</p>
        </div>
      </div>

      <dl class="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-subtle pt-6">
        <div v-for="fact in facts" :key="fact.key" class="min-w-0" :class="{ 'col-span-2': fact.isWide }">
          <dt class="body-three">{{ fact.label }}</dt>
          <dd class="heading-six mt-0.5 wrap-break-word tabular-nums">
            {{ fact.value }}
            <span v-if="fact.chip" class="chip mt-1 bg-subtle font-medium text-fg-primary-paragraph">{{ fact.chip }}</span>
          </dd>
          <dd v-if="fact.note" class="body-two mt-1">« {{ fact.note }} »</dd>
        </div>
      </dl>
    </div>

    <div class="ticket-stub rounded-b-card">
      <div class="mx-5 border-t-2 border-dashed border-default sm:mx-6" aria-hidden="true" />
      <div class="flex flex-col items-center gap-4 p-5 sm:p-6">
        <span class="chip px-3 py-1 text-sm" :class="MOVEMENT_STATUS_TONES[movement.status]">{{ $t(`finance.statuses.${movement.status}`) }}</span>
        <div class="flex h-12 w-full text-fg-default" :class="{ 'opacity-25': isVoid }" aria-hidden="true">
          <span v-for="(width, index) in barWidths" :key="index" :class="{ 'bg-current': index % 2 === 0 }" :style="{ flexGrow: width }" />
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSiteStore } from 'site/stores/site';
import { formatDateTime } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { formatOil } from 'lot/composables/quantity';
import { movementLabel } from 'finance/composables/movement-label';
import { MOVEMENT_STATUS_TONES } from 'finance/constants/finance';
import type { IMovement, ITicketFact } from 'finance/types/finance';

import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// props
const props = defineProps<{ movement: IMovement }>();

// stores
const { t } = useI18n();
const siteStore = useSiteStore();

// variables
const BAR_COUNT = 71;
interface ITicketEnd {
  name: string;
  detail?: string;
  isMissing?: boolean;
}

// computed
const isPayment = computed((): boolean => props.movement.kind === 'payment');
const isVoid = computed((): boolean => props.movement.status === 'rejected' || props.movement.status === 'cancelled');
const siteName = computed((): string => siteStore.sites.find((site) => site.id === props.movement.siteId)?.name ?? '—');
const clientEnd = computed((): ITicketEnd => ({ name: props.movement.client, detail: t('finance.ticket.client') }));
const millEnd = computed((): ITicketEnd => {
  const { method, bankAccount, oilLitres } = props.movement;
  if (method === 'cash') return { name: t('finance.ticket.cashDesk'), detail: siteName.value };
  if (method === 'oil') return { name: t('finance.ticket.millStock'), detail: oilLitres ? formatOil(oilLitres) : siteName.value };
  if (!bankAccount) return { name: t('finance.ticket.noAccount'), isMissing: true };
  return { name: bankAccount.bank, detail: t('finance.ticket.account', { end: bankAccount.accountEnd }) };
});
const from = computed((): ITicketEnd => (isPayment.value ? clientEnd.value : millEnd.value));
const to = computed((): ITicketEnd => (isPayment.value ? millEnd.value : clientEnd.value));
const movementLinkFacts = (movement: IMovement): ITicketFact[] =>
  movement.lotLinks.length
    ? movement.lotLinks.map((link) => ({ key: `lot-${link.lotId}`, label: t('finance.ticket.lot', { code: link.lotCode }), value: formatMoney(link.amount), isWide: true }))
    : [{ key: 'label', label: t('finance.register.columns.label'), value: movementLabel(movement), isWide: true }];
const facts = computed((): ITicketFact[] => {
  const { movement } = props;
  const lines: ITicketFact[] = [
    ...movementLinkFacts(movement),
    { key: 'method', label: t('finance.register.columns.method'), value: t(`finance.methods.${movement.method}`), isWide: !movement.reference },
  ];
  if (movement.reference) lines.push({ key: 'reference', label: t('finance.detail.reference'), value: movement.reference });
  lines.push(
    { key: 'recordedBy', label: t('finance.register.columns.recordedBy'), value: movement.recordedBy, chip: movement.wasOffline ? t('finance.detail.offline') : undefined },
    { key: 'recordedAt', label: t('finance.ticket.recordedAt'), value: formatDateTime(movement.recordedAt) },
    { key: 'site', label: t('finance.detail.site'), value: siteName.value, isWide: true },
  );
  if (movement.feeOffset) {
    const line = t('finance.detail.offsetLine', { gross: formatMoney(movement.amount + movement.feeOffset), fee: formatMoney(movement.feeOffset), net: formatMoney(movement.amount) });
    lines.push({ key: 'offset', label: t('finance.detail.offset'), value: line, isWide: true });
  }
  if (movement.decidedBy) {
    lines.push({
      key: 'decision',
      label: t('finance.detail.decidedBy', { status: t(`finance.statuses.${movement.status}`) }),
      value: `${movement.decidedBy} · ${formatDateTime(movement.decidedAt!)}`,
      chip: movement.settlement ? t(`finance.settlements.${movement.settlement}.label`) : undefined,
      note: movement.note,
      isWide: true,
    });
  }
  return lines;
});
const barWidths = computed((): number[] => {
  let seed = [...props.movement.code].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: BAR_COUNT }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return 1 + (seed >>> 28) % 3;
  });
});
</script>

<style scoped>
.ticket {
  --ticket-notch: 0.75rem;
  filter: drop-shadow(0 1px 2px rgb(41 37 36 / 0.06)) drop-shadow(0 16px 24px rgb(41 37 36 / 0.1));
}

.ticket-body {
  background:
    radial-gradient(circle var(--ticket-notch) at 0 100%, transparent 98%, var(--background-color-surface)) left / 51% 100% no-repeat,
    radial-gradient(circle var(--ticket-notch) at 100% 100%, transparent 98%, var(--background-color-surface)) right / 51% 100% no-repeat;
}

.ticket-stub {
  background:
    radial-gradient(circle var(--ticket-notch) at 0 0, transparent 98%, var(--background-color-surface)) left / 51% 100% no-repeat,
    radial-gradient(circle var(--ticket-notch) at 100% 0, transparent 98%, var(--background-color-surface)) right / 51% 100% no-repeat;
}
</style>
