<template>
  <div ref="root" class="property group/property grid items-start gap-x-4 rounded-control px-2 py-1 transition-colors duration-500 ease-(--ease-premium) @lg:grid-cols-[11rem_minmax(0,1fr)]" :class="{ 'bg-subtle/70': isEditing }" :data-field="name">
    <dt class="flex min-h-9 items-center gap-2 text-sm text-fg-secondary-paragraph">
      <component :is="icon" v-if="icon" class="h-4 w-4 shrink-0 text-fg-muted" />
      <span>{{ label }}</span>
      <span v-if="isOptional && isEditing" class="caption">{{ $t('global.form.optional') }}</span>
    </dt>
    <dd class="min-w-0">
      <div class="flex min-w-0 items-start gap-2">
        <div class="relative min-w-0 flex-1">
          <Transition name="morph">
            <button
              v-if="!isEditing && isEditable"
              key="value"
              type="button"
              class="property-value -mx-2 flex min-h-9 w-[calc(100%+1rem)] min-w-0 cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-start text-fg-display transition-[background-color,transform] duration-300 ease-(--ease-premium) hover:bg-emphasis/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.995]"
              :aria-label="$t('global.property.edit', { label })"
              @click="start"
            >
              <span class="min-w-0">
                <slot v-if="!isEmpty" />
                <span v-else class="text-fg-muted">{{ emptyLabel ?? $t('global.property.empty') }}</span>
              </span>
              <span v-if="actionLabel" class="property-action ms-auto inline-flex min-h-9 shrink-0 items-center rounded-control bg-emphasis/60 px-3 text-sm font-semibold text-fg-display transition-colors duration-300 ease-(--ease-premium)">{{ actionLabel }}</span>
              <pencil-line-icon v-else class="pencil h-3.5 w-3.5 shrink-0 text-fg-muted" />
            </button>
            <div v-else-if="!isEditing" key="locked" class="min-h-9 min-w-0 py-1.5 text-fg-display" :title="lockReason">
              <slot v-if="!isEmpty" />
              <span v-else class="text-fg-muted">—</span>
            </div>
            <div v-else key="editor" class="property-editor flex min-w-0 flex-wrap items-center gap-2 py-0.5" @keydown.esc.stop="cancel" @keydown.enter="handleEnter">
              <div class="min-w-0 flex-1 basis-60">
                <slot name="editor" :submit="submit" />
              </div>
              <div v-if="isExplicit" class="morph-after flex gap-1">
                <button type="button" class="btn-primary min-h-11 px-4" :disabled="isSaving" @click="submit">{{ $t('global.property.save') }}</button>
                <button type="button" class="btn-plain min-h-11 px-3" :disabled="isSaving" @click="cancel">{{ $t('global.property.cancel') }}</button>
              </div>
            </div>
          </Transition>
        </div>
        <slot name="aside" />
        <span class="grid h-9 w-5 shrink-0 place-items-center" role="status">
          <span v-if="isSaving" class="h-4 w-4 animate-spin rounded-full border-2 border-fg-muted border-e-transparent" :aria-label="$t('global.property.saving')" />
          <Transition v-else name="tick">
            <check-line-icon v-if="isJustSaved" class="h-4 w-4 text-fg-success" :aria-label="$t('global.property.saved')" />
          </Transition>
        </span>
      </div>
      <Transition name="field-message">
        <p v-if="error" class="form-error pb-1" role="alert">{{ error }}</p>
      </Transition>
      <p v-if="hint && isEditing && !error" class="body-three pb-1">{{ hint }}</p>
      <slot name="below" />
    </dd>
  </div>
</template>

<script setup lang="ts">
// imports
import { computed, nextTick, onBeforeUnmount, onMounted, ref, type Component } from 'vue';

import { useSmoothHeight } from 'global/composables/use-smooth-height';

import CheckLineIcon from 'global/icons/check-line.icon.vue';
import PencilLineIcon from 'global/icons/pencil-line.icon.vue';

// props
const props = withDefaults(
  defineProps<{
    label: string;
    name?: string;
    icon?: Component;
    hint?: string;
    emptyLabel?: string;
    isEmpty?: boolean;
    /** Shown as a button on the value, where editing must be impossible to miss. */
    actionLabel?: string;
    isOptional?: boolean;
    isLocked?: boolean;
    lockReason?: string;
    /** A value that takes effect at once (a price): saved by its button or Enter, never by leaving it. */
    isExplicit?: boolean;
    /** What is wrong with the value being typed, null when nothing is: a wrong value is never saved. */
    problem?: string | null;
    /** Saves the value being typed: true once saved, or what went wrong, in words. */
    save?: () => Promise<true | string>;
  }>(),
  { name: undefined, icon: undefined, hint: undefined, emptyLabel: undefined, actionLabel: undefined, lockReason: undefined, problem: null, save: undefined },
);

// emits
/** `start`: copy the value into the draft being edited. */
const emit = defineEmits<{ (event: 'start'): void; (event: 'cancel'): void }>();
defineSlots<{ default?: () => unknown; editor?: (scope: { submit: () => Promise<void> }) => unknown; aside?: () => unknown; below?: () => unknown }>();

// variables
const SAVED_MS = 1800;
const FLOATING = '[role="listbox"], [role="dialog"], .dp--menu-wrapper';
const root = ref<HTMLElement | null>(null);
const isEditing = ref(false);
const isSaving = ref(false);
const isJustSaved = ref(false);
const refusal = ref<string | null>(null);
const isChecked = ref(false);
useSmoothHeight(root, isEditing);

// computed
const isEditable = computed((): boolean => !props.isLocked && !!props.save);
const error = computed((): string | null => refusal.value ?? (isChecked.value ? props.problem : null));

// methods
const start = async (): Promise<void> => {
  if (!isEditable.value) return;
  emit('start');
  refusal.value = null;
  isChecked.value = false;
  isEditing.value = true;
  await nextTick();
  root.value?.querySelector<HTMLElement>('.property-editor input, .property-editor textarea, .property-editor button')?.focus();
};

const cancel = (): void => {
  if (!isEditing.value || isSaving.value) return;
  isEditing.value = false;
  refusal.value = null;
  emit('cancel');
};

const submit = async (): Promise<void> => {
  if (!isEditing.value || isSaving.value || !props.save) return;
  isChecked.value = true;
  refusal.value = null;
  if (props.problem) return;
  isSaving.value = true;
  const result = await props.save();
  isSaving.value = false;
  if (result !== true) {
    refusal.value = result;
    return;
  }
  isEditing.value = false;
  isJustSaved.value = true;
  setTimeout(() => (isJustSaved.value = false), SAVED_MS);
};

// event handlers
const handleEnter = (event: KeyboardEvent): void => {
  if ((event.target as HTMLElement).tagName !== 'INPUT') return;
  event.preventDefault();
  submit();
};

/** Leaving the property saves it, as on a page of notes; its own menus and calendar, drawn elsewhere, still belong to it. */
const handleOutside = (event: Event): void => {
  if (!isEditing.value || props.isExplicit) return;
  const target = event.target as HTMLElement;
  if (root.value?.contains(target) || target.closest?.(FLOATING)) return;
  submit();
};

// lifecycle
onMounted(() => {
  document.addEventListener('pointerdown', handleOutside, true);
  document.addEventListener('focusin', handleOutside);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutside, true);
  document.removeEventListener('focusin', handleOutside);
});

defineExpose({ start });
</script>

<style scoped>
/* A pencil on hover; always there on a touch screen, which has none. */
.pencil {
  opacity: 0;
  transition: opacity 180ms ease-out;
}

.property-value:hover .pencil,
.property-value:focus-visible .pencil {
  opacity: 1;
}

@media (pointer: coarse) {
  .pencil {
    opacity: 0.7;
  }
}

.property-value:hover .property-action {
  background-color: var(--background-color-emphasis);
}
</style>
