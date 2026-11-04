import 'vue-router';

import type { Permission, Role } from 'global/types/session';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    guestOnly?: boolean;
    roles?: Role[];
    permission?: Permission | readonly Permission[];
  }
}
