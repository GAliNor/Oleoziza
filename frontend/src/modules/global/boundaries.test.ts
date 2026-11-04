import { describe, expect, it } from 'vitest';

const SHELL_FILES = ['./components/app-layout.vue', './components/app-operator-shell.vue', './composables/use-navigation.ts'];

const sources = import.meta.glob<string>('./**/*.{ts,vue}', { eager: true, query: '?raw', import: 'default' });

const moduleFiles = import.meta.glob('../*/**/*.{ts,vue}');

const BUSINESS_MODULES = [...new Set(Object.keys(moduleFiles).map((path) => path.split('/')[1]))].filter((name) => name !== 'global');

const readBusinessImports = (source: string): string[] =>
  [...source.matchAll(/from '([^']+)'|import\('([^']+)'\)/g)].map(([, from, dynamic]) => from ?? dynamic).filter((target) => BUSINESS_MODULES.includes(target.split('/')[0]));

describe('global/', () => {
  it('finds the business modules', () => {
    expect(BUSINESS_MODULES).toEqual(expect.arrayContaining(['auth', 'client', 'lot', 'reception', 'site']));
  });

  it('imports no business module, except in the app shell', () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !SHELL_FILES.includes(path) && !path.endsWith('.test.ts'))
      .flatMap(([path, source]) => readBusinessImports(source).map((target) => `${path} -> ${target}`));
    expect(offenders).toEqual([]);
  });
});
