// PROTOTYPE — animates a number towards its new value with an ease-out curve; jumps straight there under reduced motion.
import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

const DURATION_MS = 900;

const easeOutExpo = (progress: number): number => (progress >= 1 ? 1 : 1 - 2 ** (-10 * progress));

export const useCountUp = (target: Ref<number>): Ref<number> => {
  const display = ref(0);
  let frame = 0;

  const animate = (from: number, to: number): void => {
    cancelAnimationFrame(frame);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      display.value = to;
      return;
    }
    const start = performance.now();
    const step = (now: number): void => {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      display.value = from + (to - from) * easeOutExpo(progress);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  watch(target, (value, previous) => animate(previous ?? 0, value), { immediate: true });
  onBeforeUnmount(() => cancelAnimationFrame(frame));

  return display;
};
