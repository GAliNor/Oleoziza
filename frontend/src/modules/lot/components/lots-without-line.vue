<template>
  <section class="flex flex-col gap-3" :aria-busy="list.isLoading">
    <p v-if="!isOnline && rowsComputed.length" class="chip self-start bg-warning-subtle text-fg-warning" role="status">{{ $t('lot.withoutLine.offline') }}</p>
    <div v-if="list.isLoading && !rowsComputed.length" class="flex flex-col gap-2">
      <div v-for="index in 4" :key="index" class="skeleton h-18 rounded-card" />
    </div>
    <ui-empty-state v-else-if="list.hasError && !rowsComputed.length" tone="danger" size="compact" :message="$t('lot.register.loadError')">
      <template #action>
        <button type="button" class="btn-secondary" @click="load(true)">{{ $t('lot.register.retry') }}</button>
      </template>
    </ui-empty-state>
    <ui-empty-state v-else-if="!rowsComputed.length" size="compact" :message="$t('lot.withoutLine.empty')" />
    <TransitionGroup v-else name="row-in" tag="ul" class="card flex flex-col divide-y divide-default overflow-hidden p-0">
      <li v-for="lot in rowsComputed" :key="lot.id">
        <lot-without-line-row :lot="lot" :lines="pressLines" :lots="lotStore.lots" :is-open="openId === lot.id" :can-assign="canAssign && !lot.isPendingSync" @toggle="openId = openId === lot.id ? null : lot.id" @detail="emit('open', lot)" @assign="handleAssign(lot, $event)" />
      </li>
    </TransitionGroup>
    <ui-load-more :shown="list.items.length" :total="list.total" :is-loading="list.isLoadingMore" @more="lotStore.fetchMoreWithoutLine()" />
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useLotStore } from 'lot/stores/lot';
import { useToastStore } from 'global/stores/toast';
import { createId } from 'global/composables/crypto';
import { useOnlineStatus } from 'global/composables/use-online-status';
import { formatPressLine } from 'configuration/composables/equipment';
import { useSiteEquipment } from 'configuration/composables/use-site-equipment';
import { suggestStart } from 'lot/composables/press-schedule';
import type { IPressLineSetting } from 'configuration/types/configuration';
import type { ILot } from 'lot/types/lot';

import UiEmptyState from 'global/components/ui-empty-state.vue';
import UiLoadMore from 'global/components/ui-load-more.vue';
import LotWithoutLineRow from 'lot/components/lot-without-line-row.vue';

// props
const props = defineProps<{ siteId: string; canAssign: boolean; search?: string }>();

// emits
const emit = defineEmits<{ (event: 'open', lot: ILot): void }>();

// stores
const { t } = useI18n();
const lotStore = useLotStore();
const toastStore = useToastStore();
const { isOnline } = useOnlineStatus();
const { pressLines } = useSiteEquipment(() => props.siteId);

// variables
const openId = ref<string | null>(null);

// computed
const list = computed(() => lotStore.withoutLine);
/** Receptions not sent yet first, then the server's, oldest first. */
const rowsComputed = computed((): ILot[] => {
  const unsent = lotStore.lots.filter((lot) => lot.isPendingSync && lot.status === 'waiting' && !lot.pressLineId);
  const text = (props.search ?? '').trim().toLowerCase();
  return [...unsent, ...list.value.items.filter((lot) => !unsent.some((item) => item.id === lot.id))].filter((lot) => !text || lot.clientName.toLowerCase().includes(text) || lot.code.toLowerCase().includes(text));
});

// methods
const load = (isForced = false): Promise<void> => lotStore.fetchWithoutLine(props.siteId, isForced);

// watchers
watch(() => props.siteId, () => load(), { immediate: true });

// event handlers
const handleAssign = async (lot: ILot, line: IPressLineSetting): Promise<void> => {
  const updated = await lotStore.scheduleLot(lot, { id: createId(), pressLineId: line.id, plannedStartAt: suggestStart(lotStore.lots, line.id, new Date()) });
  if (!updated) return;
  openId.value = null;
  toastStore.push(t('lot.withoutLine.assigned', { client: updated.clientName, line: formatPressLine(line) }), 'success');
};
</script>
