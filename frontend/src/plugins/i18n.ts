// imports
import { watchEffect } from 'vue';
import { createI18n } from 'vue-i18n';
import type { App } from 'vue';

import { readStorage } from 'global/composables/storage';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, RTL_LANGUAGES } from 'global/constants/locale';
import type { Language } from 'global/types/locale';

// variables
type LocaleMessages = Record<string, unknown>;

const files = import.meta.glob<LocaleMessages>('../modules/*/locales/*.json', { eager: true, import: 'default' });

/** Lot and Payment codes read left to right inside right-to-left text, or their parts swap places. */
const CODE_PATTERN = /[A-Z]{1,3}-\d{2,4}(?:-\d{4})?/g;

/** Non-breaking hyphens too, so a narrow column never wraps a code into pieces that RTL then reorders. */
const isolateCodes = (message: string): string => message.replace(CODE_PATTERN, (code) => `\u2066${code.replace(/-/g, '\u2011')}\u2069`);

/** Set once the instance exists, which needs this check to be built. */
let isRtlNow = (): boolean => false;

const toCamelCase = (value: string): string => value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const messages = Object.entries(files).reduce<Record<string, Record<string, LocaleMessages>>>((all, [path, content]) => {
  const [, moduleName, locale] = path.match(/modules\/([^/]+)\/locales\/([^/]+)\.json$/) ?? [];
  if (!moduleName || !locale) return all;
  all[locale] = { ...all[locale], [toCamelCase(moduleName)]: content };
  return all;
}, {});

export const i18n = createI18n({
  legacy: false,
  locale: readStorage<Language>(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE),
  fallbackLocale: DEFAULT_LANGUAGE,
  messages,
  postTranslation: <T>(message: T): T => (typeof message === 'string' && isRtlNow() ? (isolateCodes(message) as T) : message),
});

isRtlNow = (): boolean => RTL_LANGUAGES.includes(i18n.global.locale.value as Language);

// methods
export const install = (app: App): void => {
  app.use(i18n);
  watchEffect(() => {
    const language = i18n.global.locale.value as Language;
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
  });
};
