<template>
  <section class="flex min-w-0 flex-col gap-5">
    <button type="button" class="btn-secondary min-h-14 self-start" @click="emit('close')">
      <arrow-left-line-icon class="h-5 w-5" />
      {{ $t('dashboard.operator.backToList') }}
    </button>

    <lot-missing-contact v-if="lot.isContactMissing && lot.notificationChoice !== 'none'" :lot="lot" :channel="lot.notificationChoice" />

    <lot-detail :lot="lot" />

    <template v-if="lot.status === 'waiting' && lines.length">
      <lot-schedule-form v-if="isScheduling" :key="lot.id" :lot="lot" :lines="lines" @close="isScheduling = false" />
      <button v-else type="button" class="btn-secondary min-h-14" @click="isScheduling = true">{{ $t('lot.schedule.open') }}</button>
    </template>

    <div class="flex flex-col gap-3">
      <h3 class="label">{{ $t('dashboard.operator.accountTitle') }}</h3>
      <client-tag :client-id="lot.clientId" :name="lot.clientName" />
      <ul class="body-two flex flex-col gap-1 px-1 text-fg-primary-paragraph">
        <li v-for="line in accountLines" :key="line">{{ line }}</li>
      </ul>
    </div>

    <button v-if="lot.status !== 'withdrawn'" type="button" class="press min-h-16 w-full rounded-control px-4 text-md font-semibold" :class="LOT_MOVE_TONES[lot.status]" @click="emit('move', lot)">
      {{ $t(`lot.move.${lot.status}`) }}
    </button>
  </section>
</template>

<script setup lang="ts">
// imports
import { ref } from 'vue';

import { LOT_MOVE_TONES } from 'lot/constants/lot';
import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ClientTag from 'client/components/client-tag.vue';
import LotDetail from 'lot/components/lot-detail.vue';
import LotMissingContact from 'lot/components/lot-missing-contact.vue';
import LotScheduleForm from 'lot/components/lot-schedule-form.vue';

// props
defineProps<{ lot: ILot; accountLines: string[]; lines: IPressLineSetting[] }>();

// emits
const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'move', lot: ILot): void;
}>();

// variables
const isScheduling = ref(false);
</script>
