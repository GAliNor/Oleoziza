// imports
import type { Directive } from 'vue';

import { formatNumber } from 'global/composables/number';

// types
type CountUpValue = number | { value: number; format?: (value: number) => string };

interface ICountUpState {
  current: number;
  frame: number;
}

// variables
const DURATION_MS = 900;
const states = new WeakMap<HTMLElement, ICountUpState>();

// methods
const easeOutExpo = (progress: number): number => (progress >= 1 ? 1 : 1 - 2 ** (-10 * progress));

const formatRounded = (value: number): string => formatNumber(Math.round(value));

const readBinding = (binding: CountUpValue): { value: number; format: (value: number) => string } =>
  typeof binding === 'number' ? { value: binding, format: formatRounded } : { value: binding.value, format: binding.format ?? formatNumber };

const animate = (el: HTMLElement, binding: CountUpValue): void => {
  const { value, format } = readBinding(binding);
  const state = states.get(el) ?? { current: 0, frame: 0 };
  states.set(el, state);
  cancelAnimationFrame(state.frame);
  const from = state.current;
  if (from === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.current = value;
    el.textContent = format(value);
    return;
  }
  const start = performance.now();
  const step = (now: number): void => {
    const progress = Math.min((now - start) / DURATION_MS, 1);
    state.current = from + (value - from) * easeOutExpo(progress);
    el.textContent = format(state.current);
    if (progress < 1) state.frame = requestAnimationFrame(step);
  };
  state.frame = requestAnimationFrame(step);
};

export const countUp: Directive<HTMLElement, CountUpValue> = {
  mounted: (el, binding) => animate(el, binding.value),
  updated: (el, binding) => {
    if (readBinding(binding.value).value !== readBinding(binding.oldValue ?? 0).value) animate(el, binding.value);
  },
  unmounted: (el) => {
    cancelAnimationFrame(states.get(el)?.frame ?? 0);
    states.delete(el);
  },
};
