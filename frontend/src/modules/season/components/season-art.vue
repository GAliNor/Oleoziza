<template>
  <div class="relative overflow-hidden" :class="frameClass">
    <img v-if="image" :src="image" alt="" class="h-full w-full object-cover rtl:-scale-x-100" />
    <svg v-else class="h-full w-full rtl:-scale-x-100" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient :id="`season-sky-${code}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--color-primary-olive-light)" />
          <stop offset="1" stop-color="var(--color-accent-cream)" />
        </linearGradient>
      </defs>
      <rect width="1200" height="300" :fill="`url(#season-sky-${code})`" />
      <circle :cx="look.sunX" :cy="look.sunY" r="34" fill="var(--color-accent-gold)" opacity="0.85" />
      <path :d="hill(look.far, 170)" fill="var(--color-primary-olive-light)" opacity="0.9" />
      <rect v-if="look.hasMist" y="165" width="1200" height="40" fill="var(--color-accent-cream)" opacity="0.55" />
      <path :d="hill(look.mid, 205)" fill="var(--color-primary-olive-mid)" opacity="0.75" />
      <g v-for="tree in look.trees" :key="tree.x" :transform="`translate(${tree.x} ${tree.y}) scale(${tree.size})`">
        <path d="M-4 0 C-6 -14 -2 -22 -6 -34 L2 -34 C0 -24 6 -14 4 0 Z" fill="var(--color-accent-brown)" />
        <ellipse cx="-14" cy="-40" rx="22" ry="13" fill="var(--color-primary-olive)" />
        <ellipse cx="12" cy="-44" rx="24" ry="14" fill="var(--color-primary-olive-mid)" />
        <ellipse cx="-2" cy="-54" rx="18" ry="11" fill="var(--color-primary-olive)" />
      </g>
      <path :d="hill(look.near, 255)" :fill="look.ground" />
    </svg>
    <span v-if="!image && isSketchNoted" class="absolute end-3 bottom-2 rounded-control bg-surface/80 px-2 py-0.5 caption text-fg-muted">{{ $t('season.art.sketch') }}</span>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import type { ISeason } from 'season/types/season';

// props
const props = withDefaults(defineProps<{ season: Pick<ISeason, 'code' | 'illustrationUrl' | 'illustrationDarkUrl'>; frameClass?: string; isSketchNoted?: boolean }>(), {
  frameClass: 'h-40',
  isSketchNoted: false,
});

// variables
const isDark = ref(document.documentElement.classList.contains('dark'));
let themeObserver: MutationObserver | null = null;

// computed
/** The banner uploaded to storage for this Season (the dusk one in dark mode), otherwise the sketch. */
const image = computed((): string | null => (isDark.value && props.season.illustrationDarkUrl) || props.season.illustrationUrl);
const code = computed((): string => props.season.code);
const look = computed(() => {
  const yearIndex = Number(code.value.slice(0, 2)) - 26;
  const cycle = (length: number): number => ((yearIndex % length) + length) % length;
  const scene = cycle(5);
  const light = cycle(3);
  return {
    sunX: [1080, 960, 1120][light],
    sunY: [120, 60, 150][light],
    hasMist: light === 0,
    far: 18 + scene * 6,
    mid: 26 + ((scene * 7) % 20),
    near: 14 + ((scene * 5) % 12),
    ground: ['var(--color-primary-olive-dark)', 'var(--color-accent-brown)', 'var(--color-primary-olive)', 'var(--color-accent-sand)'][cycle(4)],
    trees: Array.from({ length: 4 + scene }, (_, index) => ({ x: 640 + index * (520 / (4 + scene)) + ((index * 37) % 23), y: 236 + ((index * 13) % 18), size: 0.9 + ((index + scene) % 3) * 0.25 })),
  };
});

// methods
const hill = (amplitude: number, base: number): string => {
  const points = Array.from({ length: 13 }, (_, index) => `${index * 100} ${base - Math.sin(index * 0.9 + amplitude) * amplitude}`);
  return `M0 300 L${points.join(' L')} L1200 300 Z`;
};

// lifecycle
onMounted(() => {
  themeObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark');
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});
onBeforeUnmount(() => themeObserver?.disconnect());
</script>
