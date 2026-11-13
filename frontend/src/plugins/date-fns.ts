// imports
import { arMA, fr, type Locale } from 'date-fns/locale';

import type { Language } from 'global/types/locale';

/** date-fns month and day names per app language, for the libraries that take a date-fns locale (the date picker). */
export const DATE_FNS_LOCALES: Record<Language, Locale> = { fr, ar: arMA };
