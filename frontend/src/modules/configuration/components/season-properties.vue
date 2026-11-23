<template>
  <ui-section :title="$t('configuration.season.sectionTitle')" :icon="CalendarLineIcon" tone="neutral">
    <ui-slide :is-away="!!asked">
      <ui-property-list class="grid grid-cols-1 items-start gap-x-4 @4xl:grid-cols-2">
        <ui-property :label="$t('configuration.season.status')" :icon="OliveFillIcon">
          <span class="chip" :class="STATUS_TONES[season.status]">{{ $t(`season.status.${season.status}`) }}</span>
          <template v-if="canManage" #below>
            <div v-if="actionsComputed.length" class="flex flex-wrap gap-2 pt-1 pb-1">
              <button v-for="action in actionsComputed" :key="action" type="button" class="min-h-10 px-4" :class="action === 'delete' ? 'btn-plain text-fg-secondary-paragraph hover:bg-danger-subtle hover:text-fg-danger' : 'btn-secondary'" :disabled="isLocked" @click="handleAsk(action)">
                {{ $t(`configuration.season.${action}`) }}
              </button>
            </div>
          </template>
        </ui-property>
        <ui-property :label="$t('configuration.season.dates')" :icon="CalendarLineIcon" :is-locked="!canMoveComputed" :lock-reason="season.status === 'closed' ? $t('configuration.season.datesClosed') : undefined" :hint="$t('configuration.season.datesHint')" :problem="datesProblemComputed" :save="saveDates" is-explicit :action-label="$t('configuration.price.change')" @start="handleStartDates">
          <span class="tabular-nums">{{ datesComputed }}</span>
          <template #editor>
            <div class="grid gap-2 @md:grid-cols-2">
              <ui-date-picker v-model="startsOn" :label="$t('configuration.season.startsOn')" :max="season.status === 'open' ? todayIso() : undefined" />
              <ui-date-picker v-model="endsOn" :label="$t('configuration.season.endsOn')" :min="startsOn" />
            </div>
          </template>
        </ui-property>
      </ui-property-list>
      <template #away>
        <ui-consequences
          v-if="asked"
          :title="$t(`configuration.season.ask.${asked}`, { label: season.label })"
          :lines="seasonConsequences(asked, season, seasonStore.openSeason)"
          :confirm-label="$t(`configuration.season.${asked}`)"
          :is-busy="seasonStore.isSaving"
          @cancel="asked = null"
          @confirm="handleConfirm(asked)"
        />
      </template>
    </ui-slide>
  </ui-section>
</template>

<script setup lang="ts">
// imports
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSeasonStore } from 'season/stores/season';
import { useSessionStore } from 'global/stores/session';
import { useToastStore } from 'global/stores/toast';
import { formatFullDate, todayIso } from 'global/composables/date';
import { seasonConsequences, type SeasonAction } from 'configuration/composables/season-consequences';
import { seasonEnd } from 'configuration/composables/season-dates';
import { seasonDatesProblem } from 'season/composables/season-dates-problem';
import type { ISeason, SeasonStatus } from 'season/types/season';

import UiConsequences from 'global/components/ui-consequences.vue';
import UiDatePicker from 'global/components/ui-date-picker.vue';
import UiProperty from 'global/components/ui-property.vue';
import UiPropertyList from 'global/components/ui-property-list.vue';
import UiSection from 'global/components/ui-section.vue';
import UiSlide from 'global/components/ui-slide.vue';
import CalendarLineIcon from 'global/icons/calendar-line.icon.vue';
import OliveFillIcon from 'global/icons/olive-fill.icon.vue';

// props
const props = defineProps<{ season: ISeason; canManage: boolean; isLocked: boolean }>();

// emits
const emit = defineEmits<{ (event: 'changed'): void; (event: 'remove'): void }>();

// stores
const { t } = useI18n();
const seasonStore = useSeasonStore();
const sessionStore = useSessionStore();
const toastStore = useToastStore();

// variables
const STATUS_TONES: Record<SeasonStatus, string> = { open: 'bg-success-subtle text-fg-success', planned: 'bg-info-subtle text-fg-info', closed: 'bg-emphasis text-fg-primary-paragraph' };
/** The action being explained before it is done; deleting takes the whole page instead. */
const asked = ref<Exclude<SeasonAction, 'delete'> | null>(null);
const startsOn = ref('');
const endsOn = ref('');

// computed
const isOwnerComputed = computed((): boolean => sessionStore.session?.isOwner === true);
const latestStartedComputed = computed((): ISeason | undefined => [...seasonStore.seasons].filter((season) => season.status !== 'planned').sort((first, second) => second.startsOn.localeCompare(first.startsOn))[0]);
const actionsComputed = computed((): SeasonAction[] => {
  const actions: SeasonAction[] = [];
  if (props.season.status === 'planned') actions.push('open');
  if (props.season.status === 'open') actions.push('close');
  if (!isOwnerComputed.value) return actions;
  if (props.season.status === 'closed' && !seasonStore.openSeason && latestStartedComputed.value?.id === props.season.id) actions.push('reopen');
  actions.push('delete');
  return actions;
});
const datesComputed = computed((): string => `${formatFullDate(`${props.season.startsOn}T12:00:00Z`)} → ${formatFullDate(`${seasonEnd(props.season)}T12:00:00Z`)}`);
const canMoveComputed = computed((): boolean => props.canManage && !props.isLocked && props.season.status !== 'closed');
const datesProblemComputed = computed((): string | null => {
  if (!startsOn.value || !endsOn.value) return t('global.form.required');
  const problem = seasonDatesProblem(seasonStore.seasons, props.season, startsOn.value, endsOn.value, todayIso());
  return problem ? t(`global.errors.${problem}`) : null;
});

// methods
const saveDates = async (): Promise<true | string> => {
  const saved = await seasonStore.setDates(props.season.id, startsOn.value, endsOn.value);
  if (!saved) {
    const key = `global.errors.${seasonStore.saveErrorCode}`;
    return t(seasonStore.saveErrorCode ? key : 'configuration.saveError');
  }
  toastStore.push(t('configuration.season.datesDone', { label: saved.label }), 'success');
  emit('changed');
  return true;
};

// event handlers
const handleStartDates = (): void => {
  startsOn.value = props.season.startsOn;
  endsOn.value = seasonEnd(props.season);
};

const handleAsk = (action: SeasonAction): void => {
  if (action === 'delete') emit('remove');
  else asked.value = action;
};

const handleConfirm = async (action: Exclude<SeasonAction, 'delete'>): Promise<void> => {
  const { id, label } = props.season;
  const isDone = await seasonStore[action](id);
  if (!isDone) return;
  asked.value = null;
  toastStore.push(t(`configuration.season.${action}Done`, { label }), 'success');
  emit('changed');
};
</script>
