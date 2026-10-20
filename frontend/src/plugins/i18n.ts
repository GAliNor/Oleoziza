// imports
import { createI18n } from 'vue-i18n';
import type { App } from 'vue';

import type fr from '~/locales/fr.json';

// variables
type MessageSchema = typeof fr;

const files = import.meta.glob<MessageSchema>('../locales/*.json', { eager: true, import: 'default' });
const messages = Object.fromEntries(
  Object.entries(files).map(([path, content]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), content]),
);

export const i18n = createI18n<[MessageSchema], string, false>({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'fr',
  messages,
});

// methods
export const install = (app: App): void => {
  app.use(i18n);
};
