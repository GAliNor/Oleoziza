import { nextTick } from 'vue';

import { i18n } from '~/plugins/i18n';

import { readStorage, writeStorage } from 'global/composables/storage';
import {
  INTL_LOCALES,
  LANGUAGE_FONTS,
  LANGUAGE_NAMES,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_SWITCHING_CLASS,
  RTL_LANGUAGES,
  USER_LANGUAGES_STORAGE_KEY,
} from 'global/constants/locale';
import type { Language } from 'global/types/locale';

export const currentLanguage = (): Language => i18n.global.locale.value as Language;

export const isRtl = (): boolean => RTL_LANGUAGES.includes(currentLanguage());

/** The locale numbers and dates are written in. */
export const intlLocale = (): string => INTL_LOCALES[currentLanguage()];

const rememberForUser = (userId: string, language: Language): void => {
  writeStorage(USER_LANGUAGES_STORAGE_KEY, { ...readStorage<Record<string, Language>>(USER_LANGUAGES_STORAGE_KEY, {}), [userId]: language });
};

const applyLanguage = (language: Language): void => {
  i18n.global.locale.value = language;
  writeStorage(LANGUAGE_STORAGE_KEY, language);
};

let languageTransition: ViewTransition | null = null;

/** Fetched before the new screen is captured, so Arabic never shows up in a fallback font first. */
const loadLanguageFont = async (language: Language): Promise<void> => {
  const family = LANGUAGE_FONTS[language];
  if (family) await document.fonts?.load(`1em "${family}"`, LANGUAGE_NAMES[language]).catch(() => []);
};

const renderLanguage = async (language: Language): Promise<void> => {
  await loadLanguageFont(language);
  applyLanguage(language);
  await nextTick();
};

/** The screen dissolves into the new language instead of jumping; motion.css draws it under LANGUAGE_SWITCHING_CLASS. */
const applyLanguageSmoothly = async (language: Language): Promise<void> => {
  if (typeof document === 'undefined' || !document.startViewTransition) return applyLanguage(language);
  const root = document.documentElement;
  root.classList.add(LANGUAGE_SWITCHING_CLASS);
  const transition = document.startViewTransition(() => renderLanguage(language));
  languageTransition = transition;
  await transition.finished.catch(() => undefined);
  if (languageTransition === transition) root.classList.remove(LANGUAGE_SWITCHING_CLASS);
};

/** Switches the app, for this device and for whoever is signed in. */
export const chooseLanguage = (language: Language, userId?: string): void => {
  void applyLanguageSmoothly(language);
  if (userId) rememberForUser(userId, language);
};

/** A User gets back the language they last chose; on their first login they keep the one the screen is in. */
export const restoreUserLanguage = (userId: string): void => {
  const saved = readStorage<Record<string, Language>>(USER_LANGUAGES_STORAGE_KEY, {})[userId];
  if (saved) applyLanguage(saved);
  else rememberForUser(userId, currentLanguage());
};
