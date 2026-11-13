<template>
  <section class="flex min-w-0 flex-col gap-3" :aria-label="title ?? $t('dashboard.management.lines.title')">
    <p v-if="title" class="label text-fg-secondary-paragraph">{{ title }}</p>
    <div v-if="boards.length" class="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]">
      <press-line-card v-for="board in boards" :key="board.key" :board="board" is-read-only @open="handleOpen" />
    </div>
    <p v-else class="card body-two">{{ $t('dashboard.management.lines.none') }}</p>
  </section>
</template>

<script setup lang="ts">
// imports
import { useRouter } from 'vue-router';

import { useLotStore } from 'lot/stores/lot';
import { useSiteEquipment } from 'configuration/composables/use-site-equipment';
import { useLineBoards } from 'dashboard/composables/use-line-boards';
import type { ILot } from 'lot/types/lot';

import PressLineCard from 'dashboard/components/press-line-card.vue';

// props
const props = defineProps<{ siteId: string; title?: string }>();

// stores
const router = useRouter();
const lotStore = useLotStore();

// variables
const { pressLines } = useSiteEquipment(() => props.siteId);
const boards = useLineBoards(() => lotStore.lots.filter((lot) => lot.siteId === props.siteId), pressLines);

// event handlers
const handleOpen = (lot: ILot): void => {
  router.push({ name: 'lot', query: { lot: lot.id } });
};
</script>
