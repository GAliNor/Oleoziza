<template>
  <component :is="record.link ? 'router-link' : 'div'" :to="record.link ?? undefined" class="card press-lift flex min-w-0 flex-col gap-1 p-4" :class="{ 'hover:border-brand': record.link }">
    <div class="flex items-center justify-between gap-2">
      <p class="truncate font-semibold text-fg-display">{{ record.label }}</p>
      <arrow-right-line-icon v-if="record.link" class="h-4 w-4 shrink-0 text-fg-muted rtl:-scale-x-100" />
    </div>
    <ui-property-list>
      <div v-for="fact in visibleFactsComputed" :key="fact.key" class="flex items-baseline justify-between gap-3 text-sm">
        <dt class="text-fg-secondary-paragraph">{{ labelColumn(fact.key) }}</dt>
        <dd class="text-end text-fg-default tabular-nums">{{ formatAnswerValue(fact.value, fact.kind, fact.key) }}</dd>
      </div>
    </ui-property-list>
  </component>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { formatAnswerValue, labelColumn } from 'assistant/composables/answer-format';
import type { IAnswerFact, IAnswerRecord } from 'assistant/types/assistant';

import UiPropertyList from 'global/components/ui-property-list.vue';
import ArrowRightLineIcon from 'global/icons/arrow-right-line.icon.vue';

// props
const props = defineProps<{ record: IAnswerRecord }>();

// variables
const MAXIMUM_FACTS = 4;

// computed
const visibleFactsComputed = computed((): IAnswerFact[] => props.record.facts.filter((fact) => fact.kind !== 'id' && fact.value !== null).slice(0, MAXIMUM_FACTS));
</script>
