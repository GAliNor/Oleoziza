<template>
  <div class="flex flex-col gap-3">
    <button
      type="button"
      class="press group flex min-h-16 w-full items-center gap-3 rounded-control p-1 text-start hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus"
      :aria-label="$t('dashboard.operator.openLot', { client: entry.lot.clientName, code: entry.lot.code })"
      @click="emit('open', entry.lot)"
    >
      <ui-avatar class="h-12 w-12 shrink-0" :name="entry.lot.clientName" :variant="entry.avatarVariant" />
      <span class="min-w-0 flex-1">
        <span class="eyebrow block" :class="entry.kind === 'now' ? 'text-fg-success' : 'text-fg-secondary-paragraph'">{{ $t(`dashboard.operator.line.${entry.kind}`) }}</span>
        <span class="block truncate font-semibold text-fg-display">{{ entry.lot.clientName }}</span>
        <span class="block body-two text-fg-primary-paragraph">{{ entry.detail }}</span>
        <span class="mt-1 flex flex-wrap gap-1">
          <span v-if="entry.isLate" class="chip bg-warning-subtle text-fg-warning">{{ $t('dashboard.operator.line.late') }}</span>
          <lot-payment-chip :lot="entry.lot" />
          <span v-if="entry.lot.discount?.state === 'pending'" class="chip bg-warning-subtle text-fg-warning">{{ $t('lot.discount.pendingChip') }}</span>
          <span v-if="entry.lot.isContactMissing" class="chip bg-danger-subtle text-fg-danger">{{ $t('lot.timeline.notificationFailed') }}</span>
        </span>
      </span>
      <arrow-right-line-icon class="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-300 ease-(--ease-sheet) group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
    </button>
    <button
      v-if="entry.canMove"
      type="button"
      class="press min-h-14 w-full rounded-control px-4 text-md font-semibold"
      :class="LOT_MOVE_TONES[entry.lot.status]"
      @click="emit('move', entry.lot)"
    >
      {{ $t(`lot.move.${entry.lot.status}`) }}
    </button>
  </div>
</template>

<script setup lang="ts">
// imports
import { LOT_MOVE_TONES } from 'lot/constants/lot';
import type { ILineSlot } from 'dashboard/composables/use-operator-desk';
import type { ILot } from 'lot/types/lot';

import UiAvatar from 'global/components/ui-avatar.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';
import LotPaymentChip from 'lot/components/lot-payment-chip.vue';

// props
defineProps<{ entry: ILineSlot }>();

// emits
const emit = defineEmits<{
  (event: 'open', lot: ILot): void;
  (event: 'move', lot: ILot): void;
}>();
</script>
