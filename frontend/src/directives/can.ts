// imports
import { watchEffect, type Directive, type WatchStopHandle } from 'vue';

import { useAuthStore } from 'auth/stores/auth';
import type { Permission } from 'auth/types/auth';

// variables
const stopHandles = new WeakMap<HTMLElement, WatchStopHandle>();

// methods
const stopWatching = (el: HTMLElement): void => {
  stopHandles.get(el)?.();
  stopHandles.delete(el);
};

const watchPermission = (el: HTMLElement, permission: Permission): void => {
  stopWatching(el);
  const authStore = useAuthStore();
  stopHandles.set(
    el,
    watchEffect(() => {
      el.hidden = !authStore.can(permission);
    }),
  );
};

export const can: Directive<HTMLElement, Permission> = {
  mounted: (el, binding) => watchPermission(el, binding.value),
  updated: (el, binding) => {
    if (binding.value !== binding.oldValue) watchPermission(el, binding.value);
  },
  unmounted: (el) => stopWatching(el),
};
