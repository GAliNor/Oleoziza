import type { Component } from 'vue';

import type { Language } from 'global/types/locale';

import FlagFrFillIcon from 'global/icons/flag-fr-fill.icon.vue';
import FlagMaFillIcon from 'global/icons/flag-ma-fill.icon.vue';

export const DEFAULT_LANGUAGE: Language = 'fr';

export const LANGUAGES: readonly Language[] = ['fr', 'ar'];

export const RTL_LANGUAGES: readonly Language[] = ['ar'];

/** Each language in its own words, so anyone can find theirs whatever the screen is in. */
export const LANGUAGE_NAMES: Record<Language, string> = { fr: 'Français', ar: 'العربية' };

/** A flag beside each name, so the choice reads at a glance. */
export const LANGUAGE_FLAGS: Record<Language, Component> = { fr: FlagFrFillIcon, ar: FlagMaFillIcon };

/** Arabic keeps Western digits (0–9) and Moroccan month names. */
export const INTL_LOCALES: Record<Language, string> = { fr: 'fr-FR', ar: 'ar-MA-u-nu-latn' };

/** The webfont each language needs that the system may lack. */
export const LANGUAGE_FONTS: Partial<Record<Language, string>> = { ar: 'Noto Sans Arabic Variable' };

/** On <html> while the screen changes language, so the view transition knows which animation to play. */
export const LANGUAGE_SWITCHING_CLASS = 'language-switching';

export const LANGUAGE_STORAGE_KEY = 'oleoziza.language';

export const USER_LANGUAGES_STORAGE_KEY = 'oleoziza.language.users';

export const APP_TIME_ZONE = 'Africa/Casablanca';
