<template>
  <span
    class="ui-avatar round-badge overflow-hidden"
    :class="faceUri ? 'bg-selected' : fallbackClass"
    :style="{ animationDelay: `${delay}ms` }"
    :title="name"
  >
    <img v-if="faceUri" class="ui-avatar-face h-full w-full" :src="faceUri" alt="" @error="handleError" />
    <template v-else>{{ initials }}</template>
  </span>
</template>

<script setup lang="ts">
// imports
import { ref, watch } from 'vue';

import { renderAvatar, toInitials } from 'global/composables/avatar';
import type { AvatarVariant } from 'global/types/avatar';

// props
const props = withDefaults(defineProps<{ name: string; variant?: AvatarVariant; delay?: number; fallbackClass?: string }>(), {
  variant: undefined,
  delay: 0,
  fallbackClass: 'bg-action text-fg-on-action',
});

// variables
const faceUri = ref<string | null>(null);
const initials = ref('');

// methods
const renderFace = async (): Promise<void> => {
  const { name, variant } = props;
  initials.value = toInitials(name);
  faceUri.value = null;
  if (!variant) return;
  try {
    const uri = await renderAvatar(variant, name);
    if (name === props.name && variant === props.variant) faceUri.value = uri;
  } catch {
    faceUri.value = null;
  }
};

// event handlers
const handleError = (): void => {
  faceUri.value = null;
};

// watchers
watch(() => [props.name, props.variant], renderFace, { immediate: true });
</script>

<style scoped>
.ui-avatar {
  animation: avatar-pop 0.55s var(--ease-premium) both;
}

.ui-avatar-face {
  transform-origin: 50% 85%;
}

.ui-avatar:hover .ui-avatar-face,
tr:hover .ui-avatar-face {
  animation: avatar-nod 0.9s var(--ease-premium);
}

@keyframes avatar-pop {
  from {
    opacity: 0;
    transform: scale(0.6) rotate(-8deg);
  }
}

@keyframes avatar-nod {
  30% {
    transform: rotate(-7deg) translateY(-1px);
  }

  60% {
    transform: rotate(5deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-avatar,
  .ui-avatar:hover .ui-avatar-face,
  tr:hover .ui-avatar-face {
    animation: none;
  }
}
</style>
