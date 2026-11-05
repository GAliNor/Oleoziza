import { i18n } from '~/plugins/i18n';

import type { IMovement } from 'finance/types/finance';

/** What a Payment pays, from its links: it reads the same in every language and can't go stale. */
export const movementLabel = (movement: Pick<IMovement, 'lotLinks'>): string =>
  movement.lotLinks.length ? i18n.global.t('finance.label.fees', { codes: movement.lotLinks.map((link) => link.lotCode).join(', ') }) : i18n.global.t('finance.label.unlinked');
