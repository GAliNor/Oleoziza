import { computed, reactive, ref, type ComponentPublicInstance, type ComputedRef, type Ref } from 'vue';

import { i18n } from '~/plugins/i18n';

import type { IFormProblem, IFormRule } from 'global/types/form';

const FOCUSABLE = 'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex="-1"])';
const FLASH_MS = 1200;

export interface IFormFeedback {
  /** Bound as `:ref` on the form's element, where fields are looked for. */
  setFormRoot: (element: Element | ComponentPublicInstance | null) => void;
  problemsComputed: ComputedRef<IFormProblem[]>;
  isAttempted: Ref<boolean>;
  /** The message to show under a field: only once it was left, or Save was tapped. */
  errorOf: (key: string) => string | null;
  /** A filled field with nothing wrong, once it was left. */
  isValid: (key: string) => boolean;
  touch: (key: string) => void;
  /** Goes to a field: scrolls it to the middle, focuses it, and makes it glow for a moment. */
  jumpTo: (key: string) => void;
  /** Runs `save` when nothing is wrong; otherwise shows every problem and goes to the first. */
  attempt: (save: () => unknown) => void;
  reset: () => void;
}

/** One behaviour for every form: a field speaks once it is left, then live; Save stays tappable and says what is missing. */
export const useFormFeedback = (rules: () => IFormRule[]): IFormFeedback => {
  let formRoot: Element | null = null;
  const isAttempted = ref(false);
  const touched = reactive(new Set<string>());

  const problemsComputed = computed((): IFormProblem[] =>
    rules()
      .filter((rule) => rule.isMissing || rule.error)
      .map((rule) => ({ key: rule.key, label: rule.label, isMissing: !!rule.isMissing, message: rule.error ?? i18n.global.t('global.form.required') })),
  );

  const setFormRoot = (element: Element | ComponentPublicInstance | null): void => {
    formRoot = element && '$el' in element ? (element.$el as Element) : element;
  };

  const isShown = (key: string): boolean => isAttempted.value || touched.has(key);

  const errorOf = (key: string): string | null => (isShown(key) ? (problemsComputed.value.find((problem) => problem.key === key)?.message ?? null) : null);

  const isValid = (key: string): boolean => isShown(key) && !problemsComputed.value.some((problem) => problem.key === key) && !!rules().find((rule) => rule.key === key)?.isFilled;

  const touch = (key: string): void => {
    touched.add(key);
  };

  const jumpTo = (key: string): void => {
    const field = formRoot?.querySelector<HTMLElement>(`[data-field="${key}"]`);
    if (!field) return;
    const isCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    field.scrollIntoView({ behavior: isCalm ? 'auto' : 'smooth', block: 'center' });
    field.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    field.classList.add('field-flash');
    setTimeout(() => field.classList.remove('field-flash'), FLASH_MS);
  };

  const attempt = (save: () => unknown): void => {
    isAttempted.value = true;
    const [first] = problemsComputed.value;
    if (first) jumpTo(first.key);
    else save();
  };

  const reset = (): void => {
    isAttempted.value = false;
    touched.clear();
  };

  return { setFormRoot, problemsComputed, isAttempted, errorOf, isValid, touch, jumpTo, attempt, reset };
};
