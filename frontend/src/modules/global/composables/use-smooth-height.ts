import { nextTick, watch, type Ref, type WatchSource } from 'vue';

const DURATION_MS = 460;
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Glides an element from its height before a change to its height after, instead of jumping. */
export const useSmoothHeight = (element: Ref<HTMLElement | null>, changed: WatchSource): void => {
  let running: Animation | undefined;

  watch(changed, async () => {
    const target = element.value;
    if (!target?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = target.offsetHeight;
    running?.cancel();
    await nextTick();
    const to = target.offsetHeight;
    if (from === to) return;
    running = target.animate([{ height: `${from}px`, overflow: 'clip', overflowClipMargin: '8px' }, { height: `${to}px`, overflow: 'clip', overflowClipMargin: '8px' }], { duration: DURATION_MS, easing: EASING });
  });
};
