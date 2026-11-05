<template>
  <ui-bar-chart :title="$t(chart.titleKey)" :unit="$t('global.units.kilogram')" :series="SERIES" :bars="bars">
    <template #tooltip="{ bar }">
      <p>{{ formatOliveKg(Math.round(bar.values.olives)) }}</p>
      <p>{{ formatOil(Math.round(bar.oilLitres)) }}</p>
    </template>
  </ui-bar-chart>
</template>

<script setup lang="ts">
// imports
import { computed } from 'vue';

import { formatOil, formatOliveKg } from 'lot/composables/quantity';
import type { IDashboard } from 'dashboard/types/dashboard';
import type { IChartSeries } from 'global/types/chart';

import UiBarChart from 'global/components/ui-bar-chart.vue';

// props
const props = defineProps<{ chart: IDashboard['oliveChart'] }>();

// variables
const SERIES: IChartSeries[] = [{ key: 'olives', colorClass: 'bg-primary-olive-light', hoverClass: 'bg-primary-olive-mid', currentClass: 'bg-primary-olive-dark' }];

// computed
const bars = computed(() => props.chart.bars.map((bar) => ({ label: bar.label, values: { olives: bar.oliveKg }, oilLitres: bar.oilLitres, isCurrent: bar.isCurrent })));
</script>
