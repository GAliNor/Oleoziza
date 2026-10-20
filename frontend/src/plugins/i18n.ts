// imports
import { createI18n } from 'vue-i18n';
import type { App } from 'vue';

// variables
type LocaleMessages = Record<string, unknown>;

const files = import.meta.glob<LocaleMessages>('../modules/*/locales/*.json', { eager: true, import: 'default' });

const toCamelCase = (value: string): string => value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const messages = Object.entries(files).reduce<Record<string, Record<string, LocaleMessages>>>((all, [path, content]) => {
  const [, moduleName, locale] = path.match(/modules\/([^/]+)\/locales\/([^/]+)\.json$/) ?? [];
  if (!moduleName || !locale) return all;
  all[locale] = { ...all[locale], [toCamelCase(moduleName)]: content };
  return all;
}, {});

export const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'fr',
  messages,
});

// methods
export const install = (app: App): void => {
  app.use(i18n);
};
