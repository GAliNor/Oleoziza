import 'vue-router';

import type { Permission, Role } from 'auth/types/auth';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    guestOnly?: boolean;
    roles?: Role[];
    permission?: Permission;
  }
}
