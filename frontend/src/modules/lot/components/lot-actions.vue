<template>
  <section v-if="canSchedule || canMove" class="flex flex-col gap-3 border-t border-default pt-5" :aria-label="$t('lot.actions.title')">
    <confirm-move
      v-if="isMoving"
      :lot="lot"
      :avatar-variant="avatarVariant"
      :next-label="$t(`lot.status.${nextStatus}`)"
      :lines="pressLines"
      :tanks="tanks"
      :back-label="$t('lot.actions.back')"
      @close="isMoving = false"
      @confirm="handleConfirm"
    />
    <template v-else>
      <h3 class="label">{{ $t('lot.actions.title') }}</h3>
      <lot-schedule-form v-if="isScheduling" :key="lot.id" :lot="lot" :lines="pressLines" @close="isScheduling = false" />
      <button v-else-if="canSchedule" type="button" class="btn-secondary min-h-12" @click="isScheduling = true">{{ $t('lot.schedule.open') }}</button>
      <button v-if="canMove" type="button" class="press min-h-12 w-full rounded-control px-4 font-semibold" :class="LOT_MOVE_TONES[lot.status]" @click="isMoving = true">
        {{ $t(`lot.move.${lot.status}`) }}
      </button>
    </template>
  </section>
</template>

<script setup lang="ts">
// imports
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useClientStore } from 'client/stores/client';
import { useLotStore } from 'lot/stores/lot';
import { useSiteStore } from 'site/stores/site';
import { useToastStore } from 'global/stores/toast';
import { useSiteEquipment } from 'configuration/composables/use-site-equipment';
import { clientAvatarVariant } from 'client/composables/avatar-variant';
import { LOT_MOVE_TONES, LOT_STATUSES } from 'lot/constants/lot';
import type { AvatarVariant } from 'global/types/avatar';
import type { Permission } from 'global/types/session';
import type { ILot, ILotMove, LotStatus } from 'lot/types/lot';

import ConfirmMove from 'lot/components/confirm-move.vue';
import LotScheduleForm from 'lot/components/lot-schedule-form.vue';

// props
const props = defineProps<{ lot: ILot }>();

// stores
const { t } = useI18n();
const clientStore = useClientStore();
const lotStore = useLotStore();
const siteStore = useSiteStore();
const toastStore = useToastStore();

// variables
/** Who may move a Lot on from each status: the same Permissions the Operator uses. */
const MOVE_PERMISSIONS: Partial<Record<LotStatus, Permission>> = { waiting: 'pressing.create', pressing: 'pressing.create', pressed: 'withdrawal.create' };
const isScheduling = ref(false);
const isMoving = ref(false);
const { pressLines, tanks } = useSiteEquipment(() => props.lot.siteId);

// computed
const isWritable = computed((): boolean => !siteStore.isAllSites);
const canSchedule = computed((): boolean => isWritable.value && props.lot.status === 'waiting' && pressLines.value.length > 0 && siteStore.can('lot.update_status'));
const canMove = computed((): boolean => {
  const permission = MOVE_PERMISSIONS[props.lot.status];
  return isWritable.value && !!permission && siteStore.can(permission);
});
const nextStatus = computed((): LotStatus => LOT_STATUSES[Math.min(LOT_STATUSES.length - 1, LOT_STATUSES.indexOf(props.lot.status) + 1)]);
const avatarVariant = computed((): AvatarVariant => clientAvatarVariant(clientStore.clientById(props.lot.clientId)?.kind ?? 'individual'));

// watchers
watch(
  () => props.lot.id,
  () => {
    isScheduling.value = false;
    isMoving.value = false;
  },
);

// event handlers
const handleConfirm = async (lot: ILot, move: ILotMove): Promise<void> => {
  const from = lot.status;
  const updated = await lotStore.moveLot(lot, move);
  if (!updated) {
    toastStore.push(t('dashboard.operator.moveError'), 'danger');
    return;
  }
  toastStore.push(t('dashboard.operator.moved', { client: updated.clientName, from: t(`lot.status.${from}`), to: t(`lot.status.${updated.status}`) }), 'success');
  isMoving.value = false;
};
</script>
