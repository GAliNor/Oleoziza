<template>
  <span
    class="avatar-tag avatar overflow-hidden"
    :class="faceUri ? 'bg-selected' : fallbackClass"
    :style="{ animationDelay: `${delay}ms` }"
    :title="name"
  >
    <img v-if="faceUri" class="avatar-tag-face h-full w-full" :src="faceUri" alt="" @error="handleError" />
    <template v-else>{{ initials }}</template>
  </span>
</template>

<script setup lang="ts">
// imports
import { ref, watch } from 'vue';

import { renderAvatar, toInitials } from 'global/composables/avatar';
import type { AvatarKind } from 'global/types/avatar';

// props
const props = withDefaults(defineProps<{ name: string; kind: AvatarKind; delay?: number; fallbackClass?: string }>(), {
  delay: 0,
  fallbackClass: 'bg-action text-fg-on-action',
});

// variables
const faceUri = ref<string | null>(null);
const initials = ref('');

// methods
const renderFace = async (): Promise<void> => {
  const { name, kind } = props;
  initials.value = toInitials(name);
  faceUri.value = null;
  try {
    const uri = await renderAvatar(kind, name);
    if (name === props.name && kind === props.kind) faceUri.value = uri;
  } catch {
    faceUri.value = null;
  }
};

// event handlers
const handleError = (): void => {
  faceUri.value = null;
};

// watchers
watch(() => [props.name, props.kind], renderFace, { immediate: true });
</script>

<style scoped>
.avatar-tag {
  animation: avatar-pop 0.55s var(--ease-premium) both;
}

.avatar-tag-face {
  transform-origin: 50% 85%;
}

.avatar-tag:hover .avatar-tag-face,
tr:hover .avatar-tag-face {
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
  .avatar-tag,
  .avatar-tag:hover .avatar-tag-face,
  tr:hover .avatar-tag-face {
    animation: none;
  }
}
</style>
