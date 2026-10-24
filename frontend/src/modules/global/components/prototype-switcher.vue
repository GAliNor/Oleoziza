<template>
  <div
    v-if="isEnabled"
    class="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-neutral-900 px-2 py-1.5
      text-sm text-white shadow-xl md:bottom-6"
  >
    <button type="button" class="rounded-full px-2 py-1 hover:bg-white/15" aria-label="Variante précédente" @click="handleStep(-1)">←</button>
    <span class="px-2 whitespace-nowrap">
      <span class="font-semibold">{{ current }}</span>
      <span class="text-white/70"> ({{ variants[current] }})</span>
    </span>
    <button type="button" class="rounded-full px-2 py-1 hover:bg-white/15" aria-label="Variante suivante" @click="handleStep(1)">→</button>
  </div>
</template>

<script setup lang="ts">
// PROTOTYPE — floating variant switcher for throwaway UI prototypes; hidden in production builds.
// imports
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// props
const props = defineProps<{ variants: Record<string, string> }>();

// stores
const route = useRoute();
const router = useRouter();

// variables
const isEnabled = import.meta.env.DEV;

// computed
const keys = computed((): string[] => Object.keys(props.variants));
const current = computed((): string => {
  const variant = String(route.query.variant ?? '');
  return keys.value.includes(variant) ? variant : keys.value[0];
});

// event handlers
const handleStep = (offset: number): void => {
  const index = (keys.value.indexOf(current.value) + offset + keys.value.length) % keys.value.length;
  router.replace({ query: { ...route.query, variant: keys.value[index] } });
};

const handleKeydown = (event: KeyboardEvent): void => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select, [contenteditable]')) return;
  if (event.key === 'ArrowLeft') handleStep(-1);
  if (event.key === 'ArrowRight') handleStep(1);
};

// lifecycle
onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>
