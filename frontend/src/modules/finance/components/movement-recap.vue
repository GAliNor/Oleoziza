<template>
  <section class="flex flex-col gap-2">
    <h3 class="eyebrow">{{ $t('finance.recap.title') }}</h3>
    <dl class="grid grid-cols-[auto_auto_minmax(0,1fr)] divide-x divide-default rounded-card bg-surface/70 py-3 shadow-hairline">
      <div class="min-w-0 px-4">
        <dt class="body-three">{{ $t('finance.ticket.amount') }}</dt>
        <dd class="figure mt-0.5 text-sm whitespace-nowrap" :class="movement.kind === 'payment' ? 'text-fg-brand' : 'text-fg-accent'">{{ formatMoney(movement.amount) }}</dd>
      </div>
      <div class="min-w-0 px-4">
        <dt class="body-three">{{ $t('finance.register.columns.method') }}</dt>
        <dd class="heading-six mt-0.5 whitespace-nowrap">{{ $t(`finance.methods.${movement.method}`) }}</dd>
      </div>
      <div class="min-w-0 px-4">
        <dt class="body-three">{{ extra.label }}</dt>
        <dd class="heading-six mt-0.5 wrap-break-word tabular-nums">{{ extra.value }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatDateTime } from 'global/composables/date';
import { formatMoney } from 'global/composables/money';
import { formatOilKg } from 'lot/composables/quantity';
import type { IMovement } from 'finance/types/finance';

// props
const props = defineProps<{ movement: IMovement }>();

// stores
const { t } = useI18n();

// computed
const extra = computed((): { label: string; value: string } => {
  const { reference, oilKg, recordedAt } = props.movement;
  if (reference) return { label: t('finance.detail.reference'), value: reference };
  if (oilKg) return { label: t('finance.ticket.quantity'), value: formatOilKg(oilKg) };
  return { label: t('finance.ticket.recordedAt'), value: formatDateTime(recordedAt) };
});
</script>
