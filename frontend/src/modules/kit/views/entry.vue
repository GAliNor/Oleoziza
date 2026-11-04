<template>
  <main class="min-h-screen bg-page text-fg-default">
    <div class="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8">
      <header class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 class="display-md">{{ $t('kit.title') }}</h1>
          <button type="button" class="btn-secondary min-h-10" :aria-pressed="isDark" @click="handleToggleDark">
            {{ isDark ? $t('kit.lightMode') : $t('kit.darkMode') }}
          </button>
        </div>
        <p class="max-w-2xl text-fg-primary-paragraph">{{ $t('kit.subtitle') }}</p>
        <nav class="flex flex-wrap gap-2">
          <a
            v-for="section in SECTIONS"
            :key="section"
            :href="`#${section}`"
            class="rounded-full border border-default bg-surface px-3 py-1.5 text-sm text-fg-primary-paragraph hover:border-strong"
          >
            {{ $t(`kit.sections.${section}.title`) }}
          </a>
        </nav>
      </header>

      <kit-section id="palette" :title="$t('kit.sections.palette.title')" :description="$t('kit.sections.palette.description')">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <div v-for="color in colors" :key="color.name" class="flex flex-col gap-2">
            <div class="h-16 rounded-card border border-default" :style="{ background: `var(${color.variable})` }" />
            <p class="text-sm font-medium text-fg-default">{{ color.name }}</p>
            <p class="-mt-2 font-mono text-xs text-fg-secondary-paragraph">{{ color.value }}</p>
          </div>
        </div>
      </kit-section>

      <kit-section id="tokens" :title="$t('kit.sections.tokens.title')" :description="$t('kit.sections.tokens.description')">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="token in semanticTokens" :key="token.variable" class="flex items-center gap-3 rounded-card border border-default bg-surface p-3">
            <div class="h-10 w-10 shrink-0 rounded-lg border border-default" :style="{ background: `var(${token.variable})` }" />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-fg-default">{{ token.className }}</p>
              <p class="truncate font-mono text-xs text-fg-secondary-paragraph">{{ token.value }}</p>
            </div>
          </div>
        </div>
      </kit-section>

      <kit-section id="shadows" :title="$t('kit.sections.shadows.title')" :description="$t('kit.sections.shadows.description')">
        <div class="grid gap-6 rounded-card bg-subtle p-6 sm:grid-cols-3">
          <div v-for="shadow in shadows" :key="shadow.name" class="flex h-28 items-end rounded-card bg-surface p-4" :style="{ boxShadow: `var(${shadow.variable})` }">
            <p class="text-sm font-medium text-fg-default">shadow-{{ shadow.name }}</p>
          </div>
        </div>
      </kit-section>

      <kit-section id="radius" :title="$t('kit.sections.radius.title')" :description="$t('kit.sections.radius.description')">
        <div class="flex flex-wrap gap-4">
          <div v-for="radius in radii" :key="radius.name" class="flex flex-col items-center gap-2">
            <div class="h-16 w-16 border-2 border-strong bg-surface" :style="{ borderRadius: `var(${radius.variable})` }" />
            <p class="font-mono text-xs text-fg-secondary-paragraph">rounded-{{ radius.name }}</p>
          </div>
        </div>
      </kit-section>

      <kit-section id="typography" :title="$t('kit.sections.typography.title')" :description="$t('kit.sections.typography.description')">
        <div class="flex flex-col divide-y divide-default rounded-card bg-surface px-4">
          <div v-for="name in typeClasses" :key="name" class="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:items-baseline">
            <code class="font-mono text-xs text-fg-secondary-paragraph">.{{ name }}</code>
            <p :class="name">{{ $t('kit.sample') }}</p>
          </div>
        </div>
      </kit-section>

      <kit-section id="components" :title="$t('kit.sections.components.title')" :description="$t('kit.sections.components.description')">
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="card flex flex-col gap-4">
            <div class="flex flex-wrap items-center gap-3">
              <button type="button" class="btn-primary">{{ $t('kit.components.primary') }}</button>
              <button type="button" class="btn-secondary">{{ $t('kit.components.secondary') }}</button>
              <button type="button" class="btn-primary" disabled>{{ $t('kit.components.disabled') }}</button>
              <button type="button" class="link">{{ $t('kit.components.link') }}</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-for="tone in TONES" :key="tone.name" class="chip" :class="tone.classes">{{ $t(`kit.tones.${tone.name}`) }}</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="choice-chip">{{ $t('kit.components.choice') }}</button>
              <button type="button" class="choice-chip choice-chip-active">{{ $t('kit.components.choiceActive') }}</button>
            </div>
          </div>
          <div class="card flex flex-col gap-4">
            <label class="flex flex-col gap-2">
              <span class="label">{{ $t('kit.components.label') }}</span>
              <input class="input" :placeholder="$t('kit.components.placeholder')" />
            </label>
            <p class="form-error">{{ $t('kit.components.error') }}</p>
            <div class="grid grid-cols-2 gap-3">
              <button type="button" class="toggle-tile">{{ $t('kit.components.tile') }}</button>
              <button type="button" class="toggle-tile toggle-tile-active">{{ $t('kit.components.tileActive') }}</button>
            </div>
            <div class="skeleton h-10" />
          </div>
        </div>
      </kit-section>

      <kit-section id="kit" :title="$t('kit.sections.kit.title')" :description="$t('kit.sections.kit.description')">
        <div class="grid gap-6 lg:grid-cols-2">
          <kit-demo name="ui-segmented">
            <ui-segmented v-model="segment" :options="SEGMENTS" :label="$t('kit.sections.kit.title')" />
            <ui-segmented v-model="segment" variant="strong-pills" :options="SEGMENTS" :label="$t('kit.sections.kit.title')" />
            <ui-segmented v-model="segment" class="self-start" variant="tabs" :options="SEGMENTS" :label="$t('kit.sections.kit.title')" />
            <ui-segmented v-model="segment" variant="tabs" is-full :options="SEGMENTS" :label="$t('kit.sections.kit.title')" />
          </kit-demo>

          <kit-demo name="ui-avatar">
            <div class="flex flex-wrap items-center gap-3">
              <ui-avatar name="Mohammed Benali" variant="notionists" />
              <ui-avatar name="Coopérative Angad" variant="patchwork" />
              <ui-avatar name="Hamid Zerrouki" variant="line-face" />
              <ui-avatar name="Fatima Zahra" fallback-class="bg-selected text-fg-brand" />
              <ui-avatar class="h-16 w-16 text-lg" name="Said Tahiri" fallback-class="bg-action text-fg-on-action" />
            </div>
          </kit-demo>

          <kit-demo name="ui-stat-tile">
            <ui-stat-tile label="Olives · 7 jours" :value="77921" unit="kg" sub="58 réceptions" delta="+8,2 %" delta-label="vs saison préc." is-delta-good :progress="65" />
          </kit-demo>

          <kit-demo name="ui-bar-chart">
            <ui-bar-chart title="Olives reçues" unit="kg" :series="CHART_SERIES" :bars="CHART_BARS">
              <template #tooltip="{ bar }">{{ bar.values.olives }} kg</template>
            </ui-bar-chart>
          </kit-demo>

          <kit-demo name="ui-field">
            <ui-field v-slot="{ id }" :label="$t('kit.components.label')">
              <input :id="id" class="input" :placeholder="$t('kit.components.placeholder')" />
            </ui-field>
          </kit-demo>

          <kit-demo name="ui-progress-bar">
            <ui-progress-bar class="h-2" :value="65" :label="$t('kit.sections.kit.title')" />
          </kit-demo>

          <kit-demo name="ui-confirm-button">
            <ui-confirm-button class="self-start" :label="$t('kit.demo.delete')" :confirm-label="$t('kit.demo.confirmDelete')" />
          </kit-demo>

          <kit-demo name="ui-empty-state">
            <ui-empty-state :message="$t('kit.demo.empty')" />
            <ui-empty-state tone="danger" size="compact" :message="$t('kit.demo.error')">
              <template #action><button type="button" class="btn-secondary">{{ $t('kit.demo.retry') }}</button></template>
            </ui-empty-state>
          </kit-demo>

          <kit-demo name="ui-pagination">
            <ui-pagination v-model:page="demoPage" :page-count="3" :total="27" :page-size="10" />
          </kit-demo>

          <kit-demo name="ui-master-detail">
            <ui-master-detail :is-open="isDemoOpen" :back-label="$t('kit.demo.back')" @close="isDemoOpen = false">
              <template #list>
                <button type="button" class="btn-secondary self-start" @click="isDemoOpen = true">{{ $t('kit.demo.open') }}</button>
              </template>
              <template #detail>
                <p class="body-two">{{ $t('kit.demo.detail') }}</p>
              </template>
            </ui-master-detail>
          </kit-demo>
        </div>
      </kit-section>
    </div>
  </main>
</template>

<script setup lang="ts">
// imports
import { onBeforeUnmount, ref } from 'vue';

import tokensCss from '~/styles/tokens.css?raw';
import typographyCss from '~/styles/typography.css?raw';
import { readClasses, readTokens } from 'kit/composables/stylesheet';

import KitDemo from 'kit/components/kit-demo.vue';
import KitSection from 'kit/components/kit-section.vue';
import UiAvatar from 'global/components/ui-avatar.vue';
import UiBarChart from 'global/components/ui-bar-chart.vue';
import UiConfirmButton from 'global/components/ui-confirm-button.vue';
import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiField from 'global/components/ui-field.vue';
import UiMasterDetail from 'global/components/ui-master-detail.vue';
import UiPagination from 'global/components/ui-pagination.vue';
import UiProgressBar from 'global/components/ui-progress-bar.vue';
import UiSegmented from 'global/components/ui-segmented.vue';
import UiStatTile from 'global/components/ui-stat-tile.vue';

// variables
const SECTIONS = ['palette', 'tokens', 'shadows', 'radius', 'typography', 'components', 'kit'] as const;
const TONES = [
  { name: 'success', classes: 'bg-success-subtle text-fg-success' },
  { name: 'warning', classes: 'bg-warning-subtle text-fg-warning' },
  { name: 'danger', classes: 'bg-danger-subtle text-fg-danger' },
  { name: 'info', classes: 'bg-info-subtle text-fg-info' },
  { name: 'accent', classes: 'bg-accent-subtle text-fg-accent' },
  { name: 'highlight', classes: 'bg-highlight text-fg-default' },
] as const;
const SEMANTIC_PREFIXES = { 'text-color': 'text', 'background-color': 'bg', 'border-color': 'border', 'ring-color': 'ring', 'outline-color': 'outline' } as const;
const THEME_TOKENS_CSS = tokensCss.slice(0, tokensCss.indexOf('\n.dark {'));

const colors = readTokens(THEME_TOKENS_CSS, 'color');
const semanticTokens = Object.entries(SEMANTIC_PREFIXES).flatMap(([namespace, prefix]) =>
  readTokens(THEME_TOKENS_CSS, namespace).map((token) => ({ ...token, className: `${prefix}-${token.name}` })),
);
const shadows = readTokens(THEME_TOKENS_CSS, 'shadow');
const radii = readTokens(THEME_TOKENS_CSS, 'radius');
const typeClasses = readClasses(typographyCss);
const SEGMENTS = [
  { key: 'one' as const, label: 'Vue d’ensemble' },
  { key: 'two' as const, label: 'Production', count: 3 },
];
const CHART_SERIES = [{ key: 'olives', colorClass: 'bg-primary-olive-light', hoverClass: 'bg-primary-olive-mid', currentClass: 'bg-primary-olive-dark' }];
const CHART_BARS = [
  { label: 'lun.', values: { olives: 620 } },
  { label: 'mar.', values: { olives: 980 } },
  { label: 'mer.', values: { olives: 410 } },
  { label: 'auj.', values: { olives: 1240 }, isCurrent: true },
];
const segment = ref<'one' | 'two'>('one');
const demoPage = ref(1);
const isDemoOpen = ref(false);
const isDark = ref(document.documentElement.classList.contains('dark'));

// event handlers
const handleToggleDark = (): void => {
  isDark.value = document.documentElement.classList.toggle('dark');
};

// lifecycle
onBeforeUnmount(() => document.documentElement.classList.remove('dark'));
</script>
