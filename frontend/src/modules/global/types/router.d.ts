import 'vue-router';

import type { Permission } from 'global/types/session';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    guestOnly?: boolean;
    permission?: Permission | readonly Permission[];
    /** Only an Owner may open it (AI keys and spending). */
    isOwnerOnly?: boolean;
    /** Only Management may open it (the Assistant). */
    isManagementOnly?: boolean;
    /** The nav page a sub page goes back to when it was opened with no history. */
    parent?: string;
  }
}
