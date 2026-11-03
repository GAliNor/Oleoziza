import type { NavigationGuardWithThis, RouteLocationRaw } from 'vue-router';

interface IParamCheck {
  pattern: RegExp;
  fallback: RouteLocationRaw;
  isOptional?: boolean;
}

/** Builds a beforeEnter guard that lets the route open only when `name` matches `pattern`, and redirects to `fallback` otherwise. */
export const checkParam =
  (name: string, { pattern, fallback, isOptional = false }: IParamCheck): NavigationGuardWithThis<undefined> =>
  (to) => {
    const value = to.params[name];
    if (isOptional && (value === undefined || value === '')) return true;
    return typeof value === 'string' && pattern.test(value) ? true : fallback;
  };
