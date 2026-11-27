<template>
  <span class="inline-flex shrink-0">
    <img v-if="variant === 'mark'" :src="MARK_URL" alt="" class="h-full w-full" draggable="false" />
    <template v-else>
      <img :src="LIGHT_URL" alt="" class="h-full w-auto dark:hidden" draggable="false" />
      <img :src="DARK_URL" alt="" class="hidden h-full w-auto dark:block" draggable="false" />
    </template>
  </span>
</template>

<script setup lang="ts">
// imports
import DARK_URL from '~/assets/brand/olivor-horizontal-dark.svg';
import LIGHT_URL from '~/assets/brand/olivor-horizontal-light.svg';
import MARK_URL from '~/assets/brand/olivor-mark.svg';

// props
/** The client's Olivor logo: the emblem and wordmark side by side, or the small mark alone for tight places. The caller sets the height. */
withDefaults(defineProps<{ variant?: 'horizontal' | 'mark' }>(), { variant: 'horizontal' });
</script>
