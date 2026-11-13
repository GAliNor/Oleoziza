<template>
  <div class="flex w-full min-w-0 items-center gap-2 sm:w-auto" role="group" :aria-label="$t('activity.pickDay')">
    <div class="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
      <button type="button" class="icon-btn shrink-0" :aria-label="$t('activity.previousDay')" @click="handleShift(-1)">
        <arrow-left-line-icon class="h-5 w-5 rtl:-scale-x-100" />
      </button>
      <ui-date-picker v-model="day" class="min-w-0 flex-1 sm:w-68 sm:flex-none" :max="today" :label="$t('activity.pickDay')" />
      <button type="button" class="icon-btn shrink-0" :disabled="isToday" :aria-label="$t('activity.nextDay')" @click="handleShift(1)">
        <arrow-right-line-icon class="h-5 w-5 rtl:-scale-x-100" />
      </button>
    </div>
    <button type="button" class="btn-secondary shrink-0 px-4" :disabled="isToday" :aria-pressed="isToday" @click="day = today">
      {{ $t('activity.today') }}
    </button>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { shiftDate, todayIso } from 'global/composables/date';

import UiDatePicker from 'global/components/ui-date-picker.vue';
import ArrowLeftLineIcon from 'global/icons/arrow-left-line.icon.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// emits
const day = defineModel<string>({ required: true });

// variables
const today = todayIso();

// computed
const isToday = computed((): boolean => day.value >= today);

// event handlers
const handleShift = (days: number): void => {
  const next = shiftDate(day.value, days);
  if (next <= today) day.value = next;
};
</script>
