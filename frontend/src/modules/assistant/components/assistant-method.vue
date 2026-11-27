<template>
  <ui-disclosure v-model:is-open="isOpen" :title="$t('assistant.method.title')">
    <ol class="flex flex-col gap-3">
      <li v-for="(step, index) in stepsComputed" :key="index" class="flex flex-col gap-0.5">
        <p class="text-sm font-medium text-fg-display">{{ step.title }}</p>
        <p v-for="(detail, detailIndex) in step.details" :key="detailIndex" dir="auto" class="body-two">{{ detail }}</p>
      </li>
    </ol>
    <p class="mt-3 border-t border-default pt-3 caption">{{ $t('assistant.method.source') }}</p>
  </ui-disclosure>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';

import { describeMethod, type IMethodStep } from 'assistant/composables/answer-method';
import type { IAnswerMethod } from 'assistant/types/assistant';

import UiDisclosure from 'global/components/ui-disclosure.vue';

// props
const props = defineProps<{ method: IAnswerMethod }>();

// variables
const isOpen = ref(false);

// computed
const stepsComputed = computed((): IMethodStep[] => describeMethod(props.method));
</script>
