<template>
  <div class="card flex flex-col gap-4 p-3">
    <button
      type="button"
      class="press group flex min-h-16 w-full items-center gap-3 rounded-control p-1 text-start hover:bg-subtle
        focus-visible:outline-2 focus-visible:outline-focus"
      :aria-label="$t('dashboard.operator.openLot', { client: lot.clientName, code: lot.code })"
      @click="emit('open', lot)"
    >
      <ui-avatar class="h-12 w-12 shrink-0" :name="lot.clientName" :variant="avatarVariant" />
      <span class="min-w-0 flex-1">
        <span class="block truncate font-semibold text-fg-display">{{ lot.clientName }}</span>
        <span class="block body-two text-fg-primary-paragraph">{{ sentence }}</span>
        <span class="mt-1 flex flex-wrap gap-1">
          <lot-payment-chip :lot="lot" />
          <span v-if="lot.discount?.state === 'pending'" class="chip bg-warning-subtle text-fg-warning">{{ $t('lot.discount.pendingChip') }}</span>
          <span v-if="lot.discount?.state === 'refused'" class="chip bg-danger-subtle text-fg-danger">{{ $t('lot.discount.refusedChip') }}</span>
          <span v-if="lot.isContactMissing" class="chip bg-danger-subtle text-fg-danger">{{ $t('lot.timeline.notificationFailed') }}</span>
        </span>
        <span class="mt-1.5 flex items-center gap-1">
          <span
            v-for="(status, index) in LOT_STATUSES"
            :key="status"
            class="h-1.5 w-4 rounded-control"
            :class="index <= LOT_STATUSES.indexOf(lot.status) ? 'bg-action' : 'bg-emphasis'"
            aria-hidden="true"
          />
          <span class="ms-2 truncate caption">{{ lot.code }} · {{ age }}</span>
        </span>
      </span>
      <arrow-right-line-icon class="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-300 ease-(--ease-sheet) group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
    </button>
    <button v-if="lot.status !== 'withdrawn'" type="button" class="press min-h-14 w-full rounded-control px-4 text-md font-semibold" :class="LOT_MOVE_TONES[lot.status]" @click="emit('move', lot)">
      {{ $t(`lot.move.${lot.status}`) }}
    </button>
  </div>
</template>

<script setup lang="ts">
// imports
import { LOT_MOVE_TONES, LOT_STATUSES } from 'lot/constants/lot';
import type { AvatarVariant } from 'global/types/avatar';
import type { ILot } from 'lot/types/lot';

import UiAvatar from 'global/components/ui-avatar.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';
import LotPaymentChip from 'lot/components/lot-payment-chip.vue';

// props
defineProps<{ lot: ILot; sentence: string; age: string; avatarVariant: AvatarVariant }>();

// emits
const emit = defineEmits<{
  (event: 'open', lot: ILot): void;
  (event: 'move', lot: ILot): void;
}>();
</script>
