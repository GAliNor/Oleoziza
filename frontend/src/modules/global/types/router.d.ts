import 'vue-router';

import type { Permission } from 'global/types/session';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    guestOnly?: boolean;
    permission?: Permission | readonly Permission[];
  }
}
